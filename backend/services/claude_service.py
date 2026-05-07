from __future__ import annotations

import json
import logging
import os

import openai

from domains import get_domain
from models import ActionItem, ClaudeResult

logger = logging.getLogger(__name__)

_BASE_SYSTEM = """\
You are MeetingMind, an expert AI meeting intelligence assistant.

You will be given a meeting transcript and must return a structured JSON analysis.

Return ONLY valid JSON with exactly these keys — no markdown fences, no extra text:
{
  "summary": "<2-3 sentence executive summary of the meeting purpose and outcomes>",
  "key_topics": ["<topic1>", "<topic2>"],
  "action_items": [
    { "task": "<concrete task>", "owner": "<person or TBD>", "due_date": "<if mentioned or null>", "priority": "<high|medium|low>" }
  ],
  "decisions": ["<decision made>"],
  "risks_and_blockers": ["<risk or blocker identified>"],
  "next_meeting_agenda": ["<suggested agenda item for follow-up>"],
  "meeting_sentiment": {
    "score": <1-10 integer>,
    "notes": "<brief note on energy, tension, or enthusiasm>"
  },
  "participants": ["<name if mentioned>"]
}

Rules:
- summary: 2-3 sentences capturing purpose and outcomes
- action_items: every concrete next step; use "TBD" if no owner stated
- decisions: every explicit agreement or decision
- risks_and_blockers: anything flagged as a risk, blocker, or urgent concern
- next_meeting_agenda: 3-5 suggested follow-up items based on open threads
- meeting_sentiment.score: 1=very low energy/tense, 10=highly engaged/positive
- participants: extract names of people who spoke or were mentioned
- All values must be strings or arrays of strings; no nulls except due_date
"""


class ClaudeService:
    def __init__(self) -> None:
        self._client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    async def process_transcript(
        self,
        transcript: str,
        industry: str = "general",
        company_name: str = "",
        prompt_hint: str = "",
    ) -> ClaudeResult:
        domain = get_domain(industry)
        company_line = (
            f"You are analysing a meeting for {company_name}, a {domain.industry_context}"
            if company_name
            else f"The organisation is a {domain.industry_context}"
        )
        extra_hints = " ".join(filter(None, [domain.prompt_hint, prompt_hint]))
        hint_line = f"\nAdditional instructions: {extra_hints}" if extra_hints else ""

        system_prompt = f"{_BASE_SYSTEM}\n\n{company_line}{hint_line}"
        user_message = f"Analyse this meeting transcript and return the JSON report:\n\n{transcript}"

        try:
            response = await self._client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=2000,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
            )
        except openai.APIError as exc:
            logger.error("OpenAI API error: %s", exc)
            raise RuntimeError("OpenAI API request failed") from exc

        raw = response.choices[0].message.content or ""
        logger.debug("OpenAI raw: %s", raw)

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            logger.error("OpenAI invalid JSON: %s", raw[:500])
            raise ValueError("OpenAI returned invalid JSON")

        action_items = [
            ActionItem(
                task=str(item.get("task", "")),
                owner=str(item.get("owner", "TBD")),
            )
            for item in (parsed.get("action_items") or [])
        ]
        return ClaudeResult(
            summary=str(parsed.get("summary", "")),
            action_items=action_items,
            decisions=[str(d) for d in (parsed.get("decisions") or [])],
            raw_response=raw,
        )
