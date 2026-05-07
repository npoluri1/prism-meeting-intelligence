from __future__ import annotations

import base64
import logging
import os

logger = logging.getLogger(__name__)

IMAGE_FORMATS = frozenset({"jpg", "jpeg", "png", "webp", "gif", "bmp"})

_MIME: dict[str, str] = {
    "jpg":  "image/jpeg",
    "jpeg": "image/jpeg",
    "png":  "image/png",
    "webp": "image/webp",
    "gif":  "image/gif",
    "bmp":  "image/bmp",
}

_EXTRACTION_PROMPT = """\
You are looking at an image that contains meeting or business content.
Your job is to extract ALL information visible in this image and format it
as a readable meeting transcript or notes document.

The image may be any of:
- A whiteboard photo with handwritten notes, diagrams, or action items
- A screenshot of a slide, presentation, or document
- A photo of handwritten meeting notes on paper
- A screenshot of a chat, email thread, or shared document
- A sticky-note board or Kanban board
- A photo of printed documents

Instructions:
1. Extract every piece of text you can read — handwritten or printed
2. If you see action items, list them clearly with any owner names mentioned
3. If you see decisions or outcomes, preserve them
4. If you see dates, deadlines, or priorities, include them
5. If you see diagrams, describe what they depict (e.g. "Flowchart showing X → Y → Z")
6. Structure the output so it reads like meeting notes a human would write

DO NOT say "I see an image" or describe the image type.
Just extract and format the content directly.
If the image has no readable business content, say: [No meeting content found in this image]
"""


class VisionService:
    async def extract_text_from_image(self, file_bytes: bytes, filename: str) -> str:
        """Use GPT-4o vision to extract text/content from an image."""
        from openai import AsyncOpenAI

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
        mime = _MIME.get(ext, "image/jpeg")
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required for image extraction")

        b64 = base64.b64encode(file_bytes).decode("utf-8")
        client = AsyncOpenAI(api_key=api_key)

        response = await client.chat.completions.create(
            model="gpt-4o",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{b64}",
                                "detail": "high",
                            },
                        },
                        {"type": "text", "text": _EXTRACTION_PROMPT},
                    ],
                }
            ],
        )

        extracted = response.choices[0].message.content or ""
        if "[No meeting content found" in extracted:
            raise ValueError(
                "No readable meeting content was found in this image. "
                "Try a clearer photo or a different image."
            )
        logger.info("Vision extraction complete for %s: %d chars", filename, len(extracted))
        return extracted
