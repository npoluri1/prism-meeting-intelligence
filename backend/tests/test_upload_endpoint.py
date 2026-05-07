from __future__ import annotations

import io
import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test_key")
os.environ.setdefault("OPENAI_API_KEY", "test_openai_key")


def _make_client() -> TestClient:
    from main import app
    return TestClient(app)


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test_token"}


def _mock_user() -> dict:
    return {"id": "user-123", "email": "test@example.com", "token": "test_token"}


@pytest.fixture
def client() -> TestClient:
    return _make_client()


def test_upload_unsupported_format(client: TestClient) -> None:
    with patch("dependencies.get_current_user", return_value=_mock_user()):
        resp = client.post(
            "/api/meetings/upload",
            data={"title": "Test Meeting", "industry": "general"},
            files={"file": ("recording.exe", b"data", "application/octet-stream")},
            headers=_auth_headers(),
        )
    assert resp.status_code == 422
    assert "Unsupported file type" in resp.json()["detail"]


def test_upload_empty_file(client: TestClient) -> None:
    with patch("dependencies.get_current_user", return_value=_mock_user()):
        resp = client.post(
            "/api/meetings/upload",
            data={"title": "Test Meeting"},
            files={"file": ("recording.mp3", b"", "audio/mpeg")},
            headers=_auth_headers(),
        )
    assert resp.status_code == 422
    assert "empty" in resp.json()["detail"].lower()


def test_upload_requires_title(client: TestClient) -> None:
    with patch("dependencies.get_current_user", return_value=_mock_user()):
        resp = client.post(
            "/api/meetings/upload",
            data={},
            files={"file": ("recording.mp3", b"ID3\x00" * 50, "audio/mpeg")},
            headers=_auth_headers(),
        )
    # FastAPI returns 422 when required form field is missing
    assert resp.status_code == 422


def test_upload_accepted_queues_background(client: TestClient) -> None:
    fake_meeting_row = {
        "id": "meet-abc",
        "title": "Q2 Planning",
        "status": "pending",
        "created_at": "2026-05-07T10:00:00Z",
    }

    mock_svc = AsyncMock()
    mock_svc.create_upload_meeting.return_value = fake_meeting_row

    with (
        patch("dependencies.get_current_user", return_value=_mock_user()),
        patch("routers.meetings.SupabaseService", return_value=mock_svc),
        patch("routers.meetings._process_upload_background", new_callable=AsyncMock),
    ):
        resp = client.post(
            "/api/meetings/upload",
            data={"title": "Q2 Planning", "industry": "general"},
            files={"file": ("recording.mp3", b"ID3" + b"\x00" * 200, "audio/mpeg")},
            headers=_auth_headers(),
        )

    assert resp.status_code == 202
    body = resp.json()
    assert body["id"] == "meet-abc"
    assert body["status"] == "pending"
    assert body["source"] == "upload"


def test_upload_mp4_is_allowed(client: TestClient) -> None:
    fake_meeting_row = {
        "id": "meet-xyz",
        "title": "Sales Call",
        "status": "pending",
        "created_at": "2026-05-07T11:00:00Z",
    }

    mock_svc = AsyncMock()
    mock_svc.create_upload_meeting.return_value = fake_meeting_row

    with (
        patch("dependencies.get_current_user", return_value=_mock_user()),
        patch("routers.meetings.SupabaseService", return_value=mock_svc),
        patch("routers.meetings._process_upload_background", new_callable=AsyncMock),
    ):
        resp = client.post(
            "/api/meetings/upload",
            data={"title": "Sales Call", "industry": "sales"},
            files={"file": ("recording.mp4", b"\x00\x00\x00\x18ftyp" + b"\x00" * 100, "video/mp4")},
            headers=_auth_headers(),
        )

    assert resp.status_code == 202
