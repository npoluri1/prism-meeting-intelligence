from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request, status

from services.claude_service import ClaudeService
from services.notification_service import NotificationService
from services.slack_service import SlackService
from services.storage_service import StorageService
from services.supabase_service import SupabaseService
from services.transcription_service import TranscriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

_claude = ClaudeService()


# ── Google Meet ──────────────────────────────────────────────────────────

@router.post("/google-meet")
async def google_meet_webhook(request: Request) -> dict:
    """Receive Google Drive push notifications for Meet recordings (Phase 3)."""
    payload = await request.json()
    logger.info("Google Meet webhook: %s", payload.get("kind", "unknown"))

    # Phase 3: Download from Drive API, then ingest
    # from services.google_meet_service import GoogleMeetService
    # svc = GoogleMeetService()
    # await svc.handle_recording_notification(payload)

    return {"status": "stub", "message": "Google Meet integration in Phase 3"}


# ── Cisco Webex ─────────────────────────────────────────────────────────

@router.post("/webex")
async def webex_webhook(request: Request) -> dict:
    """Receive Webex webhooks for recording events (Phase 3)."""
    payload = await request.json()
    logger.info("Webex webhook: %s", payload.get("eventType", "unknown"))

    # Phase 3: Download from Webex API, then ingest
    # from services.webex_service import WebexService
    # svc = WebexService()
    # await svc.handle_webhook(payload)

    return {"status": "stub", "message": "Webex integration in Phase 3"}


# ── Zoom ──────────────────────────────────────────────────────────────────────

@router.post("/zoom")
async def zoom_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_zm_request_timestamp: str = Header(default=""),
    x_zm_signature: str = Header(default=""),
) -> dict:
    """Receive Zoom webhook events (recording.completed, meeting.ended)."""
    body = await request.body()

    # Verify HMAC-SHA256 signature
    secret_token = os.getenv("ZOOM_WEBHOOK_SECRET_TOKEN", "")
    if secret_token:
        _verify_zoom_signature(body, x_zm_request_timestamp, x_zm_signature, secret_token)

    payload = json.loads(body)
    event = payload.get("event", "")
    logger.info("Zoom webhook event: %s", event)

    # Zoom URL validation challenge (required when registering the webhook)
    if event == "endpoint.url_validation":
        plain_token = payload.get("payload", {}).get("plainToken", "")
        encrypted = hmac.new(
            secret_token.encode(), plain_token.encode(), hashlib.sha256
        ).hexdigest()
        return {"plainToken": plain_token, "encryptedToken": encrypted}

    if event == "recording.completed":
        download_token = payload.get("download_token", "")
        recording_files = payload.get("payload", {}).get("object", {}).get("recording_files", [])
        meeting_topic = payload.get("payload", {}).get("object", {}).get("topic", "Zoom Meeting")
        host_email = payload.get("payload", {}).get("object", {}).get("host_email", "")

        audio_files = [
            f for f in recording_files
            if f.get("file_type", "") in ("MP4", "M4A", "AUDIO_ONLY")
            and f.get("status") == "completed"
        ]

        for audio_file in audio_files[:1]:
            download_url = audio_file.get("download_url", "")
            if download_url:
                background_tasks.add_task(
                    _process_zoom_recording,
                    download_url=download_url,
                    download_token=download_token,
                    meeting_title=meeting_topic,
                    host_email=host_email,
                )

    return {"status": "ok"}


def _verify_zoom_signature(
    body: bytes, timestamp: str, signature: str, secret: str
) -> None:
    if not timestamp or not signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Zoom signature headers")

    # Reject requests older than 5 minutes
    try:
        if abs(time.time() - int(timestamp)) > 300:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Zoom webhook timestamp too old")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Zoom timestamp")

    message = f"v0:{timestamp}:{body.decode('utf-8')}"
    expected = "v0=" + hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Zoom signature")


async def _process_zoom_recording(
    download_url: str,
    download_token: str,
    meeting_title: str,
    host_email: str,
) -> None:
    import httpx

    logger.info("Processing Zoom recording: %s", meeting_title)
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.get(
                download_url,
                headers={"Authorization": f"Bearer {download_token}"},
                follow_redirects=True,
            )
            if not resp.is_success:
                logger.error("Zoom download failed %s: %s", resp.status_code, resp.text[:200])
                return
            file_bytes = resp.content

        await _ingest_recording(
            file_bytes=file_bytes,
            filename="zoom_recording.mp4",
            title=meeting_title,
            user_email=host_email,
            source="zoom",
            industry="general",
        )
    except Exception:
        logger.error("Zoom recording processing failed for: %s", meeting_title, exc_info=True)


# ── Microsoft Teams ────────────────────────────────────────────────────────────

@router.post("/teams")
async def teams_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict:
    """Receive Microsoft Teams / Graph change notifications."""
    body = await request.body()
    payload = json.loads(body)

    # Handle Graph validation request
    if isinstance(payload, dict) and "validationToken" in payload:
        return {"validationToken": payload["validationToken"]}

    # Process change notifications
    notifications = payload.get("value", [])
    for notif in notifications:
        resource = notif.get("resource", "")
        logger.info("Teams notification: %s", resource)
        # Future: download transcript from SharePoint using Graph API
        # graph_client.get(f"https://graph.microsoft.com/v1.0/{resource}")

    return {"status": "ok"}


# ── Shared ingestion pipeline ─────────────────────────────────────────────────

async def _ingest_recording(
    file_bytes: bytes,
    filename: str,
    title: str,
    user_email: str,
    source: str,
    industry: str,
    user_id: str | None = None,
    user_token: str | None = None,
) -> None:
    """Transcribe a recording and run AI extraction. Used by all webhook handlers."""
    svc = SupabaseService()
    storage = StorageService()
    transcription = TranscriptionService()
    notification = NotificationService()
    slack = SlackService()

    effective_user_id = user_id or "system"
    effective_token = user_token or ""

    try:
        media_url = await storage.upload_file(file_bytes, filename, effective_user_id)

        row = await svc.create_upload_meeting(
            user_id=effective_user_id,
            title=title,
            filename=filename,
            user_token=effective_token,
            industry=industry,
        )
        meeting_id = row["id"]

        await svc.update_meeting_media(meeting_id, media_url, effective_token)
        await svc.update_meeting_status(meeting_id, "processing", effective_token)

        result = await transcription.transcribe(file_bytes, filename)
        await svc.update_meeting_transcript(meeting_id, result.text, effective_token)

        ai_result = await _claude.process_transcript(result.text, industry=industry)
        action_items_data = [item.model_dump() for item in ai_result.action_items]

        await svc.save_notes(
            meeting_id=meeting_id,
            summary=ai_result.summary,
            action_items=action_items_data,
            decisions=ai_result.decisions,
            raw_response=ai_result.raw_response,
            user_token=effective_token,
        )
        await svc.save_action_items_from_notes(meeting_id, action_items_data)
        await svc.update_meeting_status(meeting_id, "done", effective_token)

        if user_email:
            await notification.send_processing_complete(user_email, title, meeting_id)
        await slack.post_meeting_summary(
            meeting_id=meeting_id,
            title=title,
            summary=ai_result.summary,
            action_items=action_items_data,
            decisions=ai_result.decisions,
        )

    except Exception:
        logger.error("Webhook ingestion failed for: %s", title, exc_info=True)
