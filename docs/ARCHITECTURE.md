# File: docs/ARCHITECTURE.md

# Architecture — MeetingMind

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User's Browser                              │
│                    React SPA (Vite + TypeScript)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │  HTTPS
              ┌──────────────▼──────────────┐
              │         Vercel CDN           │
              │   (serves static files)      │
              └──────────────┬──────────────┘
                             │  HTTPS /api/*
              ┌──────────────▼──────────────┐
              │     Railway (FastAPI)         │
              │     Python 3.11 + Uvicorn    │
              └──────┬───────────┬───────────┘
                     │           │
         ┌───────────▼──┐  ┌─────▼──────────┐
         │  Supabase     │  │  Anthropic      │
         │  (Postgres +  │  │  Claude API     │
         │   Auth)       │  │                 │
         └───────────────┘  └─────────────────┘
```

---

## Component Responsibilities

| Component | Owns |
|-----------|------|
| **React Frontend** | UI rendering, auth session management, polling for status, clipboard copy |
| **FastAPI Backend** | JWT validation, business logic orchestration, Claude API calls, Supabase writes |
| **Supabase Auth** | User identity, magic link emails, JWT issuance |
| **Supabase Postgres** | Persistent storage of meetings, notes, profiles; RLS enforcement |
| **Anthropic Claude** | Transcript understanding, JSON extraction of summary/action items/decisions |

---

## Data Flow — "User Pastes Transcript to Notes Appearing"

1. **User submits the New Meeting form**
   - Frontend calls `POST /api/meetings` with `{title, transcript}`
   - Auth header: `Authorization: Bearer <supabase_access_token>`

2. **Backend creates the meeting record**
   - `dependencies.py`: validates JWT via `supabase.auth.get_user(token)`
   - `supabase_service.create_meeting()`: inserts row with `status='pending'`
   - Returns `MeetingOut` (id, title, status, created_at)

3. **Frontend immediately calls process**
   - `POST /api/meetings/{id}/process`
   - Backend sets `status='processing'`

4. **Claude API call**
   - `claude_service.process_transcript(transcript)` sends structured prompt
   - Claude responds with raw JSON string (no markdown fences)
   - Backend parses JSON with `try/except json.JSONDecodeError`

5. **Notes saved to Supabase**
   - `supabase_service.save_notes()` inserts into `notes` table
   - `supabase_service.update_meeting_status('done')` updates meeting

6. **Frontend navigates to notes page**
   - `GET /api/meetings/{id}` returns `MeetingWithNotes`
   - If status is still processing, frontend polls every 3 seconds

7. **Notes rendered to user**
   - Summary, action items (task + owner), decisions displayed
   - "Copy as Markdown" button available

---

## Database Schema

### `profiles`
Auto-created when a user signs up via Supabase Auth trigger.
```
id          uuid  PK, FK → auth.users(id)
email       text
created_at  timestamptz
```

### `meetings`
One per transcript submission.
```
id          uuid  PK, default gen_random_uuid()
user_id     uuid  FK → profiles(id) ON DELETE CASCADE NOT NULL
title       text  NOT NULL
transcript  text  NOT NULL
status      text  NOT NULL, CHECK in ('pending','processing','done','error')
created_at  timestamptz default now()
```

### `notes`
One per completed meeting (created after Claude processes the transcript).
```
id            uuid  PK, default gen_random_uuid()
meeting_id    uuid  FK → meetings(id) ON DELETE CASCADE NOT NULL
summary       text
action_items  jsonb  default '[]'  -- [{task: str, owner: str}]
decisions     jsonb  default '[]'  -- [str]
raw_response  text   -- raw Claude output for debugging
created_at    timestamptz default now()
```

### RLS Policies

**meetings:**
- `SELECT` where `auth.uid() = user_id`
- `INSERT` where `auth.uid() = user_id`
- `UPDATE` where `auth.uid() = user_id`
- `DELETE` where `auth.uid() = user_id`

**notes:**
- `SELECT` where `meeting_id IN (SELECT id FROM meetings WHERE user_id = auth.uid())`
- `INSERT` same join condition
- `UPDATE` same join condition

Note: The backend uses the `SERVICE_ROLE_KEY` which bypasses RLS. RLS protects against direct Supabase client access from the frontend.

---

## Auth Flow

```
1. User enters email on /login
2. Frontend: supabase.auth.signInWithOtp({ email })
   → Supabase sends magic link email

3. User clicks link in email
   → Supabase redirects to window.location.origin/#access_token=...
   → Supabase JS SDK parses the fragment and stores session in localStorage

4. onAuthStateChange fires with SIGNED_IN event
   → AuthGuard lets user through to protected routes

5. Every API call:
   Frontend: getSessionToken() → supabase.auth.getSession() → access_token
   Frontend: fetch('/api/...', { headers: { Authorization: `Bearer ${token}` } })
   Backend: supabase.auth.get_user(token) → validates JWT, returns user
   Backend: uses user.id as user_id for all queries

6. Token expiry:
   Supabase JS SDK auto-refreshes tokens using the refresh_token
   Backend gets a 401 if token is invalid → frontend catches and redirects to /login
```

---

## AI Processing Pipeline

```
transcript (string)
    │
    ▼
ClaudeService.process_transcript()
    │
    ├─ Build messages:
    │   system: "You are a meeting notes assistant. Return ONLY valid JSON..."
    │   user:   "Extract meeting notes from this transcript:\n\n{transcript}"
    │
    ├─ anthropic.messages.create(
    │     model="claude-sonnet-4-20250514",
    │     max_tokens=1500,
    │     system=SYSTEM_PROMPT,
    │     messages=[{"role":"user","content":user_msg}]
    │   )
    │
    ├─ response.content[0].text  →  raw_response (string)
    │
    ├─ json.loads(raw_response)  →  parsed dict
    │   try/except JSONDecodeError → ValueError("Claude returned invalid JSON")
    │
    └─ return {summary, action_items, decisions}
```

The system prompt explicitly instructs Claude:
- Return ONLY a valid JSON object
- No markdown code fences
- No prose before or after
- Exact keys: `summary`, `action_items`, `decisions`
- `action_items`: array of `{task: string, owner: string}`
- `decisions`: array of strings
- Use "Unassigned" if no owner is mentioned

---

## Error Handling Strategy

| Failure Point | What Happens |
|---------------|-------------|
| Bad JWT token | `dependencies.py` raises 401 `ErrorResponse` |
| Meeting not found | `meetings.py` raises 404 `ErrorResponse` |
| Wrong user's meeting | Returns 404 (not 403, to avoid resource enumeration) |
| Claude API error | Sets `status='error'`, raises 500 `ErrorResponse` |
| Claude returns invalid JSON | Logs raw response, sets `status='error'`, raises 500 |
| Supabase connection error | Propagates as 500 `ErrorResponse` |
| Frontend network error | `apiFetch` throws typed `ApiError`, component shows error banner |
| Frontend auth expired | `apiFetch` throws 401, AuthGuard redirects to /login |

All server errors are logged before being converted to HTTP responses. Raw exception messages are never sent to the client — only the generic `ErrorResponse` shape.

---

## Scaling Notes

**What breaks first at scale:**

1. **Synchronous Claude calls** — The `/process` endpoint blocks for 2-10 seconds while Claude responds. Under load, this exhausts the Uvicorn worker pool. Fix: move processing to a Celery task queue (Redis broker), return a job ID, poll for completion.

2. **JWT validation network call** — Every request calls `supabase.auth.get_user(token)` which is an HTTP round-trip to Supabase. Fix: validate the JWT locally using the Supabase JWT secret and `python-jose`.

3. **Polling every 3 seconds** — Under many concurrent users, this multiplies read requests. Fix: replace with Server-Sent Events or WebSocket for real-time status updates.

4. **Single Uvicorn worker** — Default Railway deploy uses one worker. Fix: add `--workers 4` to the uvicorn command (requires stateless request handling, which this app already is).