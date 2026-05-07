# MeetingMind → Universal Meeting Intelligence Platform

> **Project Path:** `D:\WorkSpace\Claude_Code\meeting-notes`
> **Vision:** Evolve from "paste-a-transcript" into an automatic meeting intelligence platform that captures from Teams, Zoom, Google Meet, Webex, phone calls, and uploaded recordings — then delivers summaries, action items, decisions, and insights immediately when the meeting ends.
> **Users:** Solo professionals, small teams, mid-market, and enterprise.
> **How to use this file:** Run the prompts in order. Each one has a specific deliverable. Do not skip the audit and bug fix.

---

## 🚨 First Things First — The "Create Enterprise" Bug

You mentioned the **"Create new enterprise"** button isn't responding. Fix this **before** adding any new features. A broken core flow + new features = compounding bugs that are nearly impossible to debug later.

### Prompt 0 — Fix the Broken "Create Enterprise" Flow

```
The "Create new enterprise" (or "Create new tenant/workspace") action
in the frontend is not working — clicking the button produces no
response, no error toast, no network request visible to the user.

Do the following in order:

1. Locate the button/handler in the frontend. Print the exact file
   and component name.

2. Trace the full flow: button click → API call → backend route →
   database insert → response. Print every file involved.

3. Identify the failure point. Common culprits:
   - Missing onClick / onSubmit binding
   - Form validation blocking submit silently
   - Auth token missing → 401 swallowed by global error handler
   - CORS blocking the request
   - Backend endpoint missing or returning 500 with no body
   - Supabase RLS policy denying insert
   - Missing tenant table or migration not applied

4. Fix the root cause. Do NOT add a try/catch that hides the error —
   surface it properly to the user with a toast/error message.

5. Add a regression test: an integration test that creates a new
   enterprise/tenant end-to-end and verifies the row exists in DB.

6. Produce docs/BUGFIX_CREATE_ENTERPRISE.md describing:
   - What was broken
   - Why it was broken
   - What was changed
   - How the test prevents regression
```

---

## 📋 Prompt 1 — Full Project Audit (run BEFORE any feature work)

```
Perform a complete audit of this project. Do NOT write feature code yet.

Produce docs/AUDIT.md covering:

1. **File inventory** of backend/, frontend/, supabase/, docker/, docs/

2. **What works vs what's broken**:
   - List every API endpoint and whether it returns 200 on a happy-path
     curl test
   - List every frontend route and whether it renders without console errors
   - List every "Create / Update / Delete" button and whether it actually
     triggers the expected backend call

3. **Inconsistencies**:
   - requirements.txt has openai==1.57.0 but README says Anthropic Claude.
     Which one is actually imported in code? Fix the file to match reality.
   - Any folder typos (supabase vs supabase)?
   - Any unused or missing dependencies?

4. **Gaps for the new vision**:
   - What's missing to support audio/video ingestion?
   - What's missing for multi-tenant enterprise creation?
   - What's missing for real-time post-meeting analysis?

5. **Security review**: CORS, RLS policies, service role key handling,
   .env in .gitignore.

6. **Readiness score** (0-10) for: backend, frontend, DB, deployment,
   docs, tests.

Do not modify code beyond fixing requirements.txt mismatches.
Just produce the audit.
```

---

## 📋 Prompt 2 — Architecture Plan for Universal Meeting Intelligence

**Run AFTER Prompt 1 and after the bug fix is verified.**

```
Based on docs/AUDIT.md, design (don't build yet) the next-generation
architecture for MeetingMind. The goal: transform from a manual
transcript-paste tool into a universal meeting intelligence platform.

Produce docs/PLATFORM_PLAN.md covering ALL of the following:

### 1. Project Renaming (5 options with reasoning)
Names that don't lock us into "meetings only." Examples:
- ConvoCortex, ClarityCall, MeetMind, Insightly, Recapture.
Pick one as the recommended new name.

### 2. Ingestion Channels (this is the core new capability)
Design how the platform pulls meeting content automatically from:

  a) **Microsoft Teams** — via Microsoft Graph API
     - OAuth flow (delegated + application permissions)
     - Subscribe to onlineMeetings recordings + transcripts
     - Webhook handlers
     - Permissions required: OnlineMeetings.Read.All,
       CallRecords.Read.All, etc.

  b) **Zoom** — via Zoom Webhooks + Zoom API
     - Server-to-Server OAuth app
     - meeting.ended, recording.completed, transcript_completed events
     - Cloud recording download flow

  c) **Google Meet** — via Google Workspace APIs
     - Meet REST API (in beta/GA as applicable)
     - Drive API for recording files
     - Workspace admin OAuth scopes

  d) **Cisco Webex** — via Webex Webhooks + Recordings API

  e) **Direct upload** — drag-and-drop audio/video files
     - Supported formats: mp3, m4a, wav, mp4, mov, webm, mkv
     - Up to 4 hours / 2GB per file
     - Resumable uploads (tus or S3 multipart)

  f) **Phone calls** — via Twilio Voice + Recording webhooks

  g) **Live capture** — browser extension or desktop app that records
     ongoing calls (Phase 3+ — design only)

  h) **Email forwarding** — forward calendar invites or recording links
     to a unique inbox address (uses a service like SendGrid Inbound Parse)

  i) **Calendar sync** — Google Calendar + Microsoft Outlook to
     pre-create meeting records before they happen

For each channel, document:
- Required OAuth scopes / API keys
- Webhook events we listen to
- Rate limits and quotas
- Data retention rules
- What happens if the user revokes access mid-meeting

### 3. Audio/Video Processing Pipeline

Design the full flow:

  Recording arrives (webhook / upload / forward)
    → Queue job (Redis / Celery / Cloud Tasks)
      → Download media to object storage (S3 / Supabase Storage)
        → Transcribe (choose provider — see below)
          → Speaker diarization
            → Language detection + translation if needed
              → Run domain template extraction (LLM)
                → Store structured output
                  → Notify user (email, Slack, in-app, webhook)

**Transcription provider options to evaluate:**
- AssemblyAI (best speaker diarization, good price)
- Deepgram (fastest, good multilingual)
- OpenAI Whisper API (cheapest, decent quality)
- Self-hosted Whisper (free, needs GPU)
- Azure Speech / Google Speech-to-Text (enterprise compliance)

Pick a default + a fallback. Document why.

### 4. Output Artifacts (what the user gets after a meeting ends)

For every meeting, auto-generate:
- One-paragraph executive summary
- Bullet-point detailed summary
- Action items (owner, due date, priority) with confidence scores
- Decisions made
- Open questions / unresolved threads
- Sentiment timeline (positive/neutral/negative across the meeting)
- Speaker talk-time breakdown
- Topic segmentation with timestamps
- Key quotes with timestamps (jump-to-clip in player)
- Risk flags (e.g. "deadline mentioned without owner")
- Follow-up email draft to attendees
- CRM-ready notes (for sales meetings)
- JIRA / Linear / Asana ticket drafts (for engineering meetings)
- Searchable transcript with speaker labels

### 5. Multi-Domain Templates

Same plugin/strategy pattern as before, but now applied to ingested
audio. Each template defines: prompt, output schema, post-processing.
Domains: Generic meeting, Sales call, Customer support, Legal,
Healthcare, Education, HR / interview, Research, Standup, 1:1.

### 6. Multi-Tenancy + Enterprise Features

- Workspace / organization model
- Roles: owner, admin, manager, member, viewer, guest
- SSO: SAML, OIDC, Okta, Azure AD, Google Workspace
- SCIM provisioning
- Audit log
- Per-workspace data residency option (US, EU, India)
- Custom retention policies
- BYOK (bring your own key) for OpenAI / Anthropic / Azure
- Usage analytics dashboard
- Per-seat and usage-based billing (Stripe)

### 7. Integrations (outbound)

Auto-publish results to:
- Slack (channel or DM)
- Microsoft Teams (channel post)
- Email digest
- Notion, Confluence, Google Docs
- Salesforce, HubSpot (CRM logging)
- JIRA, Linear, Asana, ClickUp (action items as tickets)
- Zapier / Make webhooks for everything else

### 8. Multi-Model AI Layer

LLMProvider abstraction supporting: Anthropic Claude, OpenAI GPT,
Azure OpenAI, Google Gemini, local Ollama (llama3.2:3b, qwen, etc.),
self-hosted vLLM. Per-workspace model selection. Per-domain default
model. Cost tracking per request.

### 9. Privacy + Compliance

- SOC 2 Type II readiness checklist
- HIPAA mode (BAA-ready, no data to non-BAA providers)
- GDPR: right to delete, data export, consent records
- PII redaction option (names, emails, phone numbers, card numbers)
- "Do not record" detection from meeting content
- Encryption at rest and in transit
- Customer-managed encryption keys (enterprise tier)

### 10. Pricing Tiers (proposed)

- **Free**: 5 meetings/month, manual upload only, 1 user
- **Solo Pro**: $15/mo, 50 meetings, all integrations, 1 user
- **Team**: $25/user/mo, unlimited meetings, basic SSO, 5+ users
- **Business**: $45/user/mo, advanced integrations, custom templates
- **Enterprise**: custom, SSO/SCIM, BYOK, data residency, audit log

### 11. System Requirements

- Self-hosted minimum: 4 vCPU, 8GB RAM, 100GB SSD, no GPU
- Self-hosted with local Whisper: + GPU (RTX 3060 minimum)
- Self-hosted with local LLM (llama3.2:3b): same GPU works
- Cloud SaaS: managed by us, no requirements

### 12. Implementation Roadmap

Phase 1 (4 weeks): Bug fix + audit + multi-tenancy + direct upload
                  + transcription + basic extraction
Phase 2 (4 weeks): Zoom + Teams ingestion, integrations (Slack, email)
Phase 3 (4 weeks): Google Meet, Webex, calendar sync, more domains
Phase 4 (4 weeks): SSO, SCIM, audit log, billing, BYOK
Phase 5 (4 weeks): Live capture, browser extension, mobile apps
Phase 6 (ongoing): Compliance certifications, advanced analytics

For each phase, list:
- Concrete deliverables
- Database migrations needed
- New env vars
- New external service accounts required
- Estimated team size

Do NOT write implementation code yet. Just produce the plan.
```

---

## 📋 Prompt 3 — Phase 1 Implementation

**Run AFTER reviewing PLATFORM_PLAN.md.**

```
Implement Phase 1 from docs/PLATFORM_PLAN.md.

Scope:
- Multi-tenant workspace model with working "Create Enterprise" flow
- Direct audio/video upload (mp3, m4a, wav, mp4, mov, webm)
- Transcription via AssemblyAI (default) with OpenAI Whisper fallback
- Speaker diarization
- Background job queue (Celery + Redis OR FastAPI BackgroundTasks for MVP)
- Generic meeting extraction template (summary + action items + decisions)
- Email notification when processing completes
- Storage in Supabase Storage (or S3) for media files

Constraints:
- Backwards compatible with existing manual transcript paste flow
- All new env vars documented in .env.example
- Update docker-compose.dev.yml to include redis if needed
- Add at least 10 meaningful tests (pytest backend + vitest frontend)
- Update docs/ARCHITECTURE.md and docs/API.md
- Don't rename the project folder yet

Stop after Phase 1 and produce docs/PHASE1_REPORT.md with:
- What shipped
- Migration steps (DB + env)
- New external services to sign up for (with links)
- Test results
- Known issues deferred to Phase 2
```

---

## 📋 Prompt 4 — Phase 2 (Teams + Zoom + Integrations)

```
Implement Phase 2 from docs/PLATFORM_PLAN.md.

Scope:
1. Microsoft Teams ingestion via Microsoft Graph
2. Zoom ingestion via Zoom Webhooks + API
3. OAuth flows for both
4. Webhook signature verification (security)
5. Slack integration (post summaries to channel)
6. Email digest integration (SendGrid or Postmark)
7. Per-workspace integration settings UI
8. Worker scaling: dedicate workers to ingestion vs extraction

Each ingestion provider must be a plugin in backend/integrations/
implementing a common Provider interface (connect, list_meetings,
fetch_recording, fetch_transcript, handle_webhook).

Add tests including:
- Mock webhook payloads for Teams and Zoom
- OAuth callback happy-path and error-path

Produce docs/PHASE2_REPORT.md.
```

---

## 📋 Prompt 5 — Phase 3 (Google Meet, Webex, Calendar Sync)

```
Implement Phase 3 from docs/PLATFORM_PLAN.md.

Scope:
1. Google Meet ingestion via Workspace APIs
2. Cisco Webex ingestion
3. Google Calendar + Outlook Calendar sync
   - Pre-create meeting records before they start
   - Auto-link recordings to scheduled meetings
4. Domain templates: Sales call, Customer support, 1:1, Standup,
   Interview (HR), Legal review
5. Each template includes:
   - Prompt (system + user)
   - Pydantic output schema
   - Custom UI renderer in frontend
   - 2+ fixture transcripts for testing

Produce docs/PHASE3_REPORT.md.
```

---

## 📋 Prompt 6 — Phase 4 (Enterprise Features)

```
Implement Phase 4 from docs/PLATFORM_PLAN.md.

Scope:
1. SAML SSO (use a library like python-saml or fastapi-sso)
2. OIDC SSO (Okta, Azure AD, Google Workspace, generic OIDC)
3. SCIM 2.0 provisioning endpoint
4. Audit log (every mutation, immutable, exportable to CSV/SIEM)
5. Stripe billing: subscriptions, metered usage, invoice portal
6. BYOK (bring your own LLM key) — encrypted at rest
7. Usage analytics dashboard for workspace admins
8. Data export (GDPR right to portability)
9. Account deletion (GDPR right to erasure) with grace period

Produce docs/PHASE4_REPORT.md and a SECURITY.md threat model.
```

---

## 📋 Prompt 7 — Phase 5 (Live Capture + Browser Extension)

```
Implement Phase 5 from docs/PLATFORM_PLAN.md.

Scope:
1. Chrome/Edge browser extension that:
   - Detects active Meet/Teams/Zoom web meetings
   - Captures tab audio (with user consent)
   - Uploads to backend in chunks while meeting is live
   - Shows live captions overlay
2. Desktop app (Electron or Tauri) for native Teams/Zoom desktop:
   - System audio capture
   - Auto-start when meeting detected
3. Live transcription streaming
4. Post-meeting summary delivered within 60 seconds of meeting end

Note: Live capture has legal implications (consent recording laws
vary by jurisdiction). Add a clear consent banner and per-region
config to disable in two-party-consent states.

Produce docs/PHASE5_REPORT.md and docs/LEGAL_RECORDING_NOTES.md.
```

---

## 🛠️ Tech Stack Recommendations

### Backend additions
```txt
# Add to requirements.txt
celery==5.4.0
redis==5.2.0
boto3==1.35.0                    # for S3 if not using Supabase Storage
assemblyai==0.34.0
deepgram-sdk==3.7.0              # alternative transcriber
openai==1.57.0                   # for Whisper API + GPT
anthropic==0.39.0                # KEEP — your README says Claude
microsoft-graph-core==1.0.0      # for Teams
google-api-python-client==2.150.0  # for Google Meet
twilio==9.3.0                    # for phone call ingestion
stripe==11.1.0                   # for billing
sendgrid==6.11.0                 # for email
slack-sdk==3.33.0                # for Slack integration
python-saml==1.16.0              # for enterprise SSO
cryptography==43.0.0             # for BYOK encryption
sentry-sdk[fastapi]==2.18.0      # error tracking
prometheus-fastapi-instrumentator==7.0.0  # metrics
pyjwt==2.10.0
tenacity==9.0.0                  # retry logic
```

### Frontend additions
```json
// add to package.json
{
  "@tanstack/react-query": "^5.59.0",
  "react-dropzone": "^14.2.10",
  "wavesurfer.js": "^7.8.0",
  "react-player": "^2.16.0",
  "@stripe/stripe-js": "^4.10.0",
  "@stripe/react-stripe-js": "^2.9.0",
  "posthog-js": "^1.180.0",
  "react-intersection-observer": "^9.13.0",
  "date-fns": "^4.1.0",
  "zod": "^3.23.0"
}
```

### New external services to sign up for
| Service | Why | Free tier? |
|---------|-----|-----------|
| AssemblyAI | Transcription | Yes — limited |
| Deepgram | Transcription fallback | Yes — $200 credit |
| Microsoft Azure | Teams Graph API access | Yes — dev tenant |
| Zoom Marketplace | Server-to-Server OAuth app | Yes |
| Google Cloud | Meet + Workspace APIs | Yes — limited |
| Twilio | Phone call ingestion | Yes — trial |
| SendGrid / Postmark | Email | Yes — limited |
| Slack | Bot app | Yes |
| Stripe | Billing | No fees until $$ flows |
| Sentry | Error tracking | Yes — 5k events/mo |
| PostHog | Product analytics | Yes — 1M events/mo |

### Infrastructure
- **Object storage**: Supabase Storage (start) → S3 (scale)
- **Queue**: Redis + Celery
- **Search**: Postgres full-text first → Meilisearch / Typesense if needed
- **CDN**: Cloudflare in front of media
- **Deployment**: Railway (backend) + Vercel (frontend) for SaaS, Docker Compose for self-hosted

---

## 🎨 New `CLAUDE.md` Working Rules (paste into your existing CLAUDE.md)

```markdown
## Working Rules for Claude Code on This Project

1. **Never** make multi-file changes without first producing a plan
   in docs/ that the user reviews.
2. **Always** trace a bug to root cause before fixing. Don't add
   defensive try/catch that hides errors.
3. Every new feature needs at least 2 tests before merge.
4. Every new external service needs an entry in .env.example with a
   comment explaining what it's for and where to get the key.
5. Every database change needs a Supabase migration file, never raw
   ALTER TABLE in code.
6. Update docs/ARCHITECTURE.md and docs/API.md alongside code, not after.
7. Each phase ends with a PHASE_N_REPORT.md before moving to the next.
8. Backwards compatibility: existing endpoints keep working until
   a deprecation cycle is documented in RELEASE_NOTES.md.
9. Webhook handlers MUST verify signatures before processing.
10. PII (emails, phone numbers, names) must be redactable on request.
11. When in doubt about scope, stop and ask. Do not guess.
```

---

## 📊 Success Metrics to Track

Once Phase 2 is live, instrument these from day one:

- Time from "meeting ends" to "summary delivered" (target: <60s)
- Transcription accuracy (sample 10 meetings/week, manual check)
- Action item precision (% that users keep without editing)
- Channel reliability (% of recordings ingested without manual retry)
- Cost per meeting processed (transcription + LLM)
- User activation: did they connect at least one channel in week 1?
- Retention: are they still using it in week 4?

---

## ⚖️ Important Legal Caveats

You're moving into territory with real legal implications:

1. **Recording consent laws** — Two-party-consent states (CA, FL, IL,
   etc.) and countries (Germany, etc.) require all parties to consent.
   Build consent banners and per-region toggles.
2. **HIPAA** — If healthcare customers record patient calls, you need
   a Business Associate Agreement (BAA) with every sub-processor
   (transcription, LLM, hosting).
3. **GDPR** — EU customers need data residency options and standard
   contractual clauses with US sub-processors.
4. **SOC 2** — Enterprise customers will ask. Plan for it from
   architecture day one (audit logs, access controls, encryption).
5. **AI disclosure** — Some jurisdictions (e.g. EU AI Act, Colorado)
   require disclosure when AI is used in employment decisions —
   relevant for the HR/interview template.

These aren't blockers for shipping, but pretending they don't exist
will hurt you at the first enterprise sale. Talk to a lawyer before
launching paid tiers.

---

## ✅ Suggested Order of Operations

1. **Today**: Run Prompt 0 (fix create-enterprise bug) + Prompt 1 (audit)
2. **This week**: Review AUDIT.md, run Prompt 2, review PLATFORM_PLAN.md
3. **Weeks 1-4**: Phase 1
4. **Weeks 5-8**: Phase 2 (Teams + Zoom = biggest customer demand)
5. **Weeks 9-12**: Phase 3 (Meet + Webex + calendar)
6. **Weeks 13-16**: Phase 4 (enterprise features unlock paid tiers)
7. **Weeks 17-20**: Phase 5 (live capture)
8. **Weeks 21+**: Compliance, mobile apps, advanced analytics

Don't try to do all of this in one prompt. The reason your "Create
Enterprise" button is silently broken is exactly the kind of failure
that compounds when scope outpaces verification. Phased delivery with
working software at each step is what gets you to a product real
businesses will pay for.

---

*Generated as a planning artifact. Adjust phases based on your team
size and customer demand signals.*


Prompt: Expand Industry Domain Coverage

Use this prompt when you want Claude Code to add more industry contexts to your meeting intelligence platform beyond the 9 you already have:
General Business, Technology / IT, Healthcare / Hospital, Finance / Banking, Education, Sales & Marketing, Legal / Compliance, Human Resources, Real Estate.


🎯 The Prompt (paste this into Claude Code)
Expand the industry domain coverage of this application beyond the
existing 9 (General Business, Technology / IT, Healthcare / Hospital,
Finance / Banking, Education, Sales & Marketing, Legal / Compliance,
Human Resources, Real Estate).

Add the following 24 additional industries. For EACH industry, create
a complete domain plugin with the same structure used by the existing
domains. If a domain plugin pattern doesn't yet exist, first create
one (config + prompt template + Pydantic output schema + frontend
icon + frontend renderer), then add the new domains using it.

### New industries to add (with focus and key extraction targets):

1. **Manufacturing & Operations**
   - Production line meetings, OEE reviews, quality circles
   - Extract: production targets, downtime causes, defect rates,
     safety incidents, capex requests

2. **Construction & Engineering**
   - Site meetings, RFIs, change orders, safety toolbox talks
   - Extract: milestones, blockers, safety issues, cost variances,
     subcontractor commitments

3. **Retail & E-commerce**
   - Store ops, merchandising, vendor reviews, peak-season planning
   - Extract: sales targets, inventory issues, promotions, store-level
     KPIs, vendor SLAs

4. **Logistics & Supply Chain**
   - Carrier reviews, S&OP meetings, warehouse ops syncs
   - Extract: on-time delivery rates, capacity constraints, freight
     cost issues, supplier risks

5. **Hospitality & Tourism**
   - Hotel ops, F&B reviews, guest experience standups
   - Extract: occupancy, ADR/RevPAR mentions, guest complaints,
     event bookings, staffing gaps

6. **Media & Entertainment**
   - Editorial meetings, production standups, content planning
   - Extract: story assignments, deadlines, talent commitments,
     budget items, distribution dates

7. **Government & Public Sector**
   - Council meetings, agency syncs, public hearings
   - Extract: motions, votes, public comments, compliance items,
     budget allocations
   - Note: Often requires verbatim record + structured summary

8. **Non-Profit & NGO**
   - Board meetings, donor reviews, program updates
   - Extract: program outcomes, donor commitments, grant deadlines,
     volunteer needs, governance items

9. **Pharmaceutical & Life Sciences**
   - R&D reviews, clinical trial syncs, regulatory prep
   - Extract: study endpoints, AE reports, regulatory milestones,
     IP discussions
   - Note: HIPAA + GxP compliance flags required

10. **Insurance**
    - Claims review, underwriting committee, broker meetings
    - Extract: claim decisions, underwriting rules, policy changes,
     fraud flags, reserve adjustments

11. **Energy & Utilities**
    - Plant ops, grid coordination, regulatory filings
    - Extract: outage reports, load forecasts, compliance items,
     asset performance, environmental incidents

12. **Mining & Resources**
    - Production meetings, safety reviews, exploration updates
    - Extract: tonnage, grade, safety incidents, permit status,
     equipment downtime

13. **Agriculture & Agritech**
    - Crop reviews, supplier syncs, cooperative meetings
    - Extract: yield forecasts, weather impacts, input costs,
     supplier commitments, certification items

14. **Automotive**
    - Plant ops, dealer reviews, engineering design reviews
    - Extract: production volumes, recall items, supplier issues,
     warranty data, design decisions

15. **Aerospace & Defense**
    - Program reviews, supplier syncs, compliance gates
    - Extract: program milestones, ITAR/export-control flags,
     test results, risks
    - Note: Often classified — add a "do not auto-publish" flag

16. **Telecommunications**
    - Network ops, outage postmortems, carrier negotiations
    - Extract: incident timelines, SLA breaches, capex items,
     spectrum/regulatory mentions

17. **Architecture & Design**
    - Client design reviews, charrettes, contractor coordination
    - Extract: design decisions, client approvals, change requests,
     deliverable dates

18. **Legal Tech & Litigation**
    - Case strategy, depositions, discovery reviews
    - Extract: case milestones, exhibits referenced, witness
     commitments, motion deadlines
    - Note: Privileged content — add confidentiality marker

19. **Accounting & Audit**
    - Audit planning, fieldwork syncs, client meetings
    - Extract: audit risks, control deficiencies, adjustments,
     management responses, deadlines

20. **Cybersecurity & InfoSec**
    - Incident response, threat intel briefings, security reviews
    - Extract: incidents, IOCs mentioned, remediation owners,
     compliance gaps, vendor risks

21. **Customer Support / Service Operations**
    - Escalation reviews, voice-of-customer sessions, QBRs
    - Extract: top issues, churn signals, tooling gaps, SLA
     performance, training needs

22. **Sports & Athletics**
    - Coaching meetings, scouting reports, training reviews
    - Extract: player assignments, training plans, injury status,
     scouting decisions, match prep items

23. **Fitness & Wellness**
    - Studio ops, trainer syncs, member reviews
    - Extract: class schedules, member retention items,
     equipment issues, certification renewals

24. **Creative Agencies**
    - Client kickoffs, creative reviews, account syncs
    - Extract: brief approvals, deliverables, client feedback,
     scope changes, billable hours flags

### Implementation requirements

For each new domain:

1. **Backend plugin** at backend/app/domains/<domain_slug>/:
   - prompt.py — system + user prompt templates with industry-specific
     vocabulary and extraction targets
   - schema.py — Pydantic model for the structured output
   - fixtures/ — at least 2 example transcripts and expected outputs
     for testing
   - tests/ — pytest tests using the fixtures

2. **Domain registry update**: register the new plugin in the central
   domain registry so it appears in API responses and the UI dropdown.

3. **Frontend integration**:
   - Icon (use lucide-react icons; pick something semantically relevant)
   - Color theme entry
   - Custom renderer if the output schema differs meaningfully from
     the generic one
   - Searchable/filterable industry picker (24 + 9 = 33 industries
     is too many for a flat dropdown — use grouped categories or
     search)

4. **Industry grouping** — group the full list of 33 industries into
   meta-categories for the UI:
   - Operations & Industrial (Manufacturing, Construction, Logistics,
     Mining, Agriculture, Automotive, Aerospace, Energy)
   - Professional Services (Legal, Accounting, Consulting, Architecture,
     Creative Agencies)
   - Health & Life Sciences (Healthcare, Pharma, Fitness)
   - Financial Services (Finance, Insurance, Accounting/Audit)
   - Technology & Cyber (IT, Cybersecurity, Telecom)
   - People & Talent (HR, Education, Sports/Athletics)
   - Customer-Facing (Sales, Marketing, Customer Support, Retail,
     Hospitality, Real Estate)
   - Media & Public (Media, Government, Non-Profit)
   - Generic (General Business)

5. **Compliance flags per domain**: where regulatory context applies
   (Healthcare→HIPAA, Pharma→GxP, Finance→SOX/PCI, Aerospace→ITAR,
   Government→FOIA, etc.), set a `compliance_tags` field on the
   domain config so downstream features (retention, redaction,
   export rules) can react.

6. **Documentation**: update docs/DOMAINS.md with a table of every
   domain, its extraction targets, and its compliance flags.

7. **Tests**: a single integration test that loops every registered
   domain, runs a smoke transcript through it, and asserts the
   output validates against the domain's Pydantic schema.

### Constraints

- Backwards compatible — existing 9 domains keep working unchanged
- One commit per logical concern (e.g. "add manufacturing domain"
  is one commit, "add UI grouping" is another)
- Don't hardcode the list anywhere — drive everything from the
  domain registry
- Each prompt template should be tunable without code changes
  (store templates in the database with a "system default" seed)

### Stretch goals (mention in your final report, don't build yet)

- Per-tenant custom domains (workspace admin can clone and edit
  a template for their specific niche, e.g. "dental practice"
  cloned from Healthcare)
- Community template marketplace
- Multi-language prompt variants per domain (English, Spanish,
  Hindi, Japanese, German, French to start)

### Deliverables

When done, produce docs/INDUSTRY_EXPANSION_REPORT.md with:
- Full list of 33 domains and their slugs
- Compliance tag matrix
- Test results
- Screenshots / descriptions of the new grouped UI picker
- Migration steps if any DB changes are needed
- Anything you deferred or left as a TODO

📊 Quick Reference: 33 Industries Total
After running this prompt, your platform will support these grouped industries:
Operations & Industrial
Manufacturing & Operations · Construction & Engineering · Logistics & Supply Chain · Mining & Resources · Agriculture & Agritech · Automotive · Aerospace & Defense · Energy & Utilities
Professional Services
Legal / Compliance · Legal Tech & Litigation · Accounting & Audit · Architecture & Design · Creative Agencies
Health & Life Sciences
Healthcare / Hospital · Pharmaceutical & Life Sciences · Fitness & Wellness
Financial Services
Finance / Banking · Insurance
Technology & Cyber
Technology / IT · Cybersecurity & InfoSec · Telecommunications
People & Talent
Human Resources · Education · Sports & Athletics
Customer-Facing
Sales & Marketing · Customer Support / Service Operations · Retail & E-commerce · Hospitality & Tourism · Real Estate
Media & Public
Media & Entertainment · Government & Public Sector · Non-Profit & NGO
Generic
General Business

💡 Tips

Don't try to add all 24 in one go if your team is small. Start with the 6-8 with the strongest customer demand signals.
Check what your actual users ask for — if 80% are in 3 industries, polish those before expanding to 33.
Compliance tags matter early — adding HIPAA / GxP / ITAR / SOX flags now is much cheaper than retrofitting later when an enterprise customer asks.
The grouped UI is critical — a flat dropdown of 33 items is unusable. Either grouped accordion, search-first picker, or "your top 5 + browse all" pattern.