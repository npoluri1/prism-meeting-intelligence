# MeetingMind — Smart Meeting Notes

Paste a meeting transcript → get a summary, action items, and decisions, powered by Claude AI.

## Quick Start

```bash
# 1. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your Supabase and Anthropic keys

# 2. Run the schema in your Supabase SQL Editor
# (copy-paste the contents of supabase/schema.sql)

# 3. Start the full stack with hot reload
docker compose -f docker-compose.dev.yml up

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only, never expose) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL (for frontend) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) |
| `VITE_API_URL` | Backend URL for frontend API calls |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS → deployed on Vercel
- **Backend**: Python 3.11 + FastAPI + Uvicorn → deployed on Railway
- **AI**: Anthropic Claude (`claude-sonnet-4-20250514`)
- **Database + Auth**: Supabase (Postgres + magic link auth)

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, data flow, schema
- [API Reference](docs/API.md) — all endpoints with request/response examples
- [Development Guide](docs/DEVELOPMENT.md) — local setup, testing, common issues
- [Deployment Guide](docs/DEPLOYMENT.md) — Vercel + Railway + Supabase production setup

## Project Structure

```
meeting-notes/
├── frontend/        # React SPA
├── backend/         # FastAPI server
├── supabase/        # Database schema and migrations
├── docker/          # Dockerfiles and nginx config
├── docs/            # Architecture, API, dev, deployment guides
└── CLAUDE.md        # Full project instructions for Claude Code
```