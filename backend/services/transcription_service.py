from __future__ import annotations

import io
import logging
import os
import tempfile
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

SUPPORTED_FORMATS = frozenset({"mp3", "m4a", "wav", "mp4", "mov", "webm", "mkv"})


@dataclass
class TranscriptionResult:
    text: str
    words: list[dict] = field(default_factory=list)
    utterances: list[dict] = field(default_factory=list)
    provider: str = "unknown"


class TranscriptionService:
    async def transcribe(self, file_bytes: bytes, filename: str) -> TranscriptionResult:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported file format: .{ext}. Supported: {', '.join(sorted(SUPPORTED_FORMATS))}")

        assemblyai_key = os.getenv("ASSEMBLYAI_API_KEY", "").strip()
        if assemblyai_key:
            try:
                return await self._via_assemblyai(file_bytes, filename, assemblyai_key)
            except Exception as exc:
                logger.warning("AssemblyAI failed, falling back to Whisper: %s", exc)

        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if openai_key:
            return await self._via_whisper(file_bytes, filename, openai_key)

        raise RuntimeError(
            "Transcription failed: no provider available. "
            "Set ASSEMBLYAI_API_KEY for speaker diarization or OPENAI_API_KEY for Whisper. "
            "Your OPENAI_API_KEY also works as the Whisper fallback."
        )

    async def _via_assemblyai(
        self, file_bytes: bytes, filename: str, api_key: str
    ) -> TranscriptionResult:
        import assemblyai as aai  # type: ignore[import]

        aai.settings.api_key = api_key
        ext = filename.rsplit(".", 1)[-1].lower()

        tmp_path: str | None = None
        try:
            with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name

            config = aai.TranscriptionConfig(
                speaker_labels=True,
                auto_highlights=False,
                language_detection=True,
            )
            transcriber = aai.Transcriber(config=config)
            result = transcriber.transcribe(tmp_path)

            if result.status == aai.TranscriptStatus.error:
                raise RuntimeError(f"AssemblyAI transcription error: {result.error}")

            if result.utterances:
                lines = [f"Speaker {u.speaker}: {u.text}" for u in result.utterances]
                text = "\n".join(lines)
                utterances = [
                    {"speaker": u.speaker, "text": u.text, "start": u.start, "end": u.end}
                    for u in result.utterances
                ]
            else:
                text = result.text or ""
                utterances = []

            words = [
                {
                    "text": w.text,
                    "start": w.start,
                    "end": w.end,
                    "confidence": w.confidence,
                }
                for w in (result.words or [])
            ]

            return TranscriptionResult(
                text=text,
                words=words,
                utterances=utterances,
                provider="assemblyai",
            )
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

    async def _via_whisper(
        self, file_bytes: bytes, filename: str, api_key: str
    ) -> TranscriptionResult:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        file_like = io.BytesIO(file_bytes)
        file_like.name = filename

        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=file_like,
            response_format="text",
        )
        text = response if isinstance(response, str) else str(response)
        return TranscriptionResult(text=text, provider="whisper")
