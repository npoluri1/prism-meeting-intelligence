from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from dependencies import get_current_user
from models import (
    CalendarIntegrationCreate,
    CalendarIntegrationOut,
    ScheduledMeetingCreate,
    ScheduledMeetingOut,
    ScheduledMeetingUpdate,
)
from services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


# ── Scheduled meetings ───────────────────────────────────────────────────────

@router.get("/scheduled", response_model=list[ScheduledMeetingOut])
async def list_scheduled(
    start: Optional[str] = Query(None, description="ISO date range start"),
    end: Optional[str] = Query(None, description="ISO date range end"),
    organization_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> list[ScheduledMeetingOut]:
    rows = await svc.list_scheduled_meetings(
        user_id=current_user["id"],
        organization_id=organization_id,
        start=start,
        end=end,
        status_filter=status,
    )
    return [ScheduledMeetingOut(**r) for r in rows]


@router.post("/scheduled", response_model=ScheduledMeetingOut, status_code=status.HTTP_201_CREATED)
async def create_scheduled(
    body: ScheduledMeetingCreate,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> ScheduledMeetingOut:
    row = await svc.create_scheduled_meeting(
        user_id=current_user["id"],
        data=body.model_dump(),
    )
    return ScheduledMeetingOut(**row)


@router.get("/scheduled/{sm_id}", response_model=ScheduledMeetingOut)
async def get_scheduled(
    sm_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> ScheduledMeetingOut:
    row = await svc.get_scheduled_meeting(sm_id, current_user["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Scheduled meeting not found")
    return ScheduledMeetingOut(**row)


@router.patch("/scheduled/{sm_id}", response_model=ScheduledMeetingOut)
async def update_scheduled(
    sm_id: str,
    body: ScheduledMeetingUpdate,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> ScheduledMeetingOut:
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")
    row = await svc.update_scheduled_meeting(sm_id, current_user["id"], updates)
    if not row:
        raise HTTPException(status_code=404, detail="Scheduled meeting not found")
    return ScheduledMeetingOut(**row)


@router.delete("/scheduled/{sm_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_scheduled(
    sm_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> None:
    deleted = await svc.delete_scheduled_meeting(sm_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Scheduled meeting not found")


@router.post("/scheduled/{sm_id}/complete", response_model=ScheduledMeetingOut)
async def complete_scheduled(
    sm_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> ScheduledMeetingOut:
    """Mark a scheduled meeting as completed."""
    row = await svc.update_scheduled_meeting(
        sm_id, current_user["id"], {"status": "completed"}
    )
    if not row:
        raise HTTPException(status_code=404, detail="Scheduled meeting not found")
    return ScheduledMeetingOut(**row)


# ── Calendar integrations ────────────────────────────────────────────────────

@router.get("/integrations", response_model=list[CalendarIntegrationOut])
async def list_integrations(
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> list[CalendarIntegrationOut]:
    rows = await svc.list_calendar_integrations(current_user["id"])
    return [CalendarIntegrationOut(**r) for r in rows]


@router.post("/integrations", response_model=CalendarIntegrationOut, status_code=status.HTTP_201_CREATED)
async def upsert_integration(
    body: CalendarIntegrationCreate,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> CalendarIntegrationOut:
    row = await svc.upsert_calendar_integration(current_user["id"], body.model_dump())
    return CalendarIntegrationOut(**row)


@router.delete("/integrations/{int_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_integration(
    int_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> None:
    await svc.delete_calendar_integration(int_id, current_user["id"])
