# Supabase Setup Guide — MeetingMind

Everything you need to create a free Supabase project and wire it into this app.

---

## Free Tier Limits (no credit card needed)

| Resource | Free allowance |
|----------|---------------|
| Projects | 2 |
| Database storage | 500 MB |
| Monthly active users | 50,000 |
| API requests | Unlimited |
| Auth emails (magic links) | 50 / hour |

---

## Step 1 — Create a Supabase account

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with **GitHub** (easiest) or email
4. No credit card required

---

## Step 2 — Create a new project

1. After login click **"New project"**
2. Fill in:
   - **Name**: `meetingmind` (or anything you like)
   - **Database Password**: create a strong password — save it, but you won't need it in `.env`
   - **Region**: pick the one closest to you
3. Click **"Create new project"**
4. Wait ~2 minutes for provisioning to finish

---

## Step 3 — Get your 3 API keys

1. In the left sidebar click **"Project Settings"** (gear icon, bottom-left)
2. Click **"API"**
3. Copy these 3 values into your `.env` file:

| Dashboard label | `.env` variable | Notes |
|----------------|-----------------|-------|
| **Project URL** | `SUPABASE_URL` and `VITE_SUPABASE_URL` | Looks like `https://abcxyz.supabase.co` |
| **anon / public** key | `VITE_SUPABASE_ANON_KEY` | Safe to use in the browser |
| **service_role** key | `SUPABASE_SERVICE_ROLE_KEY` | Click the eye icon to reveal — **keep this secret, backend only** |

Your `.env` should end up looking like this:

```env
# ── Backend ──────────────────────────────────────────────
SUPABASE_URL=https://abcdefghijkl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
ALLOWED_ORIGINS=http://localhost:5173

# ── Frontend ─────────────────────────────────────────────
VITE_SUPABASE_URL=https://abcdefghijkl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:8000
```

---

## Step 4 — Run the database schema

1. In the left sidebar click **"SQL Editor"**
2. Click **"New query"**
3. Open `supabase/schema.sql` from this project folder
4. Copy the **entire file contents** and paste into the SQL editor
5. Click **"Run"** (or press **Ctrl + Enter**)
6. You should see: `Success. No rows returned`

This creates the `profiles`, `meetings`, and `notes` tables with Row Level Security enabled and the auto-profile trigger.

---

## Step 5 — Configure Auth redirect URLs

This tells Supabase where to send users after they click the magic link email.

1. In the left sidebar click **"Authentication"**
2. Click **"URL Configuration"**
3. Set **Site URL** to:
   ```
   http://localhost:5173
   ```
4. Under **Redirect URLs**, click **"Add URL"** and add:
   ```
   http://localhost:5173
   ```
5. Click **Save**

> When you deploy to production, come back here and add your Vercel URL
> (e.g. `https://meetingmind.vercel.app`) to the Redirect URLs list.

---

## Step 6 — Verify tables were created

1. In the left sidebar click **"Table Editor"**
2. You should see three tables: `profiles`, `meetings`, `notes`
3. Click each one — they should be empty (no rows yet)

---

## Step 7 — Start the app

```bash
# From the project root (meeting-notes/)
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

---

## Where each key is used

```
SUPABASE_URL             → backend validates JWTs + reads/writes DB
SUPABASE_SERVICE_ROLE_KEY → backend bypasses Row Level Security for writes
VITE_SUPABASE_URL        → frontend initialises Supabase JS client
VITE_SUPABASE_ANON_KEY   → frontend sends magic link emails via Supabase Auth
OPENAI_API_KEY           → backend calls GPT-4o-mini to process transcripts
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Magic link email never arrives | Check Supabase → Authentication → Logs |
| "Invalid JWT" on every request | Make sure `SUPABASE_URL` matches the project the token was issued for |
| Tables not found (404 from PostgREST) | Re-run `supabase/schema.sql` in the SQL Editor |
| CORS error in browser | Add `http://localhost:5173` (no trailing slash) to `ALLOWED_ORIGINS` in `.env` |
| Backend returns 500 on `/process` | Check `OPENAI_API_KEY` is set and has credits |
| "Failed to fetch" on login | Check `VITE_SUPABASE_URL` is correct in Vercel env vars (set to **Production** scope); verify Supabase project is not paused |

---

## Production deployment

When going live (Vercel + Railway), repeat Step 5 and add your production URL:
- **Site URL**: `https://prism-meeting-intelligence.vercel.app`
- **Redirect URLs**: `https://prism-meeting-intelligence.vercel.app`

Full deployment steps are in [docs/DEPLOYMENT.md](DEPLOYMENT.md).