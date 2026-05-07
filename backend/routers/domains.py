from __future__ import annotations

from fastapi import APIRouter

from domains import list_categories, list_domains

router = APIRouter(prefix="/api/domains", tags=["domains"])


@router.get("")
async def get_domains() -> list[dict]:
    """Return all 33 industry domains."""
    return list_domains()


@router.get("/categories")
async def get_categories() -> list[dict]:
    """Return domains grouped by category (for UI picker)."""
    return list_categories()
