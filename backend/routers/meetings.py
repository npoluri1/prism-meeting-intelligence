from __future__ import annotations

import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status

from dependencies import get_current_user
from models import (
    ActionItem,
    AUDIO_VIDEO_EXTENSIONS,
    IMAGE_EXTENSIONS,
    MAX_UPLOAD_BYTES,
    ErrorResponse,
    MeetingCreate,
    MeetingOut,
    MeetingWithNotes,
    NotesOut,
    UPLOAD_ALLOWED_EXTENSIONS,
)
from services.claude_service import ClaudeService
from services.notification_service import NotificationService
from services.slack_service import SlackService
from services.storage_service import StorageService
from services.supabase_service import SupabaseService
from services.transcription_service import TranscriptionService
from services.vision_service import VisionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

_claude = ClaudeService()


def _build_notes_out(notes_data: dict) -> NotesOut:
    action_items = [
        ActionItem(
            task=item["task"],
            owner=item.get("owner", "Unassigned"),
        )
        for item in (notes_data.get("action_items") or [])
    ]
    raw: dict = {}
    try:
        if notes_data.get("raw_response"):
            raw = json.loads(notes_data["raw_response"])
    except (json.JSONDecodeError, TypeError):
        pass

    sentiment = raw.get("meeting_sentiment")
    if isinstance(sentiment, dict) and "score" not in sentiment:
        sentiment = None

    return NotesOut(
        id=notes_data["id"],
        summary=notes_data.get("summary"),
        action_items=action_items,
        decisions=notes_data.get("decisions") or [],
        risks_and_blockers=[str(r) for r in (raw.get("risks_and_blockers") or [])],
        next_meeting_agenda=[str(a) for a in (raw.get("next_meeting_agenda") or [])],
        key_topics=[str(t) for t in (raw.get("key_topics") or [])],
        participants=[str(p) for p in (raw.get("participants") or [])],
        meeting_sentiment=sentiment,
        created_at=notes_data["created_at"],
    )


@router.get("", response_model=list[MeetingOut])
async def list_meetings(
    organization_id: str | None = None,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> list[MeetingOut]:
    rows = await svc.list_meetings(
        current_user["id"], current_user["token"], organization_id=organization_id
    )
    return [
        MeetingOut(
            id=r["id"],
            title=r["title"],
            status=r["status"],
            created_at=r["created_at"],
            source=r.get("source", "transcript"),
            media_url=r.get("media_url"),
        )
        for r in rows
    ]


@router.post("", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    body: MeetingCreate,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> MeetingOut:
    row = await svc.create_meeting(
        user_id=current_user["id"],
        title=body.title,
        transcript=body.transcript,
        user_token=current_user["token"],
        organization_id=body.organization_id,
        industry=body.industry,
        meeting_date=body.meeting_date,
        location=body.location,
        attendees=body.attendees,
        template_id=body.template_id,
    )
    return MeetingOut(
        id=row["id"],
        title=row["title"],
        status=row["status"],
        created_at=row["created_at"],
        source="transcript",
    )


@router.get("/{meeting_id}", response_model=MeetingWithNotes)
async def get_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> MeetingWithNotes:
    row = await svc.get_meeting(meeting_id, current_user["id"], current_user["token"])
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )

    notes_out = None
    if row["status"] == "done":
        notes_data = await svc.get_notes_for_meeting(meeting_id, current_user["token"])
        if notes_data:
            notes_out = _build_notes_out(notes_data)

    return MeetingWithNotes(
        id=row["id"],
        title=row["title"],
        status=row["status"],
        created_at=row["created_at"],
        notes=notes_out,
    )


@router.post("/{meeting_id}/process", response_model=MeetingWithNotes)
async def process_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> MeetingWithNotes:
    token = current_user["token"]
    row = await svc.get_meeting(meeting_id, current_user["id"], token)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )

    if row["status"] in ("done", "processing"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Meeting already processed",
        )

    await svc.update_meeting_status(meeting_id, "processing", token)

    industry = row.get("industry", "general")
    try:
        result = await _claude.process_transcript(
            row["transcript"], industry=industry
        )
    except Exception:
        logger.error("Processing failed for meeting %s", meeting_id, exc_info=True)
        await svc.update_meeting_status(meeting_id, "error", token)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process transcript",
        )

    action_items_data = [item.model_dump() for item in result.action_items]
    await svc.save_notes(
        meeting_id=meeting_id,
        summary=result.summary,
        action_items=action_items_data,
        decisions=result.decisions,
        raw_response=result.raw_response,
        user_token=token,
    )
    await svc.save_action_items_from_notes(meeting_id, action_items_data)
    await svc.update_meeting_status(meeting_id, "done", token)

    notes_data = await svc.get_notes_for_meeting(meeting_id, token)
    notes_out = _build_notes_out(notes_data) if notes_data else None

    return MeetingWithNotes(
        id=row["id"],
        title=row["title"],
        status="done",
        created_at=row["created_at"],
        notes=notes_out,
    )


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> None:
    deleted = await svc.delete_meeting(
        meeting_id, current_user["id"], current_user["token"]
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )


@router.post("/upload", response_model=MeetingOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=200),
    industry: str = Form(default="general"),
    organization_id: str | None = Form(default=None),
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> MeetingOut:
    filename = file.filename or "recording.bin"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in UPLOAD_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(UPLOAD_ALLOWED_EXTENSIONS))}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 2 GB size limit.",
        )
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    row = await svc.create_upload_meeting(
        user_id=current_user["id"],
        title=title.strip(),
        filename=filename,
        user_token=current_user["token"],
        industry=industry,
        organization_id=organization_id or None,
    )

    background_tasks.add_task(
        _process_upload_background,
        meeting_id=row["id"],
        file_bytes=file_bytes,
        filename=filename,
        user_id=current_user["id"],
        user_email=current_user["email"],
        user_token=current_user["token"],
        industry=industry,
    )

    return MeetingOut(
        id=row["id"],
        title=row["title"],
        status=row["status"],
        created_at=row["created_at"],
        source="upload",
    )


async def _process_upload_background(
    meeting_id: str,
    file_bytes: bytes,
    filename: str,
    user_id: str,
    user_email: str,
    user_token: str,
    industry: str,
) -> None:
    svc = SupabaseService()
    storage = StorageService()
    notification = NotificationService()
    slack = SlackService()

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    is_image = ext in IMAGE_EXTENSIONS

    try:
        # 1. Upload to object storage
        media_url = await storage.upload_file(file_bytes, filename, user_id)
        await svc.update_meeting_media(meeting_id, media_url, user_token)
        await svc.update_meeting_status(meeting_id, "processing", user_token)

        # 2. Extract text — vision for images, transcription for audio/video
        if is_image:
            vision = VisionService()
            extracted_text = await vision.extract_text_from_image(file_bytes, filename)
        else:
            transcription = TranscriptionService()
            result = await transcription.transcribe(file_bytes, filename)
            extracted_text = result.text

        if not extracted_text.strip():
            raise ValueError("No content could be extracted from this file")

        await svc.update_meeting_transcript(meeting_id, extracted_text, user_token)

        # 3. AI extraction
        ai_result = await _claude.process_transcript(extracted_text, industry=industry)

        # 4. Save notes and action items
        action_items_data = [item.model_dump() for item in ai_result.action_items]
        await svc.save_notes(
            meeting_id=meeting_id,
            summary=ai_result.summary,
            action_items=action_items_data,
            decisions=ai_result.decisions,
            raw_response=ai_result.raw_response,
            user_token=user_token,
        )
        await svc.save_action_items_from_notes(meeting_id, action_items_data)
        await svc.update_meeting_status(meeting_id, "done", user_token)

        # 5. Notify user
        meeting = await svc.get_meeting(meeting_id, user_id, user_token)
        meeting_title = meeting["title"] if meeting else filename

        await notification.send_processing_complete(user_email, meeting_title, meeting_id)
        await slack.post_meeting_summary(
            meeting_id=meeting_id,
            title=meeting_title,
            summary=ai_result.summary,
            action_items=action_items_data,
            decisions=ai_result.decisions,
        )

    except Exception:
        logger.error("Upload processing failed for meeting %s", meeting_id, exc_info=True)
        await svc.update_meeting_status(meeting_id, "error", user_token)
        try:
            await notification.send_processing_failed(user_email, filename, meeting_id)
        except Exception:
            pass
