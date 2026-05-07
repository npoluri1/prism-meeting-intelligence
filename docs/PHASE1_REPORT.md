# Phase 1 Report — Prism Universal Meeting Intelligence

_Completed: 2026-05-07_

---

## What shipped

### Backend

| Feature | File | Status |
|---------|------|--------|
| Audio/video upload endpoint `POST /api/meetings/upload` | `routers/meetings.py` | ✅ |
| Supabase Storage upload service | `services/storage_service.py` | ✅ |
| AssemblyAI transcription (primary) | `services/transcription_service.py` | ✅ |
| OpenAI Whisper fallback transcription | `services/transcription_service.py` | ✅ |
| Background processing pipeline | `routers/meetings.py::_process_upload_background` | ✅ |
| SendGrid email notification on complete | `services/notification_service.py` | ✅ |
| Slack summary posting (optional) | `services/slack_service.py` | ✅ |
| 33-domain industry registry | `domains/registry.py` | ✅ |
| Domain-aware AI prompts | `services/claude_service.py` | ✅ |
| `GET /api/domains` + `GET /api/domains/categories` | `routers/domains.py` | ✅ |
| Zoom webhook receiver (with HMAC verification) | `routers/webhooks.py` | ✅ |
| Teams webhook receiver (URL validation) | `routers/webhooks.py` | ✅ |
| DB migration: nullable transcript + media columns | `supabase/migration_v4_media.sql` | ✅ |
| 15+ backend tests | `backend/tests/` | ✅ |

### Frontend

| Feature | File | Status |
|---------|------|--------|
| Upload tab on NewMeetingPage | `pages/NewMeetingPage.tsx` | ✅ |
| Drag-and-drop UploadZone component | `components/UploadZone.tsx` | ✅ |
| Grouped + searchable industry picker (33 domains) | `pages/NewMeetingPage.tsx` | ✅ |
| `uploadMeeting()` API function | `lib/api.ts` | ✅ |
| `source` + `media_url` on Meeting type | `types/index.ts` | ✅ |

---

## Migration steps

Run in Supabase SQL editor in this order:

```sql
-- 1. If not done yet:
-- schema.sql → full_setup_v2.sql → migration_v3_calendar.sql

-- 2. New:
-- supabase/migration_v4_media.sql
```

---

## New env vars (add to backend/.env)

| Var | Required | Purpose |
|-----|----------|---------|
| `ASSEMBLYAI_API_KEY` | Recommended | Primary transcription (speaker diarization). Sign up at assemblyai.com |
| `SENDGRID_API_KEY` | Optional | Email when processing completes. Sign up at sendgrid.com |
| `SENDGRID_FROM_EMAIL` | Optional | From address (default: `noreply@getprism.ai`) |
| `FRONTEND_URL` | Optional | Used in email links (default: `http://localhost:5173`) |
| `STORAGE_BUCKET` | Optional | Supabase Storage bucket (default: `meeting-media`) |
| `SLACK_BOT_TOKEN` | Optional | Post summaries to Slack |
| `SLACK_CHANNEL_ID` | Optional | Target Slack channel |
| `ZOOM_WEBHOOK_SECRET_TOKEN` | Phase 2 | Zoom webhook signature verification |
| `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_TENANT_ID` | Phase 2 | Teams Graph API |

---

## New external services to sign up for

| Service | Why | Free tier | Link |
|---------|-----|-----------|------|
| AssemblyAI | Transcription | Yes (limited hours) | https://www.assemblyai.com |
| SendGrid | Email notifications | Yes (100 emails/day) | https://sendgrid.com |
| Slack API | Optional summaries | Yes | https://api.slack.com/apps |
| Supabase Storage | Media file storage | Yes (1 GB included) | In your existing Supabase project |

### Supabase Storage setup
1. Go to Supabase Dashboard → Storage → New bucket
2. Name: `meeting-media`
3. Set to **Public** (so AssemblyAI can download via URL)
4. Add this policy to allow service role uploads:
```sql
CREATE POLICY "Service role can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'meeting-media');
```

---

## Test results

```
backend/tests/test_domains.py          — 13 tests  ✅
backend/tests/test_transcription.py   — 5 tests   ✅
backend/tests/test_notification.py    — 3 tests   ✅
backend/tests/test_storage.py         — 2 tests   ✅
backend/tests/test_upload_endpoint.py — 5 tests   ✅
Total: 28 tests
```

Run with: `docker compose -f docker-compose.dev.yml exec backend pytest tests/ -v`

---

## How the upload flow works

```
User drops file on UploadZone
  → POST /api/meetings/upload (multipart)
    → Validate ext + size (<2 GB)
      → Create meeting row (status: pending, source: upload)
        → Return 202 immediately → user redirected to meeting page
          → BackgroundTask fires:
              1. Upload bytes to Supabase Storage → media_url
              2. AssemblyAI transcription (speaker diarization)
                 OR Whisper API fallback (if no AssemblyAI key)
              3. Run gpt-4o-mini extraction with domain context
              4. Save notes + action items
              5. Update status: done
              6. Send email (SendGrid) + Slack post (if configured)
```

The meeting page polls every 3s while status is `processing`.

---

## Known issues deferred to Phase 2

- Celery + Redis queue (currently BackgroundTasks — fine for <500 MB files, may timeout on large files or slow containers)
- Speaker talk-time breakdown requires parsing AssemblyAI utterance timestamps
- Zoom recording download (needs live Zoom app credentials — stubbed in Phase 1)
- Teams recording download (needs live Azure app — stubbed in Phase 1)
- Google Meet ingestion (Phase 3)
- Domain-specific output schemas (e.g. SOAP format for Healthcare) — Phase 3
