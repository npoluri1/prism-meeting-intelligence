from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Set required env vars before any imports resolve them
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test_service_role_key")
os.environ.setdefault("OPENAI_API_KEY", "test_openai_key")


@pytest.fixture
def sample_mp3_bytes() -> bytes:
    # Minimal valid-ish file bytes; actual transcription is mocked
    return b"ID3" + b"\x00" * 100


@pytest.fixture
def sample_transcript() -> str:
    return (
        "Alice: Let's kick off the Q2 planning.\n"
        "Bob: We need to finish the API by end of April.\n"
        "Alice: Agreed. Bob, can you own that?\n"
        "Bob: Yes, I'll have it done by April 30th.\n"
        "Alice: Great. Let's also schedule a follow-up next week.\n"
    )


@pytest.fixture
def mock_supabase_service():
    with patch("services.supabase_service.SupabaseService") as mock_cls:
        instance = AsyncMock()
        mock_cls.return_value = instance
        yield instance


@pytest.fixture
def mock_storage_service():
    with patch("services.storage_service.StorageService") as mock_cls:
        instance = AsyncMock()
        instance.upload_file.return_value = "https://test.supabase.co/storage/v1/object/public/meeting-media/test.mp3"
        mock_cls.return_value = instance
        yield instance


@pytest.fixture
def mock_transcription_service():
    from services.transcription_service import TranscriptionResult
    with patch("services.transcription_service.TranscriptionService") as mock_cls:
        instance = AsyncMock()
        instance.transcribe.return_value = TranscriptionResult(
            text="Alice: Hello\nBob: Hi",
            provider="assemblyai",
        )
        mock_cls.return_value = instance
        yield instance


@pytest.fixture
def mock_notification_service():
    with patch("services.notification_service.NotificationService") as mock_cls:
        instance = AsyncMock()
        instance.send_processing_complete.return_value = None
        instance.send_processing_failed.return_value = None
        mock_cls.return_value = instance
        yield instance
