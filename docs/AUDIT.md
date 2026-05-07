# Prism — Full Project Audit
_Generated: 2026-05-06_

---

## 1. File Inventory

### Backend (`backend/`)
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app v3.0.0, CORS, router registration |
| `models.py` | All Pydantic v2 request/response models |
| `dependencies.py` | `get_current_user` dependency (JWT → Supabase auth) |
| `requirements.txt` | Python deps — openai, fastapi, supabase, httpx, pydantic |
| `routers/auth.py` | `GET /api/auth/me` |
| `routers/meetings.py` | Meeting CRUD + `/process` (AI extraction) |
| `routers/organizations.py` | Org CRUD, members, action items, analytics (4 routers) |
| `routers/calendar.py` | Scheduled meetings CRUD + calendar integrations |
| `services/supabase_service.py` | All DB access (raw httpx to PostgREST) |
| `services/claude_service.py` | OpenAI `gpt-4o-mini` call + industry prompts |

### Frontend (`frontend/src/`)
| File | Purpose |
|------|---------|
| `App.tsx` | React Router — 8 routes |
| `main.tsx` | Entry point, ToastProvider wrapper |
| `components/AuthGuard.tsx` | Redirect unauthenticated users to /login |
| `components/Sidebar.tsx` | Nav + workspace switcher (bug fixed) |
| `components/Navbar.tsx` | Top nav (Prism brand) |
| `components/Toast.tsx` | Global toast notifications |
| `components/Spinner.tsx` | Loading spinner |
| `lib/api.ts` | All API functions (30 functions) |
| `lib/supabase.ts` | Supabase client + `getSessionToken()` |
| `types/index.ts` | All TypeScript types + INDUSTRIES, PLATFORMS, RECURRENCE constants |
| `pages/LoginPage.tsx` | Magic link login |
| `pages/AuthCallbackPage.tsx` | Supabase magic link callback handler |
| `pages/DashboardPage.tsx` | 3-tab dashboard: Meetings, Action Items, Analytics |
| `pages/CalendarPage.tsx` | Month/Agenda calendar + schedule meeting modal |
| `pages/NewMeetingPage.tsx` | Transcript paste + industry + template picker |
| `pages/NotesPage.tsx` | 4-tab meeting notes + markdown export |
| `pages/OrgMembersPage.tsx` | Team member management |
| `pages/OrgSettingsPage.tsx` | Org settings + calendar integrations |

### Database (`supabase/`)
| File | Purpose |
|------|---------|
| `schema.sql` | v1 base: profiles, meetings, notes, RLS |
| `migration_v2.sql` | Orgs, org_members, org-scoped meetings |
| `full_setup_v2.sql` | Idempotent v2 with 31 seeded templates — **run this** |
| `migration_v3_calendar.sql` | scheduled_meetings, calendar_integrations, RLS |
| `fix_rls.sql` | One-off RLS policy fixes |

---

## 2. API Endpoints — Status

All endpoints require `Authorization: Bearer <supabase-jwt>` except `/`.

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/` | GET | ✅ Health check | Returns `{"status":"ok","version":"3.0.0"}` |
| `/api/auth/me` | GET | ✅ | Returns user profile |
| `/api/meetings` | GET | ✅ | Supports `?organization_id=` filter |
| `/api/meetings` | POST | ✅ | Creates meeting, status=pending |
| `/api/meetings/{id}` | GET | ✅ | Returns meeting + notes if done |
| `/api/meetings/{id}/process` | POST | ✅ | Synchronous AI extraction |
| `/api/meetings/{id}` | DELETE | ✅ | Owner-only |
| `/api/organizations` | GET/POST | ✅ | List + create |
| `/api/organizations/{id}` | GET/PATCH | ✅ | Get + update |
| `/api/organizations/{id}/members` | GET/POST | ✅ | List + invite by email |
| `/api/organizations/{id}/analytics` | GET | ✅ | Org-scoped stats |
| `/api/organizations/{id}/action-items` | GET | ✅ | Org-scoped, filterable |
| `/api/templates` | GET | ✅ | 31 system templates, `?industry=` filter |
| `/api/action-items` | GET | ✅ | Personal, filterable by status |
| `/api/action-items/{id}` | PATCH | ✅ | Update status/priority/due_date |
| `/api/analytics` | GET | ✅ | Personal stats |
| `/api/calendar/scheduled` | GET/POST | ✅ | Date range query supported |
| `/api/calendar/scheduled/{id}` | GET/PATCH/DELETE | ✅ | |
| `/api/calendar/scheduled/{id}/complete` | POST | ✅ | Status → completed |
| `/api/calendar/integrations` | GET/POST | ✅ | Upsert on provider |
| `/api/calendar/integrations/{id}` | DELETE | ✅ | |

---

## 3. Inconsistencies Found & Fixed

| Issue | File | Status |
|-------|------|--------|
| `catch { // silent }` swallowed all create-org errors | `Sidebar.tsx` | ✅ Fixed |
| `/org/:orgId/settings` route missing from App.tsx | `App.tsx` | ✅ Fixed |
| `ANTHROPIC_API_KEY` in CLAUDE.md but code uses `OPENAI_API_KEY` | `CLAUDE.md` | ✅ Fixed |
| `ClaudeService` name but uses OpenAI (cosmetic — intentional) | `claude_service.py` | ⚠️ Left as-is |
| Rich AI fields (risks, sentiment, etc.) generated but not returned | `meetings.py`, `supabase_service.py`, `models.py` | ✅ Fixed |
| `notes` type in TypeScript missing rich fields | `types/index.ts` | ✅ Fixed |
| `NotesPage.tsx` used unsafe cast for extra fields | `NotesPage.tsx` | ✅ Fixed |
| `buildMarkdown` used same unsafe cast | `NotesPage.tsx` | ✅ Fixed |

---

## 4. Gaps for the New Vision

### Missing for audio/video ingestion
- No file upload endpoint (backend stub needed)
- No transcription service integration (AssemblyAI / Whisper)
- No background job queue (Celery + Redis)
- No object storage config (Supabase Storage or S3)
- No webhook handlers for Zoom, Teams, Google Meet

### Missing for enterprise
- No SSO (SAML / OIDC)
- No SCIM provisioning
- No audit log table
- No per-seat billing (Stripe)
- No data residency config

### Missing for real-time analysis
- No WebSocket / SSE push (polling only at 3s intervals)
- No speaker diarization
- No live transcription

---

## 5. Security Review

| Area | Status | Notes |
|------|--------|-------|
| CORS | ✅ | `ALLOWED_ORIGINS` env var, no wildcard in prod |
| Auth enforcement | ✅ | Every route uses `get_current_user` dependency |
| Service role key | ✅ | Backend only, never in frontend env vars |
| RLS on all tables | ✅ | profiles, meetings, notes, organizations, org_members, templates, action_items, meeting_categories, scheduled_meetings, calendar_integrations |
| `.gitignore` | ✅ | `.env` excluded |
| Raw exceptions in responses | ✅ | Backend catches and wraps all errors |
| SQL injection | ✅ | All queries via PostgREST URL params (parameterized) |
| JWT validation | ✅ | `supabase.auth.get_user(token)` per request |

---

## 6. Test Coverage

| Area | Status |
|------|--------|
| Backend unit tests | ❌ None (`tests/` directory missing) |
| Backend integration tests | ❌ None |
| Frontend unit tests | ❌ None |
| Frontend type-check | ✅ TypeScript strict mode on all files |
| Manual happy-path testing | Assumed via local dev |

**Priority:** Add pytest test suite (10+ tests) and vitest component tests before Phase 2.

---

## 7. Readiness Scores

| Area | Score | Notes |
|------|-------|-------|
| Backend | 8/10 | Full CRUD, auth, multi-domain AI, calendar — no tests |
| Frontend | 8/10 | All pages functional, toast system, calendar — no tests |
| Database | 9/10 | Clean schema, RLS, 31 templates seeded |
| Deployment | 6/10 | Docker files exist, not verified end-to-end |
| Docs | 7/10 | CLAUDE.md comprehensive, API.md needs update |
| Tests | 1/10 | No automated tests |

**Overall: 6.5/10 — solid MVP foundation, needs tests before enterprise use.**
