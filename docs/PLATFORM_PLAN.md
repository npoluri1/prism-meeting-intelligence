# Prism — Universal Meeting Intelligence Platform Plan
_Created: 2026-05-06_

---

## 1. Product Name

**Chosen name: Prism**

Rationale:
- A prism refracts one input (meeting) into many outputs (summary, actions, decisions, risks, sentiment) — exactly the metaphor
- 5 letters, clean, memorable, enterprise-grade
- Not locked into "meetings" — works for any recorded conversation
- Domain `prism.ai` / `getprism.ai` / `prism.io` style branding possible
- Tagline: **"Every conversation. Instant clarity."**

Runner-up options: ConvoCortex, ClarityHub, Nexus AI, Aria Intelligence

---

## 2. Ingestion Channels

### a) Microsoft Teams (Priority 1)
- **API:** Microsoft Graph API
- **Auth:** OAuth 2.0 (delegated for user-scoped, application for org-scoped)
- **Required scopes:** `OnlineMeetings.Read.All`, `CallRecords.Read.All`, `Files.Read.All`
- **Events:** Subscribe via Graph Change Notifications to `callRecords`
- **Flow:** Meeting ends → Graph webhook fires → backend downloads transcript from SharePoint → queue job → extract
- **Rate limits:** 200 requests/10s (application), throttled at tenant level
- **Key risk:** Tenant admin must consent to app permissions

### b) Zoom (Priority 1)
- **API:** Zoom Server-to-Server OAuth + Webhook
- **Events:** `meeting.ended`, `recording.completed`, `transcription_completed`
- **Flow:** Meeting ends → Zoom webhook → verify HMAC-SHA256 signature → download cloud recording → queue → extract
- **Credential needed:** Zoom Marketplace app (Server-to-Server OAuth)
- **Rate limits:** 100 requests/day on free Developer, unlimited on production

### c) Google Meet (Priority 2)
- **API:** Google Workspace Meet API (GA as of 2024) + Drive API for recordings
- **Required scopes:** `https://www.googleapis.com/auth/meetings.space.readonly`, `https://www.googleapis.com/auth/drive.readonly`
- **Flow:** Meeting ends → Drive webhook (Push Notifications) → download recording → queue → extract
- **Limitation:** Transcripts only available on Google Workspace Business plans

### d) Cisco Webex (Priority 2)
- **API:** Webex REST API + Webhooks
- **Events:** `meetings:ended`, `recordings:created`
- **Auth:** OAuth 2.0 (integration app)

### e) Direct Upload (Phase 1 — Priority 1)
- Accept: mp3, m4a, wav, mp4, mov, webm, mkv
- Max: 4 hours / 2 GB
- Upload to Supabase Storage or S3 (multipart for files > 100MB)
- Backend endpoint: `POST /api/meetings/upload` (multipart/form-data)

### f) Phone Calls — Twilio (Phase 3)
- Twilio Voice API + Recording Webhooks
- `recording.completed` event → download → transcribe → extract

### g) Email Forwarding (Phase 3)
- Unique inbound email per user (e.g., `user-id@inbound.getprism.ai`)
- SendGrid Inbound Parse or Postmark Inbound
- Parses attachments (audio/video) or calendar invites from email body

### h) Calendar Sync (Phase 2)
- Google Calendar API: subscribe to calendar events, pre-create meeting records
- Microsoft Graph: subscribe to Outlook calendar events
- Auto-link recordings to pre-created meeting records when they arrive

### i) Live Capture (Phase 5)
- Chrome/Edge browser extension: captures tab audio during live calls
- Desktop app (Tauri): captures system audio
- Streams audio chunks to backend in real time
- Legal requirement: clear consent banner before capture starts

---

## 3. Audio/Video Processing Pipeline

```
Recording arrives (webhook / upload / email)
  ↓
Validate + store metadata in DB (status: queued)
  ↓
Upload media to Supabase Storage (or S3)
  ↓
Enqueue background job (Celery + Redis)
  ↓
Worker: Download media if not already local
  ↓
Transcription:
  Primary:  AssemblyAI (best diarization, $0.37/hour)
  Fallback: OpenAI Whisper API ($0.006/minute)
  ↓
Speaker diarization (included in AssemblyAI)
  ↓
Language detection → translate to English if needed (optional)
  ↓
Run domain-template LLM extraction (OpenAI gpt-4o-mini)
  ↓
Store structured output in `notes` table
  ↓
Notify user: in-app (websocket/polling) + email (SendGrid)
  ↓
Status: done
```

**Why AssemblyAI as primary:**
- Best-in-class speaker diarization
- Word-level timestamps for jump-to-clip feature
- Automatic language detection
- $0.37/audio-hour — cheapest among full-feature providers
- Fallback to Whisper API is half the price but no diarization

---

## 4. Output Artifacts

For every processed meeting, Prism generates:

| Artifact | Current | Planned |
|----------|---------|---------|
| Executive summary | ✅ | ✅ |
| Detailed bullet summary | — | Phase 1 |
| Action items (owner, priority, due date) | ✅ | ✅ |
| Decisions | ✅ | ✅ |
| Risks & blockers | ✅ | ✅ |
| Suggested next agenda | ✅ | ✅ |
| Sentiment score | ✅ | ✅ |
| Speaker talk-time breakdown | — | Phase 2 (needs diarization) |
| Topic segmentation with timestamps | — | Phase 2 |
| Key quotes with timestamps | — | Phase 2 |
| Follow-up email draft | — | Phase 2 |
| CRM-ready notes (sales) | — | Phase 3 |
| JIRA/Linear ticket drafts | — | Phase 3 |
| Searchable transcript | — | Phase 2 |
| Risk flags ("deadline without owner") | — | Phase 2 |

---

## 5. Multi-Domain Templates

Current: 31 system templates across 9 industries.

Each template defines:
- `prompt_hint` — injected into system prompt
- `fields` — JSONB schema for custom extraction fields
- `industry` — determines which context block is prepended

Phase 3 additions:
- Sales call → CRM fields (deal stage, objections, next steps, ARR)
- Customer support → ticket severity, resolution, CSAT prediction
- HR interview → candidate score, competency assessment, recommendation
- Legal review → clause flags, risk rating, action items with owner
- Healthcare (HIPAA mode) → SOAP format, no PHI sent to non-BAA providers

---

## 6. Multi-Tenancy + Enterprise Features

### Current state
- `organizations` table with owner/admin/member roles
- RLS scoped to organization_members
- Free plan only

### Roadmap additions (Phase 4)
- **SSO:** SAML 2.0 + OIDC (Okta, Azure AD, Google Workspace, generic)
- **SCIM 2.0:** Automated user provisioning / deprovisioning
- **Roles expansion:** owner, admin, manager, member, viewer, guest
- **Audit log:** immutable append-only table, every mutation logged
- **Per-workspace config:** model selection, retention days, PII redaction toggle
- **Data residency:** US / EU / India Supabase projects, selected at org creation
- **BYOK:** user provides their own OpenAI/Anthropic API key, stored encrypted
- **Usage analytics:** meetings processed, tokens used, cost per seat

### Billing model (Phase 4 — Stripe)
| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 5 meetings/month, 1 user, manual upload only |
| Solo Pro | $15/mo | 50 meetings, all channels, 1 user |
| Team | $25/user/mo | Unlimited meetings, org features, 5+ users |
| Business | $45/user/mo | Advanced integrations, custom templates, priority support |
| Enterprise | Custom | SSO/SCIM, BYOK, data residency, SLA, audit log |

---

## 7. Integrations (Outbound)

| Integration | Phase | What gets sent |
|-------------|-------|----------------|
| Slack | 2 | Meeting summary + action items to channel/DM |
| Email digest | 2 | Summary email to all attendees |
| Microsoft Teams | 2 | Summary post to Teams channel |
| Notion | 3 | Creates a Notion page per meeting |
| Confluence | 3 | Publishes to space/page |
| Google Docs | 3 | Creates doc in Drive folder |
| Salesforce | 3 | Logs call notes to Opportunity/Contact |
| HubSpot | 3 | Logs to Deal/Contact timeline |
| JIRA | 3 | Creates issues from action items |
| Linear | 3 | Creates issues from action items |
| Asana | 3 | Creates tasks from action items |
| Zapier webhook | 2 | Fires on meeting-processed event |

---

## 8. Multi-Model AI Layer

### Current
`ClaudeService` uses `openai.AsyncOpenAI` → `gpt-4o-mini`.

### Phase 4 abstraction
```python
class LLMProvider(Protocol):
    async def complete(self, system: str, user: str, max_tokens: int) -> str: ...

class OpenAIProvider(LLMProvider): ...
class AnthropicProvider(LLMProvider): ...
class OllamaProvider(LLMProvider): ...   # local llama3.2:3b
class AzureOpenAIProvider(LLMProvider): ...
```

Per-workspace model config stored in `organizations.settings` JSONB.
Cost tracked per request in `ai_usage_log` table.

---

## 9. Privacy + Compliance

| Requirement | Phase | Notes |
|-------------|-------|-------|
| SOC 2 Type II | 4 | Audit log, access controls, encryption |
| HIPAA mode | 3 | No PHI to non-BAA providers; healthcare templates only |
| GDPR delete | 4 | Right to erasure endpoint, cascade deletes |
| GDPR export | 4 | Download all data as JSON/CSV |
| PII redaction | 3 | Strip names/emails/phones from stored transcript |
| Consent banner | 5 | Live capture requires explicit consent |
| AI disclosure | 3 | Required for HR/interview templates in EU AI Act scope |
| Two-party consent | 5 | Per-region config to disable live capture |

---

## 10. System Requirements

### Cloud SaaS (managed)
No requirements for end users.

### Self-hosted (Docker Compose)
| Config | Min | Recommended |
|--------|-----|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 50 GB | 200 GB |
| GPU | Not required | RTX 3060 for local Whisper/LLM |

With local Whisper + local LLM (llama3.2:3b):
- Add NVIDIA GPU (RTX 3060 12GB minimum)
- +16 GB RAM recommended

---

## 11. Implementation Roadmap

### Phase 1 — Foundations (Weeks 1–4)
**Goal:** Working audio/video upload + transcription + calendar in production

Deliverables:
- ✅ Bug fix: Create Organization (done)
- ✅ Rename to Prism (done)
- ✅ Calendar page with month/agenda views (done)
- ✅ Recurring meetings (RRULE stored, UI to set) (done)
- ✅ Calendar integrations settings UI (done)
- ✅ Org Settings page (done)
- ✅ Toast notifications (done)
- ☐ `POST /api/meetings/upload` — accept audio/video files
- ☐ Supabase Storage bucket config for media files
- ☐ AssemblyAI transcription integration
- ☐ OpenAI Whisper fallback
- ☐ Background job queue (FastAPI BackgroundTasks MVP → Celery later)
- ☐ Email notification on processing complete (SendGrid)
- ☐ 10+ backend pytest tests, 5+ frontend vitest tests

New env vars needed: `ASSEMBLYAI_API_KEY`, `SENDGRID_API_KEY`, `STORAGE_BUCKET`
DB migrations: None (calendar added in v3)
New services: AssemblyAI account, SendGrid account

### Phase 2 — Channel Integrations (Weeks 5–8)
**Goal:** Zoom + Teams auto-ingestion live

Deliverables:
- Zoom Server-to-Server OAuth app + webhook handler
- Microsoft Graph OAuth + meeting subscription
- Webhook signature verification for both
- Slack integration (post summaries)
- Email digest to attendees
- Per-workspace integration settings (extend OrgSettingsPage)
- Worker queue (Celery + Redis, replace BackgroundTasks)

New env vars: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `SLACK_BOT_TOKEN`, `REDIS_URL`
DB: `webhook_events` table for idempotency, `integrations` config table

### Phase 3 — More Channels + Advanced Templates (Weeks 9–12)
**Goal:** Full channel coverage, domain-specific output

Deliverables:
- Google Meet ingestion
- Cisco Webex ingestion
- Google Calendar + Outlook calendar sync
- Pre-create meeting records from calendar events
- Sales, Support, HR, Legal, Healthcare HIPAA templates
- CRM-ready notes output
- Speaker talk-time breakdown
- Searchable transcript with speaker labels

### Phase 4 — Enterprise (Weeks 13–16)
**Goal:** First enterprise customer can sign on

Deliverables:
- SAML + OIDC SSO
- SCIM 2.0 provisioning
- Audit log (immutable)
- Stripe billing (subscriptions + usage metering)
- BYOK (encrypted API key storage)
- GDPR data export + deletion
- Usage analytics dashboard

### Phase 5 — Live Capture (Weeks 17–20)
**Goal:** Zero-effort capture during live calls

Deliverables:
- Chrome/Edge browser extension (tab audio capture)
- Tauri desktop app (system audio capture)
- Live transcription streaming
- Summary delivered within 60s of meeting end
- Consent banner + per-region config
- Legal disclosure for AI use in employment context

### Phase 6+ — Scale & Compliance (Ongoing)
- SOC 2 Type II certification
- Mobile apps (iOS + Android)
- Advanced analytics (trend reporting, team benchmarks)
- Marketplace (public template library)
- API for third-party developers
