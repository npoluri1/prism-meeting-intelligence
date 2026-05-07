from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ActionItem(BaseModel):
    model_config = ConfigDict(frozen=True)
    task: str
    owner: str


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    transcript: str = Field(..., min_length=10, max_length=50_000)
    organization_id: Optional[str] = None
    industry: str = "general"
    meeting_date: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[list[str]] = None
    template_id: Optional[str] = None


AUDIO_VIDEO_EXTENSIONS = frozenset({"mp3", "m4a", "wav", "mp4", "mov", "webm", "mkv"})
IMAGE_EXTENSIONS      = frozenset({"jpg", "jpeg", "png", "webp", "gif", "bmp"})
UPLOAD_ALLOWED_EXTENSIONS = AUDIO_VIDEO_EXTENSIONS | IMAGE_EXTENSIONS
MAX_UPLOAD_BYTES = 2 * 1024 ** 3  # 2 GB


class MeetingOut(BaseModel):
    id: str
    title: str
    status: str
    created_at: datetime
    organization_id: Optional[str] = None
    industry: Optional[str] = "general"
    source: Optional[str] = "transcript"
    media_url: Optional[str] = None


class NotesOut(BaseModel):
    id: str
    summary: Optional[str]
    action_items: list[ActionItem]
    decisions: list[str]
    risks_and_blockers: list[str] = []
    next_meeting_agenda: list[str] = []
    key_topics: list[str] = []
    participants: list[str] = []
    meeting_sentiment: Optional[dict] = None
    created_at: datetime


class MeetingWithNotes(BaseModel):
    id: str
    title: str
    status: str
    created_at: datetime
    organization_id: Optional[str] = None
    industry: Optional[str] = "general"
    meeting_date: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[list] = None
    notes: Optional[NotesOut] = None


class UserOut(BaseModel):
    id: str
    email: str
    created_at: datetime


class ErrorResponse(BaseModel):
    detail: str
    code: str


class ClaudeResult(BaseModel):
    summary: str
    action_items: list[ActionItem]
    decisions: list[str]
    raw_response: str


# ── Organizations ────────────────────────────────────────────────────────────

class OrgCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    industry: str = "general"
    size: str = "small"
    website: Optional[str] = None


class OrgUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None


class OrgOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    industry: Optional[str] = "general"
    size: Optional[str] = "small"
    website: Optional[str] = None
    created_at: datetime
    member_count: Optional[int] = None
    role: Optional[str] = None


class OrgMemberOut(BaseModel):
    user_id: str
    email: str
    role: str
    joined_at: datetime


class InviteMemberInput(BaseModel):
    email: str
    role: str = Field(default="member", pattern="^(owner|admin|member)$")


# ── Templates ────────────────────────────────────────────────────────────────

class TemplateOut(BaseModel):
    id: str
    industry: str
    name: str
    description: Optional[str]
    prompt_hint: Optional[str]
    fields: list


# ── Action Items ─────────────────────────────────────────────────────────────

class ActionItemOut(BaseModel):
    id: str
    meeting_id: str
    task: str
    owner: str
    due_date: Optional[str] = None
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime


class ActionItemUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(open|in_progress|done|cancelled)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|urgent)$")
    due_date: Optional[str] = None
    owner: Optional[str] = None


# ── Analytics ────────────────────────────────────────────────────────────────

class AnalyticsOut(BaseModel):
    total_meetings: int
    done: int
    processing: int
    pending: int
    action_items_open: int
    action_items_done: int
    by_industry: dict


# ── Calendar / Scheduled Meetings ─────────────────────────────────────────────

PLATFORM_VALUES = ("general", "zoom", "teams", "meet", "webex", "phone", "in_person")
SM_STATUS_VALUES = ("scheduled", "in_progress", "completed", "cancelled")


class ScheduledMeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    scheduled_at: datetime
    duration_min: int = Field(default=60, ge=5, le=480)
    timezone: str = "UTC"
    location: Optional[str] = None
    meeting_url: Optional[str] = None
    platform: str = Field(default="general", pattern="^(general|zoom|teams|meet|webex|phone|in_person)$")
    industry: str = "general"
    template_id: Optional[str] = None
    attendee_emails: list[str] = []
    organization_id: Optional[str] = None
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    reminder_minutes: list[int] = [30]
    notes: Optional[str] = None


class ScheduledMeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_min: Optional[int] = Field(None, ge=5, le=480)
    timezone: Optional[str] = None
    location: Optional[str] = None
    meeting_url: Optional[str] = None
    platform: Optional[str] = None
    industry: Optional[str] = None
    template_id: Optional[str] = None
    attendee_emails: Optional[list[str]] = None
    status: Optional[str] = Field(None, pattern="^(scheduled|in_progress|completed|cancelled)$")
    recurrence_rule: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    reminder_minutes: Optional[list[int]] = None
    notes: Optional[str] = None


class ScheduledMeetingOut(BaseModel):
    id: str
    user_id: str
    organization_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration_min: int
    timezone: str
    location: Optional[str] = None
    meeting_url: Optional[str] = None
    platform: str
    industry: str
    template_id: Optional[str] = None
    attendee_emails: list
    status: str
    meeting_id: Optional[str] = None
    recurrence_rule: Optional[str] = None
    recurrence_parent_id: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    reminder_minutes: list
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CalendarIntegrationOut(BaseModel):
    id: str
    user_id: str
    provider: str
    external_email: Optional[str] = None
    calendar_id: Optional[str] = None
    auto_import: bool
    auto_create: bool
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime


class CalendarIntegrationCreate(BaseModel):
    provider: str = Field(..., pattern="^(google|microsoft|apple)$")
    external_email: Optional[str] = None
    calendar_id: Optional[str] = None
    auto_import: bool = True
    auto_create: bool = True
