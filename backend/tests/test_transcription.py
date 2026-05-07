from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.transcription_service import SUPPORTED_FORMATS, TranscriptionService


def test_supported_formats_set() -> None:
    assert "mp3" in SUPPORTED_FORMATS
    assert "mp4" in SUPPORTED_FORMATS
    assert "wav" in SUPPORTED_FORMATS
    assert "mkv" in SUPPORTED_FORMATS
    assert "exe" not in SUPPORTED_FORMATS


@pytest.mark.asyncio
async def test_unsupported_format_raises() -> None:
    svc = TranscriptionService()
    with pytest.raises(ValueError, match="Unsupported file format"):
        await svc.transcribe(b"data", "recording.exe")


@pytest.mark.asyncio
async def test_no_provider_raises_when_no_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ASSEMBLYAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    svc = TranscriptionService()
    with pytest.raises(RuntimeError, match="No transcription provider"):
        await svc.transcribe(b"data", "recording.mp3")


@pytest.mark.asyncio
async def test_whisper_fallback_when_assemblyai_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ASSEMBLYAI_API_KEY", "fake_aai_key")
    monkeypatch.setenv("OPENAI_API_KEY", "fake_openai_key")

    svc = TranscriptionService()

    # AssemblyAI raises, Whisper succeeds
    with (
        patch.object(svc, "_via_assemblyai", side_effect=RuntimeError("aai down")),
        patch.object(svc, "_via_whisper", new_callable=AsyncMock) as mock_whisper,
    ):
        from services.transcription_service import TranscriptionResult
        mock_whisper.return_value = TranscriptionResult(text="Hello world", provider="whisper")
        result = await svc.transcribe(b"audio", "recording.mp3")

    assert result.text == "Hello world"
    assert result.provider == "whisper"
    mock_whisper.assert_called_once()


@pytest.mark.asyncio
async def test_assemblyai_used_when_key_present(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ASSEMBLYAI_API_KEY", "fake_aai_key")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    svc = TranscriptionService()

    with patch.object(svc, "_via_assemblyai", new_callable=AsyncMock) as mock_aai:
        from services.transcription_service import TranscriptionResult
        mock_aai.return_value = TranscriptionResult(
            text="Speaker A: Hello\nSpeaker B: Hi",
            utterances=[{"speaker": "A", "text": "Hello", "start": 0, "end": 1000}],
            provider="assemblyai",
        )
        result = await svc.transcribe(b"audio_bytes", "meeting.mp4")

    assert result.provider == "assemblyai"
    assert "Hello" in result.text
    mock_aai.assert_called_once()
