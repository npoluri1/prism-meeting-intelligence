from __future__ import annotations

import logging
import os
import uuid

import httpx

logger = logging.getLogger(__name__)

_MIME: dict[str, str] = {
    "mp3":  "audio/mpeg",
    "m4a":  "audio/mp4",
    "wav":  "audio/wav",
    "mp4":  "video/mp4",
    "mov":  "video/quicktime",
    "webm": "video/webm",
    "mkv":  "video/x-matroska",
}


def _bucket() -> str:
    return os.getenv("STORAGE_BUCKET", "meeting-media")


def _base_headers() -> dict[str, str]:
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }


class StorageService:
    async def upload_file(self, file_bytes: bytes, filename: str, user_id: str) -> str:
        """Upload bytes to Supabase Storage. Returns the public URL."""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
        object_path = f"{user_id}/{uuid.uuid4()}.{ext}"
        content_type = _MIME.get(ext, "application/octet-stream")
        bucket = _bucket()
        url = f"{os.environ['SUPABASE_URL']}/storage/v1/object/{bucket}/{object_path}"

        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                url,
                headers={**_base_headers(), "Content-Type": content_type},
                content=file_bytes,
            )

        if resp.status_code not in (200, 201):
            logger.error("Storage upload failed %s: %s", resp.status_code, resp.text[:400])
            raise RuntimeError(f"Storage upload failed with status {resp.status_code}")

        return f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/{bucket}/{object_path}"

    async def get_signed_url(self, object_path: str, expires_in: int = 3600) -> str:
        bucket = _bucket()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{os.environ['SUPABASE_URL']}/storage/v1/object/sign/{bucket}/{object_path}",
                headers={**_base_headers(), "Content-Type": "application/json"},
                json={"expiresIn": expires_in},
            )
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to get signed URL: {resp.status_code}")
        return str(resp.json().get("signedURL", ""))
