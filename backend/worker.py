from __future__ import annotations

"""Celery worker — Phase 2 replacement for FastAPI BackgroundTasks.

Start with:
    celery -A worker worker --loglevel=info --concurrency=2

Requires:
    pip install celery redis
    REDIS_URL env var (default: redis://localhost:6379/0)
"""

import asyncio
import logging
import os

from celery import Celery

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "prism",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["worker"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


def _run(coro):
    """Run an async coroutine from a sync Celery task."""
    return asyncio.run(coro)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_upload_task(
    self,
    meeting_id: str,
    file_bytes: bytes,
    filename: str,
    user_id: str,
    user_email: str,
    user_token: str,
    industry: str,
) -> dict:
    """Process an uploaded audio/video file: transcribe + extract + notify."""
    try:
        from routers.meetings import _process_upload_background
        _run(_process_upload_background(
            meeting_id=meeting_id,
            file_bytes=file_bytes,
            filename=filename,
            user_id=user_id,
            user_email=user_email,
            user_token=user_token,
            industry=industry,
        ))
        return {"status": "done", "meeting_id": meeting_id}
    except Exception as exc:
        logger.error("Celery task failed for meeting %s: %s", meeting_id, exc, exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_webhook_recording_task(
    self,
    download_url: str,
    download_token: str,
    meeting_title: str,
    host_email: str,
    source: str,
) -> dict:
    """Download and process a recording from a webhook (Zoom / Teams)."""
    import httpx

    async def _download_and_process():
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.get(
                download_url,
                headers={"Authorization": f"Bearer {download_token}"} if download_token else {},
                follow_redirects=True,
            )
            resp.raise_for_status()
            file_bytes = resp.content

        from routers.webhooks import _ingest_recording
        await _ingest_recording(
            file_bytes=file_bytes,
            filename=f"{source}_recording.mp4",
            title=meeting_title,
            user_email=host_email,
            source=source,
            industry="general",
        )

    try:
        _run(_download_and_process())
        return {"status": "done", "title": meeting_title}
    except Exception as exc:
        logger.error("Webhook recording task failed: %s — %s", meeting_title, exc, exc_info=True)
        raise self.retry(exc=exc)
