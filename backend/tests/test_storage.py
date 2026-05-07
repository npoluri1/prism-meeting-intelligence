from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.storage_service import StorageService


@pytest.mark.asyncio
async def test_upload_returns_public_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://xyz.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("STORAGE_BUCKET", "meeting-media")

    svc = StorageService()
    mock_response = MagicMock()
    mock_response.status_code = 201

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        url = await svc.upload_file(b"audio_bytes", "recording.mp3", "user-001")

    assert url.startswith("https://xyz.supabase.co/storage/v1/object/public/meeting-media/user-001/")
    assert url.endswith(".mp3")


@pytest.mark.asyncio
async def test_upload_raises_on_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://xyz.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")

    svc = StorageService()
    mock_response = MagicMock()
    mock_response.status_code = 403
    mock_response.text = "Unauthorized"

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        with pytest.raises(RuntimeError, match="Storage upload failed"):
            await svc.upload_file(b"data", "test.mp4", "user-001")
