from __future__ import annotations

import logging
import os
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from dependencies import get_current_user
from services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

_SYSTEM_PROMPT = """\
You are Prism AI, an expert meeting intelligence assistant embedded inside the Prism platform.

You have access to a specific meeting's full context (transcript, summary, action items, decisions, risks).
Answer the user's questions based ONLY on this meeting's content.

Guidelines:
- Be concise and specific — cite exact names, dates, or quotes from the meeting when relevant
- If asked about something not in the meeting, say so clearly
- Help users clarify action items, understand decisions, or extract follow-up info
- If asked who owns a task, look at the action items list
- If asked about risks, look at the risks section
- You can suggest follow-up questions the user might want to ask
- Keep responses focused — 2-5 sentences unless a longer answer is genuinely needed
"""

_GENERAL_SYSTEM_PROMPT = """\
You are Prism AI, an expert meeting intelligence assistant embedded inside the Prism platform.

Help the user with questions about their meetings, how to use Prism, or general meeting best practices.
If they reference a specific meeting, let them know they can open that meeting to chat in context.

Keep responses concise and actionable.
"""


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=20)
    meeting_id: str | None = None


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> StreamingResponse:
    """Stream an AI chat response. Optionally scoped to a specific meeting."""
    meeting_context = ""

    if body.meeting_id:
        meeting = await svc.get_meeting(body.meeting_id, current_user["id"], current_user["token"])
        if not meeting:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

        notes = await svc.get_notes_for_meeting(body.meeting_id, current_user["token"])
        meeting_context = _build_meeting_context(meeting, notes)

    return StreamingResponse(
        _stream_response(body.messages, meeting_context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


async def _stream_response(
    messages: list[ChatMessage],
    meeting_context: str,
) -> AsyncGenerator[str, None]:
    import json
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    system = (
        _SYSTEM_PROMPT + "\n\n## Meeting Context\n\n" + meeting_context
        if meeting_context
        else _GENERAL_SYSTEM_PROMPT
    )

    try:
        stream = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=1000,
            stream=True,
            messages=[
                {"role": "system", "content": system},
                *[{"role": m.role, "content": m.content} for m in messages],
            ],
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield f"data: {json.dumps({'text': delta})}\n\n"

        yield "data: [DONE]\n\n"

    except Exception as exc:
        logger.error("Chat stream error: %s", exc)
        yield f"data: {json.dumps({'error': 'AI response failed. Please try again.'})}\n\n"


def _build_meeting_context(meeting: dict, notes: dict | None) -> str:
    import json

    lines = [
        f"**Title:** {meeting.get('title', 'Untitled')}",
        f"**Date:** {meeting.get('created_at', '')[:10]}",
        f"**Industry:** {meeting.get('industry', 'general')}",
        f"**Status:** {meeting.get('status', 'unknown')}",
    ]

    if meeting.get("location"):
        lines.append(f"**Location:** {meeting['location']}")
    if meeting.get("attendees"):
        attendees = meeting["attendees"]
        if isinstance(attendees, str):
            try:
                attendees = json.loads(attendees)
            except Exception:
                attendees = []
        if attendees:
            lines.append(f"**Attendees:** {', '.join(str(a) for a in attendees)}")

    if meeting.get("transcript"):
        lines.append(f"\n**Transcript:**\n{meeting['transcript'][:6000]}")

    if notes:
        if notes.get("summary"):
            lines.append(f"\n**Summary:** {notes['summary']}")

        raw = {}
        try:
            if notes.get("raw_response"):
                raw = json.loads(notes["raw_response"])
        except Exception:
            pass

        action_items = notes.get("action_items") or []
        if action_items:
            lines.append("\n**Action Items:**")
            for item in action_items:
                if isinstance(item, dict):
                    owner = item.get("owner", "TBD")
                    task = item.get("task", "")
                    due = item.get("due_date", "")
                    lines.append(f"- [{owner}] {task}" + (f" (due {due})" if due else ""))

        decisions = notes.get("decisions") or []
        if decisions:
            lines.append("\n**Decisions:**")
            for d in decisions:
                lines.append(f"- {d}")

        risks = raw.get("risks_and_blockers") or []
        if risks:
            lines.append("\n**Risks & Blockers:**")
            for r in risks:
                lines.append(f"- {r}")

        agenda = raw.get("next_meeting_agenda") or []
        if agenda:
            lines.append("\n**Suggested Next Agenda:**")
            for a in agenda:
                lines.append(f"- {a}")

        sentiment = raw.get("meeting_sentiment")
        if isinstance(sentiment, dict):
            score = sentiment.get("score", "?")
            note = sentiment.get("notes", "")
            lines.append(f"\n**Sentiment:** {score}/10 — {note}")

    return "\n".join(lines)
