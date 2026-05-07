# File: CLAUDE.md

# Prism — Universal Meeting Intelligence Platform

Read this file before starting any work on this project.

---

## Project Overview

**Prism** is a universal meeting intelligence SaaS. Users schedule meetings on the calendar, paste or upload transcripts, and the platform uses AI to extract rich structured output across 9 industry domains.

Core output per meeting:
- Executive summary
- Action items (owner, priority, due date)
- Key decisions
- Risks & blockers
- Suggested next-meeting agenda
- Meeting sentiment score (1–10)
- Participant list and key topics

Users authenticate via Supabase magic link. All data is scoped by user or organization with Supabase RLS. The project folder stays named `meeting-notes` — do not rename it.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Python 3.11 + FastAPI + Uvicorn |
| AI | OpenAI API (`gpt-4o-mini`) via `ClaudeService` in `backend/services/claude_service.py` |
| Database + Auth | Supabase (Postgres + magic link auth) |
| Containerization | Docker + Docker Compose |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |

---

## Monorepo Structure

```
meeting-notes/
├── .claude/                      # Claude project settings
├── docs/                         # Architecture, API, dev, deployment guides
├── frontend/                     # React SPA (Vite)
│   └── src/
│       ├── components/           # Shared UI (Sidebar, Toast, Spinner, Navbar, AuthGuard)
│       ├── lib/                  # api.ts, supabase.ts
│       ├── pages/                # One file per route
│       └── types/index.ts        # All TypeScript types and constants
├── backend/
│   ├── main.py                   # FastAPI app, router includes
│   ├── models.py                 # All Pydantic models
│   ├── dependencies.py           # get_current_user
│   ├── routers/                  # auth, meetings, organizations, calendar
│   └── services/
│       ├── supabase_service.py   # ALL database calls live here
│       └── claude_service.py     # OpenAI call + domain prompt logic
├── supabase/
│   ├── schema.sql                # v1 base schema
│   ├── migration_v2.sql          # Organizations, templates, action items
│   ├── full_setup_v2.sql         # Idempotent v2 (run this on a fresh project)
│   └── migration_v3_calendar.sql # Calendar / scheduled meetings
├── docker/
├── docker-compose.yml
├── docker-compose.dev.yml
└── CLAUDE.md
```

---

## Frontend Routes

| Path | Component | Auth |
|------|-----------|------|
| `/login` | LoginPage | No |
| `/auth/callback` | AuthCallbackPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/calendar` | CalendarPage | Yes |
| `/meetings/new` | NewMeetingPage | Yes |
| `/meetings/:id` | NotesPage | Yes |
| `/org/:orgId/members` | OrgMembersPage | Yes |
| `/org/:orgId/settings` | OrgSettingsPage | Yes |

---

## Backend API Summary (v3.0.0)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/meetings` | List / create meetings |
| GET/POST/DELETE | `/api/meetings/{id}` | Get / delete meeting |
| POST | `/api/meetings/{id}/process` | Run AI extraction |
| GET/POST/PATCH/DELETE | `/api/organizations` | Workspace CRUD |
| GET/POST | `/api/organizations/{id}/members` | Member management |
| GET | `/api/organizations/{id}/analytics` | Org analytics |
| GET | `/api/organizations/{id}/action-items` | Org action items |
| GET | `/api/templates` | System meeting templates |
| GET/PATCH | `/api/action-items` | Personal action items |
| GET | `/api/analytics` | Personal analytics |
| GET/POST/PATCH/DELETE | `/api/calendar/scheduled` | Scheduled meetings CRUD |
| POST | `/api/calendar/scheduled/{id}/complete` | Mark meeting completed |
| GET/POST/DELETE | `/api/calendar/integrations` | Calendar provider integrations |

---

## Required Environment Variables

**Never commit actual values.**

| Variable | Used By | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | Backend | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Service role key (bypasses RLS — never expose to frontend) |
| `OPENAI_API_KEY` | Backend | OpenAI key for `gpt-4o-mini` |
| `ALLOWED_ORIGINS` | Backend | Comma-separated CORS origins |
| `VITE_SUPABASE_URL` | Frontend | Same Supabase URL (safe to expose) |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon key (safe to expose) |
| `VITE_API_URL` | Frontend | Backend base URL |

---

## Database Migration Order

Run in Supabase SQL editor in this order on a fresh project:
1. `supabase/schema.sql`
2. `supabase/full_setup_v2.sql` (includes organizations, templates, action items — idempotent)
3. `supabase/migration_v3_calendar.sql` (scheduled meetings + calendar integrations)

---

## Code Style Rules

### TypeScript (Frontend)
- **Strict mode** — zero implicit `any`
- **Async/await only** — never `.then()/.catch()` chains
- **All API calls** through `frontend/src/lib/api.ts` only
- **All types** defined in `frontend/src/types/index.ts`
- **Toast errors** — every catch block must call `toast.error(...)` with the actual message. Never `catch { // silent }`
- **React 18 functional components** only
- **No inline styles** — Tailwind only
- **Named exports** for all components

### Python (Backend)
- `from __future__ import annotations` at every module top
- Type hints on all signatures and return types
- `async def` for all route handlers and service methods
- Pydantic v2 — use `model_config = ConfigDict(...)`
- All DB calls in `supabase_service.py` only
- Error responses always `{"detail": "...", "code": "..."}`
- Never expose raw exceptions or stack traces in responses
- Log server-side before raising HTTPException

### Both
- No `TODO` comments — open a GitHub issue
- No commented-out code — use git history
- No hardcoded secrets or URLs
- Comments only for non-obvious WHY

---

## Working Rules for Claude Code

1. Never make multi-file changes without first listing what will change.
2. Always trace a bug to root cause. Never add a `catch { // silent }`.
3. Every new external service gets an entry in `.env.example`.
4. Every database change needs a migration file in `supabase/`.
5. Update `docs/API.md` and `docs/ARCHITECTURE.md` alongside code.
6. Each phase ends with a `docs/PHASE_N_REPORT.md`.
7. Webhook handlers must verify signatures before processing.
8. When in doubt about scope, stop and ask.

---

## Key Architectural Decisions

- **Service role key backend-only**: Frontend uses anon key. Service role never touches the browser.
- **App-level access control**: The backend uses `_admin()` headers (service role) for DB calls and enforces access in Python code, not relying solely on RLS. This avoids RLS recursion bugs with org membership policies.
- **Synchronous AI processing**: `/process` blocks until OpenAI responds. For large transcripts this may time out. Future: Celery + Redis queue.
- **JWT validated per request**: `supabase.auth.get_user(token)` is a network call on every request. Future: local JWT validation with the Supabase JWT secret.
- **Polling not WebSockets**: Frontend polls every 3 s for status. Simple, sufficient at current scale.
- **Calendar scheduling**: `scheduled_meetings` table stores future meetings with optional iCal RRULE for recurrence. Calendar integrations table stores OAuth tokens for Google/Outlook sync (Phase 2).
