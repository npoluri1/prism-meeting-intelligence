# Prism — Universal Meeting Intelligence Platform

> **Every conversation. Instant clarity.**

Prism transforms any meeting transcript or recording into structured AI-powered insights: executive summaries, action items with owners, key decisions, risks, sentiment analysis, and more. Supports **33 industry-specific domains** with tailored AI prompts.

---

## Deployment Status (Last Verified: 2026-05-12)

| Service | Platform | URL | Status |
|---------|----------|-----|--------|
| Frontend (React SPA) | Vercel | https://prism-meeting-intelligence.vercel.app | ✅ Online (HTTP 200) |
| Backend (FastAPI) | Railway | https://prism-meeting-intelligence-production.up.railway.app | ✅ Online |
| API Docs (Swagger) | Railway | https://prism-meeting-intelligence-production.up.railway.app/docs | ✅ Online |
| OpenAPI Schema | Railway | https://prism-meeting-intelligence-production.up.railway.app/openapi.json | ✅ Online (40+ endpoints) |
| Database + Auth | Supabase | https://app.supabase.com | ✅ Configured |
| CI/CD | GitHub Actions | https://github.com/npoluri1/prism-meeting-intelligence/actions | ✅ All recent runs pass |

### Health Endpoint Response
```
GET https://prism-meeting-intelligence-production.up.railway.app/
→ {"status":"ok","version":"4.0.0","product":"Prism"}
```

---

## Build & Test Status

| Check | Status | Details |
|-------|--------|---------|
| Frontend build (`npm run build`) | ✅ PASS | TypeScript + Vite, 92 modules, 472 KB JS bundle |
| Frontend type check (`tsc --noEmit`) | ✅ PASS | Strict mode, zero implicit any |
| Frontend tests (Vitest) | ✅ PASS | 2 test files, 4 tests passed |
| Backend Docker build | ✅ PASS | Slim Python 3.11 image |
| Frontend Docker build | ✅ PASS | Multi-stage nginx production image |
| GitHub Actions CI | ✅ PASS | 3 jobs: backend-tests, frontend-tests, docker-build |
| GitHub Actions Deploy | ✅ PASS | Railway backend + Vercel frontend auto-deploy |
| Backend tests (local) | ⚠️ Limited | Requires Python 3.11 (local has 3.15.0a6); passes on CI |

---

## Complete Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework (functional components, hooks) |
| TypeScript | 5.6.3 | Type-safe JavaScript (strict mode) |
| Vite | 5.4.11 | Build tool + dev server (HMR) |
| Tailwind CSS | 3.4.15 | Utility-first CSS styling |
| React Router | 6.28.0 | Client-side routing (8 routes) |
| Supabase JS | 2.46.2 | Auth client (magic link + session mgmt) |
| Vitest | 4.1.5 | Unit testing framework |
| Testing Library | React 16.3.2 | Component testing |
| PostCSS | 8.4.49 | CSS processing |
| Autoprefixer | 10.4.20 | CSS vendor prefixes |
| ESLint | 9.15.0 | Linting (React hooks plugin) |
| jsdom | 29.1.1 | DOM environment for tests |

### Frontend Structure (`frontend/src/`)

```
src/
├── App.tsx                    # Router with 8 routes + AuthGuard
├── main.tsx                   # Entry point
├── index.css                  # Tailwind imports
├── types/index.ts             # All TS types + constants (33 industries, 7 platforms)
├── lib/
│   ├── api.ts                 # API client (40+ typed functions, error handling, streaming)
│   └── supabase.ts            # Supabase client + auto-refresh token
├── components/
│   ├── AuthGuard.tsx          # Auth gate for protected routes
│   ├── Navbar.tsx             # Top navigation bar
│   ├── Sidebar.tsx            # Org switcher + workspace menu
│   ├── Toast.tsx              # Toast notification system
│   ├── Spinner.tsx            # Loading indicator
│   ├── UploadZone.tsx         # Drag-and-drop file upload
│   └── AIChatPanel.tsx        # AI chat panel for meeting Q&A
├── pages/
│   ├── LoginPage.tsx          # Magic link email form
│   ├── AuthCallbackPage.tsx   # OAuth redirect handler
│   ├── DashboardPage.tsx      # Meeting list + analytics
│   ├── CalendarPage.tsx       # Month/agenda calendar views
│   ├── NewMeetingPage.tsx     # Transcript paste + upload
│   ├── NotesPage.tsx          # AI notes display + chat
│   ├── OrgMembersPage.tsx     # Team member management
│   └── OrgSettingsPage.tsx    # Organization settings
```

### Frontend Routes

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/login` | LoginPage | No |
| `/auth/callback` | AuthCallbackPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/calendar` | CalendarPage | Yes |
| `/meetings/new` | NewMeetingPage | Yes |
| `/meetings/:id` | NotesPage | Yes |
| `/org/:orgId/members` | OrgMembersPage | Yes |
| `/org/:orgId/settings` | OrgSettingsPage | Yes |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11 | Runtime |
| FastAPI | 0.115.5 | Web framework (async) |
| Uvicorn | 0.32.1 | ASGI server |
| Pydantic | 2.10.1 | Data validation (v2, ConfigDict) |
| OpenAI SDK | 1.57.0 | GPT-4o-mini for AI extraction |
| Supabase Python | 2.10.0 | Supabase client (not used; direct REST via httpx) |
| httpx | 0.27.2 | Async HTTP client (for Supabase REST API) |
| AssemblyAI | 0.34.0 | Primary audio/video transcription |
| python-multipart | 0.0.12 | File upload parsing |
| SendGrid | 6.11.0 | Email notifications |
| Celery | 5.4.0 | Async task queue |
| Redis | 5.2.0 | Celery message broker |
| python-dotenv | 1.0.1 | Env var loading |
| pytest | 8.3.4 | Testing framework |
| pytest-asyncio | 0.24.0 | Async test support |
| email-validator | 2.2.0 | Email validation |

### Backend Structure (`backend/`)

```
backend/
├── main.py                          # FastAPI app creation + CORS + router includes
├── models.py                        # All Pydantic models (Meeting, Org, Calendar, etc.)
├── dependencies.py                  # JWT dependency injection (`get_current_user`)
├── worker.py                        # Celery async task definitions
├── .env.example                     # 20+ env vars documented
├── requirements.txt                 # 16 dependencies pinned
├── domains/
│   ├── __init__.py                  # Domain registry loader
│   └── registry.py                  # 33 industry domain definitions with prompts
├── routers/
│   ├── auth.py                      # GET /api/auth/me
│   ├── meetings.py                  # CRUD + process + upload (5 endpoints)
│   ├── organizations.py             # CRUD + members + analytics + action items
│   ├── calendar.py                  # Scheduled meetings + integrations
│   ├── domains.py                   # Domain definitions + categories
│   ├── webhooks.py                  # Zoom, Teams, Google Meet, Webex
│   ├── enterprise.py                # SSO, SCIM, Stripe, GDPR, audit log (stubs)
│   └── chat.py                      # AI streaming chat endpoint
├── services/
│   ├── supabase_service.py          # ALL database calls (400+ lines, 30+ methods)
│   ├── claude_service.py            # OpenAI GPT-4o-mini prompt + response parsing
│   ├── transcription_service.py     # AssemblyAI primary + Whisper fallback
│   ├── notification_service.py      # SendGrid email + Slack notification
│   ├── storage_service.py           # Supabase Storage file ops
│   ├── slack_service.py             # Slack message posting
│   ├── google_meet_service.py       # Google Meet ingestion (Phase 3 stub)
│   ├── webex_service.py             # Webex ingestion (Phase 3 stub)
│   └── vision_service.py            # Image vision analysis
└── tests/
    ├── conftest.py                  # Shared test fixtures
    ├── test_domains.py              # Domain registry tests
    ├── test_notification.py         # Notification tests
    ├── test_storage.py              # Storage service tests
    ├── test_transcription.py        # Transcription tests
    └── test_upload_endpoint.py      # Upload API endpoint tests
```

### Backend API Endpoints (40+ total)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/api/auth/me` | Current user profile |
| GET/POST | `/api/meetings` | List / create meetings |
| GET/DELETE | `/api/meetings/{id}` | Get / delete meeting |
| POST | `/api/meetings/{id}/process` | Run AI extraction |
| POST | `/api/meetings/upload` | Upload audio/video file |
| GET/POST/PATCH/DELETE | `/api/organizations` | Workspace CRUD |
| GET/POST | `/api/organizations/{id}/members` | Member management |
| GET | `/api/organizations/{id}/analytics` | Org analytics |
| GET | `/api/organizations/{id}/action-items` | Org action items |
| GET | `/api/templates` | Meeting templates (31 seeded) |
| GET/PATCH | `/api/action-items` | Personal action items |
| GET | `/api/analytics` | Personal analytics |
| GET/POST/PATCH/DELETE | `/api/calendar/scheduled` | Scheduled meetings CRUD |
| POST | `/api/calendar/scheduled/{id}/complete` | Mark meeting completed |
| GET/POST/DELETE | `/api/calendar/integrations` | Calendar integrations |
| GET | `/api/domains` | All 33 industry domains |
| GET | `/api/domains/categories` | Domains grouped by category |
| POST | `/api/chat/stream` | AI streaming chat (SSE) |
| POST | `/api/webhooks/zoom` | Zoom webhook (HMAC verified) |
| POST | `/api/webhooks/teams` | Teams webhook |
| POST | `/api/webhooks/google-meet` | Google Meet webhook (stub) |
| POST | `/api/webhooks/webex` | Webex webhook (stub) |
| POST/GET/PUT/DELETE | `/api/enterprise/*` | Enterprise SSO/SCIM/Billing/GDPR (stubs) |

### Database (Supabase Postgres)

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profiles (auto-created via trigger) | No |
| `meetings` | Meeting records (transcript + metadata) | Yes |
| `organizations` | Workspaces with plan/size/industry | Yes |
| `organization_members` | User-org membership with roles | Yes |
| `notes` | AI-extracted meeting notes | Yes |
| `action_items` | Dedicated action items with priority/status/due_date | Yes |
| `scheduled_meetings` | Calendar events with recurrence | Yes |
| `calendar_integrations` | OAuth calendar provider connections | Yes |
| `meeting_templates` | 31 system templates + custom | Yes |
| `meeting_categories` | Custom meeting categories | Yes |

**Key migration files:**
- `supabase/schema.sql` — Base schema (profiles, meetings, notes)
- `supabase/full_setup_v2.sql` — Organizations, templates, action items (idempotent)
- `supabase/migration_v3_calendar.sql` — Calendar/scheduling tables (idempotent)

### Auth Flow (Supabase Magic Link)

```
1. User enters email → supabase.auth.signInWithOtp({ email })
2. Supabase sends magic link email
3. User clicks link → fragment contains access_token
4. onAuthStateChange → SIGNED_IN → AuthGuard allows access
5. Every API call: Frontend sends Bearer token → Backend validates via Supabase REST API
6. Token auto-refresh: Refreshed when expires_at < 60 seconds away
```

### AI Processing Pipeline

```
User pastes transcript (or uploads audio/video)
  → POST /api/meetings (status=pending)
  → POST /api/meetings/{id}/process
  → Backend calls OpenAI gpt-4o-mini with domain-specific prompt
  → Response parsed: summary, action_items, decisions, risks, sentiment, topics, participants
  → Saved to notes + action_items tables (status=done)
  → Frontend polls every 3s until status=done
```

### Infra & DevOps

| Component | Technology | Details |
|-----------|------------|---------|
| Containerization | Docker + Docker Compose | 2 Dockerfiles (backend, frontend) + nginx config |
| Frontend host | Vercel | Static SPA served via CDN |
| Backend host | Railway | Python 3.11 + Uvicorn via Docker |
| Database | Supabase (Postgres) | Managed Postgres with RLS |
| Auth | Supabase Auth | Magic link emails, JWT tokens |
| CI/CD | GitHub Actions | CI (3 jobs) + Deploy (2 services) |
| Async Queue | Celery + Redis | Background upload processing |
| File Storage | Supabase Storage | Audio/video file uploads |
| Monitoring | Railway Logs + Vercel Logs | Per-service logging dashboards |

### CI/CD Pipeline (GitHub Actions)

**CI workflow** (`.github/workflows/ci.yml`): Runs on every push/PR to main/master/develop
```
Job 1: backend-tests     (Python 3.11 + Redis service → pip install → pytest)
Job 2: frontend-tests    (Node 20 → npm ci → type-check → vitest)
Job 3: docker-build      (Build both Docker images)
```

**Deploy workflow** (`.github/workflows/deploy.yml`): Runs on push to main/master
```
Job 1: deploy-backend    (Railway CLI → railway up)
Job 2: deploy-frontend   (Vercel action → deploy --prod)
Job 3: notify            (Logs deployment status)
```

### 33 Industry Domains

| Category | Domains |
|----------|---------|
| General | General Business |
| Technology & Cyber | IT, Cybersecurity, Telecom |
| Health & Life Sciences | Healthcare, Pharma, Fitness |
| Financial Services | Finance, Insurance, Accounting |
| Professional Services | Legal, Legal Tech, Architecture, Creative Agencies |
| People & Talent | HR, Education, Sports |
| Customer-Facing | Sales, Customer Support, Retail, Hospitality, Real Estate |
| Operations & Industrial | Manufacturing, Construction, Logistics, Mining, Agriculture, Automotive, Aerospace, Energy |
| Media & Public | Media, Government, Non-Profit |

---

## Environment Variables

### Backend (`backend/.env.example`)
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `OPENAI_API_KEY` | OpenAI key for gpt-4o-mini |
| `ASSEMBLYAI_API_KEY` | AssemblyAI transcription |
| `SENDGRID_API_KEY` | SendGrid email notifications |
| `SENDGRID_FROM_EMAIL` | Sender email address |
| `SLACK_BOT_TOKEN` | Slack integration |
| `SLACK_CHANNEL_ID` | Slack target channel |
| `STORAGE_BUCKET` | Supabase Storage bucket name |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `FRONTEND_URL` | Frontend URL for email links |
| `ZOOM_CLIENT_ID/SECRET` | Zoom OAuth credentials |
| `ZOOM_WEBHOOK_SECRET_TOKEN` | Zoom webhook validation |
| `AZURE_CLIENT_ID/SECRET/TENANT` | Teams integration |
| `TEAMS_WEBHOOK_VALIDATION_TOKEN` | Teams webhook validation |
| `PORT` | Railway port (default 8000) |

### Frontend (`frontend/.env.local.example`)
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (safe to expose) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) |
| `VITE_API_URL` | Backend API base URL |

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- Supabase account (free tier)
- OpenAI API key

### Backend
```bash
cd backend
cp .env.example .env   # Fill in your keys
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local   # Fill in your keys
npm install
npm run dev
```

### Docker (Full Stack)
```bash
docker compose up --build
# Frontend: http://localhost
# Backend API: http://localhost:8000
```

### Run Tests
```bash
# Backend
cd backend && pytest tests/ -v

# Frontend
cd frontend && npm test -- --run
```

---

## Repository Structure
```
meeting-notes/
├── .github/workflows/       # CI + Deploy workflows
├── backend/                 # FastAPI (8 routers, 9 services, 5 test files)
├── frontend/                # React SPA (8 pages, 8 components)
├── supabase/                # DB migrations (3 SQL files)
├── docker/                  # Dockerfiles + nginx config
├── docs/                    # 12 documentation files
├── browser-extension/       # Chrome/Edge extension (Phase 5)
├── docker-compose.yml       # Production compose
├── docker-compose.dev.yml   # Dev compose with hot reload
└── railway.json             # Railway build config
```
