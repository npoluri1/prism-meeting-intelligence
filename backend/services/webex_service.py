from __future__ import annotations

"""Cisco Webex ingestion service — Phase 3.

Uses Webex REST API + Webhooks to download recordings.
Requires:
    WEBEX_CLIENT_ID, WEBEX_CLIENT_SECRET, WEBEX_REFRESH_TOKEN env vars
"""

import logging
import os

from typing import Optional

logger = logging.getLogger(__name__)


class WebexService:
    """Stub for Phase 3 — Cisco Webex recording ingestion."""

    def __init__(self) -> None:
        self.client_id = os.getenv("WEBEX_CLIENT_ID", "")
        self.client_secret = os.getenv("WEBEX_CLIENT_SECRET", "")
        self.refresh_token = os.getenv("WEBEX_REFRESH_TOKEN", "")

    async def handle_webhook(self, payload: dict) -> dict:
        """Process a Webex webhook (recordings:created event)."""
        logger.info("Webex webhook received (Phase 3 stub)")
        # Phase 3 implementation:
        # 1. Verify webhook signature
        # 2. Download recording from Webex API
        # 3. Call _ingest_recording from webhooks
        return {"status": "stub", "message": "Webex integration coming in Phase 3"}

    async def sync_calendar(self, user_token: str) -> list[dict]:
        """Pre-create meeting records from Webex calendar."""
        logger.info("Webex calendar sync (Phase 3 stub)")
        return []
