# File: docs/DEVELOPMENT.md

# Development Guide — MeetingMind

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| Python | 3.11+ | https://python.org |
| Docker Desktop | Latest | https://docker.com/products/docker-desktop |
| Git | Any | https://git-scm.com |

You also need accounts for:
- [Supabase](https://supabase.com) — free tier is sufficient
- [Anthropic](https://console.anthropic.com) — for Claude API key

---

## First-time Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd meeting-notes

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your actual keys (see below)
```

### 2. Set up Supabase

1. Create a new project at https://app.supabase.com
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Project Settings → API** and copy:
   - Project URL → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **Authentication → URL Configuration** and set:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173`

### 3. Get Anthropic API key

1. Go to https://console.anthropic.com/keys
2. Create a new API key
3. Add it to `ANTHROPIC_API_KEY` in `.env`

---

## Running with Docker (recommended)

```bash
# Start both services with hot reload
docker compose -f docker-compose.dev.yml up

# Or rebuild first if you changed requirements.txt or package.json
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

---

## Running Manually (without Docker)

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

# Create .env from example (if you haven't already)
cp .env.example .env
# Edit .env with your actual keys

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local from example
cp .env.local.example .env.local
# Edit .env.local with your actual keys

npm run dev
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env.local`)

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8000
```

---

## Development Workflow

### Making backend changes

Changes to `.py` files are picked up automatically when running with `--reload` (uvicorn) or via the dev Docker Compose.

### Making frontend changes

Vite HMR picks up changes instantly. No restart needed.

### Changing database schema

1. Edit `supabase/schema.sql`
2. Run the new SQL in the Supabase SQL Editor
3. Update the Pydantic models in `backend/models.py` if needed
4. Update TypeScript types in `frontend/src/types/index.ts` if needed

---

## Running Tests

```bash
# Backend tests
cd backend
pytest tests/ -v --cov=.

# Frontend type check
cd frontend
npm run type-check

# Frontend lint
npm run lint
```

---

## Useful Commands

```bash
# Backend: format code
cd backend
black .
isort .

# Backend: check types
mypy .

# Frontend: build for production
cd frontend
npm run build

# Frontend: preview production build
npm run preview

# Docker: rebuild a single service
docker compose -f docker-compose.dev.yml build backend

# Docker: view logs
docker compose -f docker-compose.dev.yml logs -f backend

# Docker: shell into backend container
docker compose -f docker-compose.dev.yml exec backend bash
```

---

## Project Structure Deep Dive

```
backend/
├── main.py              # FastAPI app creation, CORS, router inclusion
├── models.py            # All Pydantic request/response models
├── dependencies.py      # get_current_user FastAPI dependency
├── routers/
│   ├── meetings.py      # /api/meetings routes
│   └── auth.py          # /api/auth routes
└── services/
    ├── supabase_service.py  # All DB operations (never call supabase directly elsewhere)
    └── claude_service.py    # Claude API wrapper

frontend/src/
├── App.tsx              # Router setup, auth state initialization
├── main.tsx             # React root mount
├── types/
│   └── index.ts         # ALL TypeScript types (import only from here)
├── lib/
│   ├── supabase.ts      # Supabase client singleton
│   └── api.ts           # ALL fetch calls (never call fetch directly in components)
├── components/
│   ├── AuthGuard.tsx    # Redirects unauthenticated users to /login
│   ├── Navbar.tsx       # Top navigation bar
│   └── Spinner.tsx      # Loading spinner
└── pages/
    ├── LoginPage.tsx    # Magic link login form
    ├── DashboardPage.tsx # List of user's meetings
    ├── NewMeetingPage.tsx # Transcript input form
    └── NotesPage.tsx    # Displays processed meeting notes
```

---

## Common Issues

### "CORS error" in browser console
Make sure `ALLOWED_ORIGINS` in your backend `.env` includes exactly the frontend URL (e.g. `http://localhost:5173`). No trailing slash.

### "Invalid JWT" errors
Your Supabase session may have expired. Sign out and sign in again. In dev, you can clear localStorage.

### Claude returns non-JSON
This is a rare edge case. Check the `raw_response` field in the Supabase `notes` table to see what Claude actually returned. The system prompt is designed to prevent this, but very short/unusual transcripts can confuse the model.

### Docker containers won't start
Make sure `.env` exists at the repo root (not just in `backend/`). The Docker Compose file reads from the root `.env`.
