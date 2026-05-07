from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)


class NotificationService:
    async def send_processing_complete(
        self,
        to_email: str,
        meeting_title: str,
        meeting_id: str,
    ) -> None:
        api_key = os.getenv("SENDGRID_API_KEY", "").strip()
        if not api_key:
            logger.info("SENDGRID_API_KEY not set — skipping email notification for meeting %s", meeting_id)
            return

        from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@getprism.ai")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        meeting_url = f"{frontend_url}/meetings/{meeting_id}"

        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": from_email, "name": "Prism"},
            "subject": f"Your meeting notes are ready — {meeting_title}",
            "content": [
                {
                    "type": "text/html",
                    "value": _html_body(meeting_title, meeting_url),
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=payload,
                )
            if resp.status_code not in (200, 202):
                logger.warning("SendGrid %s: %s", resp.status_code, resp.text[:300])
            else:
                logger.info("Notification sent to %s for meeting %s", to_email, meeting_id)
        except Exception as exc:
            logger.warning("Email notification failed for meeting %s: %s", meeting_id, exc)

    async def send_processing_failed(
        self,
        to_email: str,
        meeting_title: str,
        meeting_id: str,
    ) -> None:
        api_key = os.getenv("SENDGRID_API_KEY", "").strip()
        if not api_key:
            return

        from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@getprism.ai")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        meeting_url = f"{frontend_url}/meetings/{meeting_id}"

        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": from_email, "name": "Prism"},
            "subject": f"Processing failed — {meeting_title}",
            "content": [
                {
                    "type": "text/html",
                    "value": (
                        f"<h2>Meeting processing failed</h2>"
                        f"<p>We were unable to process <strong>{meeting_title}</strong>.</p>"
                        f"<p>Please try re-uploading or contact support.</p>"
                        f'<p><a href="{meeting_url}">View meeting</a></p>'
                    ),
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=payload,
                )
        except Exception as exc:
            logger.warning("Failure email failed: %s", exc)


def _html_body(title: str, url: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;color:#1e293b">
  <h2 style="color:#7c3aed">Your meeting notes are ready</h2>
  <p>Prism has finished analyzing <strong>{title}</strong>.</p>
  <p>Your summary, action items, decisions, and key insights are available now.</p>
  <p>
    <a href="{url}"
       style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">
      View meeting notes
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
  <p style="color:#94a3b8;font-size:12px">
    Prism — Every conversation. Instant clarity.<br/>
    You received this because you have a Prism account. To stop receiving these emails, update your notification settings.
  </p>
</body>
</html>
"""
