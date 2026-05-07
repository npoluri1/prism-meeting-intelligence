from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import httpx

from services.notification_service import NotificationService


@pytest.mark.asyncio
async def test_skips_when_no_api_key(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    monkeypatch.delenv("SENDGRID_API_KEY", raising=False)
    svc = NotificationService()
    with caplog.at_level("INFO"):
        await svc.send_processing_complete("user@example.com", "Q2 Planning", "meeting-123")
    assert "not set" in caplog.text


@pytest.mark.asyncio
async def test_sends_email_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SENDGRID_API_KEY", "SG.fake_key")
    monkeypatch.setenv("SENDGRID_FROM_EMAIL", "test@prism.ai")

    svc = NotificationService()

    mock_response = MagicMock()
    mock_response.status_code = 202

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        await svc.send_processing_complete("user@example.com", "Q2 Planning", "meeting-456")

    mock_client.post.assert_called_once()
    call_kwargs = mock_client.post.call_args
    assert "sendgrid.com" in call_kwargs[0][0]
    payload = call_kwargs[1]["json"]
    assert payload["subject"].startswith("Your meeting notes are ready")


@pytest.mark.asyncio
async def test_send_processing_failed_skips_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SENDGRID_API_KEY", raising=False)
    svc = NotificationService()
    # Should not raise even without key
    await svc.send_processing_failed("user@example.com", "Test Meeting", "m-999")
