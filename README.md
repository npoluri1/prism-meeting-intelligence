# Prism — Universal Meeting Intelligence Platform

> **Every conversation. Instant clarity.**

Prism is a universal meeting intelligence SaaS that transforms any meeting into structured insights. Users can upload transcripts/recordings or connect calendar integrations (Zoom, Teams, Google Meet) to automatically process meetings through AI.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Supabase account (free tier works)
- OpenAI API key (`gpt-4o-mini`)

### Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY in .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
cp .env.local.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY in .env.local
npm install
npm run dev
```

### Docker (Full Stack)
```bash
docker compose up --build
# Frontend: http://localhost
# Backend API: http://localhost:8000
# Redis: localhost:6379 (for Celery)
```

---

## 📋 Features

### ✅ Phase 1 — Foundations
- [x] Transcript paste + AI extraction (33 industry domains)
- [x] Audio/video upload (mp3, mp4, wav, mkv, webm)
- [x] AssemblyAI transcription (primary) + Whisper fallback
- [x] Domain-aware AI prompts (healthcare, sales, legal, etc.)
- [x] Calendar page (month/agenda views)
- [x] Organizations + team management
- [x] Action items tracking
- [x] Meeting notes with 8+ output artifacts

### ✅ Phase 2 — Channel Integrations
- [x] Celery + Redis async processing
- [x] Zoom webhook (HMAC verification)
- [x] Microsoft Teams webhook
- [x] Slack notification posting
- [x] SendGrid email notifications
- [x] Google Meet + Webex stubs

### 🔄 Phase 3 — More Channels (In Progress)
- [ ] Google Meet full ingestion
- [ ] Cisco Webex full ingestion
- [ ] Google Calendar + Outlook sync
- [ ] Speaker talk-time breakdown
- [ ] Searchable transcript with timestamps

### 🔜 Phase 4 — Enterprise (Stubs Ready)
- [ ] SAML/OIDC SSO
- [ ] SCIM 2.0 provisioning
- [ ] Stripe billing
- [ ] Audit log
- [ ] GDPR export/delete

### 🔜 Phase 5 — Live Capture (Stubs Ready)
- [ ] Chrome/Edge browser extension
- [ ] Tauri desktop app
- [ ] Live transcription streaming

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
│              React SPA (Vite + TypeScript)                  │
└────────────────────┬─────────────────────────────────────┘
                     │  HTTPS
              ┌──────▼───────┐
              │   Vercel CDN  │
              │ (static files) │
              └──────┬────────┘
                     │  HTTPS /api/*
              ┌──────▼────────┐
              │  Railway       │
              │  FastAPI       │
              └───┬────────┬─┘
                  │        │
          ┌───────▼──┐  ┌▼──────────┐
          │ Supabase │  │  OpenAI    │
          │ (Postgres│  │  gpt-4o-mini│
          │  + Auth) │  │            │
          └──────────┘  └───────────┘
```

---

## 📚 Documentation

| File | Description |
|------|-------------|
| `docs/API.md` | Full API reference |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/PLATFORM_PLAN.md` | Multi-phase roadmap |
| `docs/PHASE1_REPORT.md` | Phase 1 completion report |
| `docs/PHASE2_REPORT.md` | Phase 2 completion report |
| `docs/DOMAINS.md` | 33 industry domains reference |
| `supabase/full_setup_v2.sql` | Run this for full DB setup |

---

## 🧪 Testing

### Backend
```bash
cd backend
pytest tests/ -v
# 28 tests covering models, API, domains, transcription, notifications
```

### Frontend
```bash
cd frontend
npm test
# Vitest + Testing Library
```

---

## 🚢 Deployment

### Frontend (Vercel)
- Connect GitHub repo → auto-deploy from `main`
- Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Backend (Railway)
- Connect GitHub repo → auto-deploy from `main`
- Set env vars from `backend/.env.example`
- Add Redis plugin for Celery

### GitHub Actions
- CI: `.github/workflows/ci.yml` runs on every PR
- Deploy: `.github/workflows/deploy.yml` runs on `main`

---

## 🔐 Environment Variables

See `.env.example` files:
- `backend/.env.example` — 15+ variables
- `frontend/.env.local.example` — 3 variables

**Never commit `.env` files!**

---

## 📄 License

MIT License — see LICENSE file (TBD)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Run tests: `cd backend && pytest` + `cd frontend && npm test`
4. Submit a PR

---

**Built with:** FastAPI · React · Supabase · OpenAI · Celery · Redis · Tailwind CSS
