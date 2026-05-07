# File: docs/DEPLOYMENT.md

# Deployment Guide — MeetingMind

## Overview

| Service | Platform | URL |
|---------|----------|-----|
| Frontend (React SPA) | Vercel | `https://prism-meeting-intelligence.vercel.app` |
| Backend (FastAPI) | Railway | `https://prism-api.up.railway.app` |
| API Docs (Swagger) | Railway | `https://prism-api.up.railway.app/docs` |
| Database + Auth | Supabase | `https://app.supabase.com` |

---

## Pre-Deployment Checklist

- [ ] All environment variables have production values (not dev)
- [ ] `ALLOWED_ORIGINS` contains only your production frontend URL
- [x] Supabase redirect URLs updated to production domain (`https://prism-meeting-intelligence.vercel.app`)
- [ ] RLS is enabled on `meetings` and `notes` tables
- [ ] Docker images build successfully: `docker compose build`
- [ ] No secrets in git: `git log --all -S "sk-ant"` returns nothing

---

## 1. Deploy Backend to Railway

### First deploy

1. Go to https://railway.app and create a new project
2. Click **Deploy from GitHub repo** and select your repository
3. Set the **root directory** to `/` (Railway will use the Dockerfile)
4. Under **Settings → Build**, set:
   - Dockerfile path: `docker/backend.Dockerfile`
5. Under **Variables**, add all backend env vars:
   ```
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-...
    ALLOWED_ORIGINS=https://prism-meeting-intelligence.vercel.app
    FRONTEND_URL=https://prism-meeting-intelligence.vercel.app
    PORT=8000
   ```
6. Click **Deploy**
7. Once deployed, copy the Railway URL: `https://prism-api.up.railway.app`

### Subsequent deploys

Railway auto-deploys on every push to your main branch.

---

## 2. Deploy Frontend to Vercel

### First deploy

1. Go to https://vercel.com and create a new project
2. Import your GitHub repository
3. Set:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
    VITE_API_URL=https://prism-api.up.railway.app
   ```
5. Click **Deploy**
6. Copy the Vercel URL: `https://prism-meeting-intelligence.vercel.app`

### Subsequent deploys

Vercel auto-deploys on every push to your main branch.

---

## 3. Configure Supabase for Production

1. Go to **Authentication → URL Configuration**:
   - **Site URL**: `https://prism-meeting-intelligence.vercel.app`
   - **Redirect URLs**: Add `https://prism-meeting-intelligence.vercel.app`

2. Go to **Authentication → Email Templates** and customize the magic link email if desired.

3. Go to **Authentication → Providers** and ensure **Email** is enabled.

4. Verify RLS is enabled:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   -- meetings and notes should show rowsecurity = true
   ```

---

## 4. Update Backend CORS

After getting your Vercel URL, update the `ALLOWED_ORIGINS` Railway variable:
```
ALLOWED_ORIGINS=https://prism-meeting-intelligence.vercel.app
```

Railway will redeploy automatically.

---

## 5. Verify End-to-End

1. Open `https://prism-meeting-intelligence.vercel.app`
2. Enter your email and request a magic link
3. Click the link in your email — you should be logged in
4. Submit a short transcript
5. Verify notes appear within ~10 seconds
6. Check Railway logs for any errors: `railway logs`

---

## Docker Compose (Self-hosted alternative)

For self-hosted deployment (e.g. on a VPS):

```bash
# On your server
git clone <repo-url>
cd meeting-notes
cp .env.example .env
# Edit .env with production values

docker compose up -d

# View logs
docker compose logs -f

# Update after code change
git pull
docker compose up -d --build
```

The production `docker-compose.yml` runs:
- `nginx` on port 80 serving the frontend static files and proxying `/api/*` to the backend
- `backend` on port 8000 (internal, not exposed)

---

## Monitoring & Logs

### Railway
- Logs: Railway dashboard → your service → Logs tab
- Metrics: Railway dashboard → Metrics tab

### Vercel
- Function logs: Vercel dashboard → your project → Functions tab
- Build logs: Vercel dashboard → Deployments

### Supabase
- Query logs: Supabase dashboard → Logs → Postgres
- Auth logs: Supabase dashboard → Logs → Auth

---

## Rolling Back

### Railway
1. Go to Railway dashboard → Deployments
2. Find the last good deployment
3. Click the three-dot menu → **Rollback**

### Vercel
1. Go to Vercel dashboard → Deployments
2. Find the last good deployment
3. Click the three-dot menu → **Promote to Production**