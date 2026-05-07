from __future__ import annotations

import json
import logging
import os
import re
import secrets
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_http: Optional[httpx.AsyncClient] = None
_profile_cache: set[str] = set()


def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(timeout=15.0)
    return _http


def _rest_url(path: str) -> str:
    return f"{os.environ['SUPABASE_URL']}/rest/v1/{path}"


def _headers(user_token: str, *, prefer: str = "") -> dict[str, str]:
    h: dict[str, str] = {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _admin(*, prefer: str = "") -> dict[str, str]:
    """Bypass-RLS headers (service role, no user JWT)."""
    h: dict[str, str] = {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


class SupabaseService:
    # ── Auth ────────────────────────────────────────────────────────────────

    async def get_user_from_token(self, token: str) -> Optional[dict]:
        http = _get_http()
        try:
            resp = await http.get(
                f"{os.environ['SUPABASE_URL']}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
                },
            )
        except Exception as exc:
            logger.warning("auth/v1/user failed: %s", exc)
            raise
        if resp.status_code != 200:
            logger.warning("auth/v1/user %s: %s", resp.status_code, resp.text[:200])
            return None
        data = resp.json()
        user_id = str(data["id"])
        email = data["email"]
        await self._ensure_profile(user_id, email)
        return {"id": user_id, "email": email}

    async def _ensure_profile(self, user_id: str, email: str) -> None:
        if user_id in _profile_cache:
            return
        http = _get_http()
        resp = await http.post(
            _rest_url("profiles"),
            headers=_admin(prefer="resolution=ignore-duplicates,return=minimal"),
            content=json.dumps({"id": user_id, "email": email}),
        )
        if resp.is_success or resp.status_code in (200, 201, 409):
            _profile_cache.add(user_id)
        else:
            logger.warning("_ensure_profile %s: %s", resp.status_code, resp.text[:200])

    async def get_profile(self, user_id: str, user_token: str) -> Optional[dict]:
        http = _get_http()
        resp = await http.get(
            _rest_url("profiles"),
            headers=_headers(user_token),
            params={"id": f"eq.{user_id}", "select": "id,email,created_at"},
        )
        rows = resp.json() if resp.is_success else []
        return rows[0] if rows else None

    # ── Meetings ─────────────────────────────────────────────────────────────

    async def list_meetings(
        self,
        user_id: str,
        user_token: str,
        organization_id: Optional[str] = None,
    ) -> list[dict]:
        http = _get_http()
        # Use admin headers + app-level filter to avoid RLS recursion from org policies
        params: dict[str, str] = {
            "select": "id,title,status,created_at,industry,source,media_url",
            "order": "created_at.desc",
        }
        if organization_id:
            # Verify membership first
            if not await self._is_org_member(user_id, organization_id):
                return []
            params["organization_id"] = f"eq.{organization_id}"
        else:
            params["user_id"] = f"eq.{user_id}"

        resp = await http.get(_rest_url("meetings"), headers=_admin(), params=params)
        if not resp.is_success:
            logger.error("list_meetings %s: %s", resp.status_code, resp.text[:300])
            resp.raise_for_status()
        return resp.json() or []

    async def create_meeting(
        self,
        user_id: str,
        title: str,
        transcript: str,
        user_token: str,
        organization_id: Optional[str] = None,
        industry: str = "general",
        meeting_date: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[list] = None,
        template_id: Optional[str] = None,
    ) -> dict:
        http = _get_http()
        payload: dict = {
            "user_id": user_id,
            "title": title,
            "transcript": transcript,
            "status": "pending",
            "industry": industry,
        }
        if organization_id:
            payload["organization_id"] = organization_id
        if meeting_date:
            payload["meeting_date"] = meeting_date
        if location:
            payload["location"] = location
        if attendees:
            payload["attendees"] = attendees
        if template_id:
            payload["template_id"] = template_id

        resp = await http.post(
            _rest_url("meetings"),
            headers=_admin(prefer="return=representation"),
            content=json.dumps(payload),
        )
        if not resp.is_success:
            logger.error("create_meeting %s: %s", resp.status_code, resp.text[:400])
        resp.raise_for_status()
        return resp.json()[0]

    async def get_meeting(
        self, meeting_id: str, user_id: str, user_token: str
    ) -> Optional[dict]:
        http = _get_http()
        resp = await http.get(
            _rest_url("meetings"),
            headers=_admin(),
            params={
                "id": f"eq.{meeting_id}",
                "select": "id,user_id,title,status,transcript,created_at,organization_id,industry,meeting_date,location,attendees,source,media_url",
            },
        )
        if not resp.is_success:
            return None
        rows = resp.json()
        if not rows:
            return None
        row = rows[0]
        # App-level access check: org meeting or personal meeting
        if row.get("organization_id"):
            if not await self._is_org_member(user_id, row["organization_id"]):
                return None
        elif row.get("user_id") and str(row["user_id"]) != str(user_id):
            return None
        return row

    async def update_meeting_status(
        self, meeting_id: str, status: str, user_token: str
    ) -> None:
        http = _get_http()
        resp = await http.patch(
            _rest_url("meetings"),
            headers=_admin(),
            params={"id": f"eq.{meeting_id}"},
            content=json.dumps({"status": status}),
        )
        if not resp.is_success:
            logger.error("update_meeting_status %s: %s", resp.status_code, resp.text[:200])

    async def get_notes_for_meeting(
        self, meeting_id: str, user_token: str
    ) -> Optional[dict]:
        http = _get_http()
        resp = await http.get(
            _rest_url("notes"),
            headers=_admin(),
            params={
                "meeting_id": f"eq.{meeting_id}",
                "select": "id,summary,action_items,decisions,raw_response,created_at",
            },
        )
        rows = resp.json() if resp.is_success else []
        return rows[0] if rows else None

    async def save_notes(
        self,
        meeting_id: str,
        summary: str,
        action_items: list[dict],
        decisions: list[str],
        raw_response: str,
        user_token: str,
    ) -> dict:
        http = _get_http()
        resp = await http.post(
            _rest_url("notes"),
            headers=_admin(prefer="return=representation"),
            content=json.dumps({
                "meeting_id": meeting_id,
                "summary": summary,
                "action_items": action_items,
                "decisions": decisions,
                "raw_response": raw_response,
            }),
        )
        resp.raise_for_status()
        return resp.json()[0]

    async def create_upload_meeting(
        self,
        user_id: str,
        title: str,
        filename: str,
        user_token: str,
        industry: str = "general",
        organization_id: Optional[str] = None,
        source: str = "upload",
    ) -> dict:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
        http = _get_http()
        payload: dict = {
            "user_id": user_id,
            "title": title,
            "transcript": None,
            "status": "pending",
            "industry": industry,
            "source": source,
            "media_type": ext,
        }
        if organization_id:
            payload["organization_id"] = organization_id
        resp = await http.post(
            _rest_url("meetings"),
            headers=_admin(prefer="return=representation"),
            content=json.dumps(payload),
        )
        if not resp.is_success:
            logger.error("create_upload_meeting %s: %s", resp.status_code, resp.text[:400])
            resp.raise_for_status()
        return resp.json()[0]

    async def update_meeting_media(
        self, meeting_id: str, media_url: str, user_token: str
    ) -> None:
        http = _get_http()
        resp = await http.patch(
            _rest_url("meetings"),
            headers=_admin(),
            params={"id": f"eq.{meeting_id}"},
            content=json.dumps({"media_url": media_url}),
        )
        if not resp.is_success:
            logger.error("update_meeting_media %s: %s", resp.status_code, resp.text[:200])

    async def update_meeting_transcript(
        self, meeting_id: str, transcript: str, user_token: str
    ) -> None:
        http = _get_http()
        resp = await http.patch(
            _rest_url("meetings"),
            headers=_admin(),
            params={"id": f"eq.{meeting_id}"},
            content=json.dumps({"transcript": transcript}),
        )
        if not resp.is_success:
            logger.error("update_meeting_transcript %s: %s", resp.status_code, resp.text[:200])

    async def delete_meeting(
        self, meeting_id: str, user_id: str, user_token: str
    ) -> bool:
        http = _get_http()
        resp = await http.delete(
            _rest_url("meetings"),
            headers=_admin(prefer="return=representation"),
            params={"id": f"eq.{meeting_id}", "user_id": f"eq.{user_id}"},
        )
        if resp.status_code == 204:
            return True
        if resp.status_code == 200:
            return bool(resp.json())
        return False

    # ── Organizations ─────────────────────────────────────────────────────

    async def _is_org_member(self, user_id: str, org_id: str) -> bool:
        http = _get_http()
        resp = await http.get(
            _rest_url("organization_members"),
            headers=_admin(),
            params={"user_id": f"eq.{user_id}", "organization_id": f"eq.{org_id}"},
        )
        return resp.is_success and bool(resp.json())

    async def create_organization(
        self, name: str, user_id: str, user_token: str,
        industry: str = "general", size: str = "small", website: str = "",
    ) -> dict:
        base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        slug = f"{base_slug}-{secrets.token_hex(3)}"  # unique suffix avoids collisions
        http = _get_http()
        payload = {"name": name, "slug": slug, "industry": industry, "size": size}
        if website:
            payload["website"] = website

        resp = await http.post(
            _rest_url("organizations"),
            headers=_admin(prefer="return=representation"),
            content=json.dumps(payload),
        )
        if not resp.is_success:
            logger.error("create_organization %s: %s", resp.status_code, resp.text[:400])
            resp.raise_for_status()
        org = resp.json()[0]

        await http.post(
            _rest_url("organization_members"),
            headers=_admin(prefer="return=minimal"),
            content=json.dumps({
                "organization_id": org["id"],
                "user_id": user_id,
                "role": "owner",
            }),
        )
        return org

    async def list_user_organizations(
        self, user_id: str, user_token: str
    ) -> list[dict]:
        http = _get_http()
        # Use admin headers to avoid RLS recursion on org_members policies
        resp = await http.get(
            _rest_url("organization_members"),
            headers=_admin(),
            params={"user_id": f"eq.{user_id}", "select": "role,joined_at,organization_id"},
        )
        if not resp.is_success:
            return []
        memberships = resp.json() or []
        if not memberships:
            return []

        org_ids = ",".join(m["organization_id"] for m in memberships)
        # Build URL manually — httpx URL-encodes parentheses which breaks PostgREST in.() syntax
        org_url = (
            f"{_rest_url('organizations')}?id=in.({org_ids})"
            "&select=id,name,slug,plan,industry,size,website,created_at"
        )
        org_resp = await http.get(org_url, headers=_admin())
        orgs = {o["id"]: o for o in (org_resp.json() if org_resp.is_success else [])}

        return [
            {**orgs[m["organization_id"]], "role": m["role"]}
            for m in memberships
            if m["organization_id"] in orgs
        ]

    async def get_organization(self, org_id: str, user_token: str) -> Optional[dict]:
        http = _get_http()
        resp = await http.get(
            _rest_url("organizations"),
            headers=_admin(),
            params={"id": f"eq.{org_id}", "select": "id,name,slug,plan,industry,size,website,created_at"},
        )
        rows = resp.json() if resp.is_success else []
        return rows[0] if rows else None

    async def update_organization(self, org_id: str, updates: dict) -> Optional[dict]:
        http = _get_http()
        resp = await http.patch(
            _rest_url("organizations"),
            headers=_admin(prefer="return=representation"),
            params={"id": f"eq.{org_id}"},
            content=json.dumps(updates),
        )
        rows = resp.json() if resp.is_success else []
        return rows[0] if rows else None

    async def list_org_members(self, org_id: str, user_token: str) -> list[dict]:
        http = _get_http()
        resp = await http.get(
            _rest_url("organization_members"),
            headers=_admin(),
            params={
                "organization_id": f"eq.{org_id}",
                "select": "user_id,role,joined_at",
            },
        )
        members = resp.json() if resp.is_success else []
        if not members:
            return []
        user_ids = ",".join(m["user_id"] for m in members)
        prof_resp = await http.get(
            _rest_url("profiles"),
            headers=_admin(),
            params={"id": f"in.({user_ids})", "select": "id,email"},
        )
        profiles = {p["id"]: p for p in (prof_resp.json() if prof_resp.is_success else [])}
        return [
            {
                "user_id": m["user_id"],
                "email": profiles.get(m["user_id"], {}).get("email", ""),
                "role": m["role"],
                "joined_at": m["joined_at"],
            }
            for m in members
        ]

    async def get_profile_by_email(self, email: str, user_token: str) -> Optional[dict]:
        http = _get_http()
        resp = await http.get(
            _rest_url("profiles"),
            headers=_admin(),
            params={"email": f"eq.{email}", "select": "id,email"},
        )
        rows = resp.json() if resp.is_success else []
        return rows[0] if rows else None

    async def add_org_member(self, org_id: str, user_id: str, role: str) -> None:
        http = _get_http()
        await http.post(
            _rest_url("organization_members"),
            headers=_admin(prefer="resolution=ignore-duplicates,return=minimal"),
            content=json.dumps({"organization_id": org_id, "user_id": user_id, "role": role}),
        )

    # ── Templates ────────────────────────────────────────────────────────────

    async def list_templates(
        self, user_token: str, industry: Optional[str] = None
    ) -> list[dict]:
        http = _get_http()
        params: dict[str, str] = {
            "is_system": "eq.true",
            "select": "id,industry,name,description,prompt_hint,fields",
            "order": "industry.asc,name.asc",
        }
        if industry and industry != "all":
            params["industry"] = f"eq.{industry}"
        resp = await http.get(_rest_url("meeting_templates"), headers=_admin(), params=params)
        return resp.json() if resp.is_success else []

    # ── Action Items ──────────────────────────────────────────────────────────

    async def list_action_items(
        self, user_id: str, user_token: str,
        organization_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict]:
        http = _get_http()
        # Get meeting IDs the user can access
        meeting_params: dict[str, str] = {"select": "id"}
        if organization_id:
            meeting_params["organization_id"] = f"eq.{organization_id}"
        else:
            meeting_params["user_id"] = f"eq.{user_id}"
        m_resp = await http.get(_rest_url("meetings"), headers=_admin(), params=meeting_params)
        meetings = m_resp.json() if m_resp.is_success else []
        if not meetings:
            return []
        meeting_ids = ",".join(m["id"] for m in meetings)
        # Build URL manually — httpx URL-encodes parentheses which breaks PostgREST in.() syntax
        ai_url = (
            f"{_rest_url('action_items')}?meeting_id=in.({meeting_ids})"
            "&select=id,meeting_id,task,owner,due_date,status,priority,created_at,updated_at"
            "&order=due_date.asc.nullslast,priority.desc"
        )
        if status:
            ai_url += f"&status=eq.{status}"
        resp = await http.get(ai_url, headers=_admin())
        return resp.json() if resp.is_success else []

    async def update_action_item(self, item_id: str, updates: dict) -> Optional[dict]:
        http = _get_http()
        resp = await http.patch(
            _rest_url("action_items"),
            headers=_admin(prefer="return=representation"),
            params={"id": f"eq.{item_id}"},
            content=json.dumps({**updates, "updated_at": "now()"}),
        )
        rows = resp.json() if resp.is_success else []
        return rows[0] if rows else None

    async def save_action_items_from_notes(
        self, meeting_id: str, action_items: list[dict]
    ) -> None:
        """Persist extracted action items to the dedicated table."""
        if not action_items:
            return
        http = _get_http()
        rows = [
            {
                "meeting_id": meeting_id,
                "task": item.get("task", ""),
                "owner": item.get("owner", "Unassigned"),
                "status": "open",
                "priority": "medium",
            }
            for item in action_items
        ]
        await http.post(
            _rest_url("action_items"),
            headers=_admin(prefer="return=minimal"),
            content=json.dumps(rows),
        )

    # ── Calendar — Scheduled Meetings ─────────────────────────────────────────

    async def list_scheduled_meetings(
        self,
        user_id: str,
        organization_id: Optional[str] = None,
        start: Optional[str] = None,
        end: Optional[str] = None,
        status_filter: Optional[str] = None,
    ) -> list[dict]:
        http = _get_http()
        params: dict[str, str] = {
            "select": "*",
            "order": "scheduled_at.asc",
        }
        if organization_id:
            params["organization_id"] = f"eq.{organization_id}"
        else:
            params["user_id"] = f"eq.{user_id}"
        if start:
            params["scheduled_at"] = f"gte.{start}"
        if end:
            # override if both present — use a range via two separate params
            params["scheduled_at"] = f"gte.{start}" if start else f"lte.{end}"
            if start:
                # PostgREST supports multiple filters as repeated params
                # We fetch and filter in Python for simplicity
                pass
        if status_filter:
            params["status"] = f"eq.{status_filter}"
        resp = await http.get(_rest_url("scheduled_meetings"), headers=_admin(), params=params)
        rows = resp.json() if resp.is_success else []
        # Apply end-date filter if both provided (PostgREST needs &and= syntax; easier in Python)
        if start and end:
            rows = [r for r in rows if r["scheduled_at"] <= end]
        return rows

    async def create_scheduled_meeting(self, user_id: str, data: dict) -> dict:
        http = _get_http()
        payload = {k: v for k, v in data.items() if v is not None}
        payload["user_id"] = user_id
        if "scheduled_at" in payload and hasattr(payload["scheduled_at"], "isoformat"):
            payload["scheduled_at"] = payload["scheduled_at"].isoformat()
        resp = await http.post(
            _rest_url("scheduled_meetings"),
            headers=_admin(prefer="return=representation"),
            content=json.dumps(payload),
        )
        if not resp.is_success:
            logger.error("create_scheduled_meeting %s: %s", resp.status_code, resp.text[:400])
            resp.raise_for_status()
        return resp.json()[0]

    async def get_scheduled_meeting(self, sm_id: str, user_id: str) -> Optional[dict]:
        http = _get_http()
        resp = await http.get(
            _rest_url("scheduled_meetings"),
            headers=_admin(),
            params={"id": f"eq.{sm_id}", "select": "*"},
        )
        rows = resp.json() if resp.is_success else []
        if not rows:
            return None
        row = rows[0]
        if row.get("user_id") != user_id:
            return None
        return row

    async def update_scheduled_meeting(
        self, sm_id: str, user_id: str, updates: dict
    ) -> Optional[dict]:
        http = _get_http()
        if "scheduled_at" in updates and hasattr(updates["scheduled_at"], "isoformat"):
            updates["scheduled_at"] = updates["scheduled_at"].isoformat()
        updates["updated_at"] = "now()"
        resp = await http.patch(
            _rest_url("scheduled_meetings"),
            headers=_admin(prefer="return=representation"),
            params={"id": f"eq.{sm_id}", "user_id": f"eq.{user_id}"},
            content=json.dumps(updates),
        )
        rows = resp.json() if resp.is_success else []
        return rows[0] if rows else None

    async def delete_scheduled_meeting(self, sm_id: str, user_id: str) -> bool:
        http = _get_http()
        resp = await http.delete(
            _rest_url("scheduled_meetings"),
            headers=_admin(prefer="return=representation"),
            params={"id": f"eq.{sm_id}", "user_id": f"eq.{user_id}"},
        )
        if resp.status_code == 204:
            return True
        if resp.status_code == 200:
            return bool(resp.json())
        return False

    # ── Calendar Integrations ─────────────────────────────────────────────────

    async def list_calendar_integrations(self, user_id: str) -> list[dict]:
        http = _get_http()
        resp = await http.get(
            _rest_url("calendar_integrations"),
            headers=_admin(),
            params={"user_id": f"eq.{user_id}", "select": "*"},
        )
        return resp.json() if resp.is_success else []

    async def upsert_calendar_integration(self, user_id: str, data: dict) -> dict:
        http = _get_http()
        payload = {k: v for k, v in data.items() if v is not None}
        payload["user_id"] = user_id
        resp = await http.post(
            _rest_url("calendar_integrations"),
            headers=_admin(prefer="resolution=merge-duplicates,return=representation"),
            content=json.dumps(payload),
        )
        if not resp.is_success:
            resp.raise_for_status()
        return resp.json()[0]

    async def delete_calendar_integration(self, int_id: str, user_id: str) -> None:
        http = _get_http()
        await http.delete(
            _rest_url("calendar_integrations"),
            headers=_admin(),
            params={"id": f"eq.{int_id}", "user_id": f"eq.{user_id}"},
        )

    # ── Analytics ────────────────────────────────────────────────────────────

    async def get_analytics(
        self, user_id: str, user_token: str, organization_id: Optional[str] = None
    ) -> dict:
        meetings = await self.list_meetings(user_id, user_token, organization_id)
        action_items = await self.list_action_items(user_id, user_token, organization_id)
        by_industry: dict[str, int] = {}
        for m in meetings:
            ind = m.get("industry", "general")
            by_industry[ind] = by_industry.get(ind, 0) + 1
        return {
            "total_meetings": len(meetings),
            "done": sum(1 for m in meetings if m["status"] == "done"),
            "processing": sum(1 for m in meetings if m["status"] == "processing"),
            "pending": sum(1 for m in meetings if m["status"] == "pending"),
            "action_items_open": sum(1 for a in action_items if a["status"] == "open"),
            "action_items_done": sum(1 for a in action_items if a["status"] == "done"),
            "by_industry": by_industry,
        }
