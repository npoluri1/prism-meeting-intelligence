from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends

from dependencies import get_current_user
from models import UserOut
from services.supabase_service import SupabaseService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> UserOut:
    profile = await svc.get_profile(current_user["id"], current_user["token"])
    if profile:
        return UserOut(
            id=profile["id"],
            email=profile["email"],
            created_at=profile["created_at"],
        )
    return UserOut(
        id=current_user["id"],
        email=current_user["email"],
        created_at=datetime.utcnow(),
    )