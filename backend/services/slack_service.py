from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)


class SlackService:
    """Post meeting summaries to a Slack channel.

    Requires SLACK_BOT_TOKEN (xoxb-...) and SLACK_CHANNEL_ID env vars.
    Both are optional — methods are no-ops when either is missing.
    """

    def _configured(self) -> tuple[str, str] | None:
        token = os.getenv("SLACK_BOT_TOKEN", "").strip()
        channel = os.getenv("SLACK_CHANNEL_ID", "").strip()
        if token and channel:
            return token, channel
        return None

    async def post_meeting_summary(
        self,
        meeting_id: str,
        title: str,
        summary: str,
        action_items: list[dict],
        decisions: list[str],
    ) -> None:
        cfg = self._configured()
        if not cfg:
            logger.info("Slack not configured — skipping post for meeting %s", meeting_id)
            return

        token, channel = cfg
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        meeting_url = f"{frontend_url}/meetings/{meeting_id}"

        action_text = "\n".join(
            f"• {item.get('task', '')} — _{item.get('owner', 'TBD')}_"
            for item in action_items[:10]
        ) or "_No action items_"

        decision_text = "\n".join(f"• {d}" for d in decisions[:5]) or "_No decisions recorded_"

        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"📋 {title}"},
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": summary},
            },
            {"type": "divider"},
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Action Items*\n{action_text}"},
                    {"type": "mrkdwn", "text": f"*Decisions*\n{decision_text}"},
                ],
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "View full notes"},
                        "url": meeting_url,
                        "style": "primary",
                    }
                ],
            },
        ]

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://slack.com/api/chat.postMessage",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    json={"channel": channel, "blocks": blocks, "text": f"Meeting notes ready: {title}"},
                )
            data = resp.json()
            if not data.get("ok"):
                logger.warning("Slack post failed: %s", data.get("error"))
            else:
                logger.info("Slack post sent for meeting %s", meeting_id)
        except Exception as exc:
            logger.warning("Slack notification failed for meeting %s: %s", meeting_id, exc)
