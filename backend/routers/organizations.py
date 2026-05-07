from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import get_current_user
from models import (
    ActionItemOut, ActionItemUpdate, AnalyticsOut,
    InviteMemberInput, OrgCreate, OrgMemberOut, OrgOut, OrgUpdate, TemplateOut,
)
from services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("", response_model=list[OrgOut])
async def list_organizations(
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> list[OrgOut]:
    orgs = await svc.list_user_organizations(current_user["id"], current_user["token"])
    return [OrgOut(**o) for o in orgs]


@router.post("", response_model=OrgOut, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrgCreate,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> OrgOut:
    org = await svc.create_organization(
        name=body.name,
        user_id=current_user["id"],
        user_token=current_user["token"],
        industry=body.industry,
        size=body.size,
        website=body.website or "",
    )
    return OrgOut(**org, role="owner")


@router.get("/{org_id}", response_model=OrgOut)
async def get_organization(
    org_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> OrgOut:
    org = await svc.get_organization(org_id, current_user["token"])
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrgOut(**org)


@router.patch("/{org_id}", response_model=OrgOut)
async def update_organization(
    org_id: str,
    body: OrgUpdate,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> OrgOut:
    updates = body.model_dump(exclude_none=True)
    org = await svc.update_organization(org_id, updates)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrgOut(**org)


@router.get("/{org_id}/members", response_model=list[OrgMemberOut])
async def list_members(
    org_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> list[OrgMemberOut]:
    return [OrgMemberOut(**m) for m in await svc.list_org_members(org_id, current_user["token"])]


@router.post("/{org_id}/members", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def add_member(
    org_id: str,
    body: InviteMemberInput,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> None:
    profile = await svc.get_profile_by_email(body.email, current_user["token"])
    if not profile:
        raise HTTPException(status_code=404, detail="No user found with that email address")
    await svc.add_org_member(org_id, profile["id"], body.role)


@router.get("/{org_id}/analytics", response_model=AnalyticsOut)
async def get_analytics(
    org_id: str,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> AnalyticsOut:
    data = await svc.get_analytics(current_user["id"], current_user["token"], org_id)
    return AnalyticsOut(**data)


@router.get("/{org_id}/action-items", response_model=list[ActionItemOut])
async def list_org_action_items(
    org_id: str,
    item_status: str | None = None,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> list[ActionItemOut]:
    items = await svc.list_action_items(
        current_user["id"], current_user["token"], org_id, item_status
    )
    return [ActionItemOut(**i) for i in items]


# ── Shared templates endpoint ─────────────────────────────────────────────────

templates_router = APIRouter(prefix="/api/templates", tags=["templates"])


@templates_router.get("", response_model=list[TemplateOut])
async def list_templates(
    industry: str | None = None,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> list[TemplateOut]:
    return [TemplateOut(**t) for t in await svc.list_templates(current_user["token"], industry)]


# ── Action items top-level ────────────────────────────────────────────────────

action_items_router = APIRouter(prefix="/api/action-items", tags=["action-items"])


@action_items_router.get("", response_model=list[ActionItemOut])
async def list_my_action_items(
    item_status: str | None = None,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> list[ActionItemOut]:
    items = await svc.list_action_items(
        current_user["id"], current_user["token"], None, item_status
    )
    return [ActionItemOut(**i) for i in items]


@action_items_router.patch("/{item_id}", response_model=ActionItemOut)
async def update_action_item(
    item_id: str,
    body: ActionItemUpdate,
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> ActionItemOut:
    updates = body.model_dump(exclude_none=True)
    item = await svc.update_action_item(item_id, updates)
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    return ActionItemOut(**item)


# ── Analytics top-level ───────────────────────────────────────────────────────

analytics_router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@analytics_router.get("", response_model=AnalyticsOut)
async def get_my_analytics(
    current_user: dict = Depends(get_current_user),
    svc: SupabaseService = Depends(SupabaseService),
) -> AnalyticsOut:
    data = await svc.get_analytics(current_user["id"], current_user["token"])
    return AnalyticsOut(**data)
