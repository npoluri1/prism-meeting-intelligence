-- Prism v3 — Calendar & Scheduling
-- Run in Supabase SQL editor after full_setup_v2.sql
-- Idempotent (safe to re-run)

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop existing calendar policies if re-running
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN DROP POLICY IF EXISTS "Users manage own scheduled meetings"      ON public.scheduled_meetings;       EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Org members can view org scheduled meetings" ON public.scheduled_meetings;    EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users manage own calendar integrations"   ON public.calendar_integrations;    EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Scheduled meetings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheduled_meetings (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id      UUID        REFERENCES public.organizations(id) ON DELETE CASCADE,
  title                TEXT        NOT NULL,
  description          TEXT,
  scheduled_at         TIMESTAMPTZ NOT NULL,
  duration_min         INT         NOT NULL DEFAULT 60,
  timezone             TEXT        NOT NULL DEFAULT 'UTC',
  location             TEXT,
  meeting_url          TEXT,
  platform             TEXT        NOT NULL DEFAULT 'general'
                         CHECK (platform IN ('general','zoom','teams','meet','webex','phone','in_person')),
  industry             TEXT        NOT NULL DEFAULT 'general',
  template_id          UUID,
  attendee_emails      JSONB       NOT NULL DEFAULT '[]',
  status               TEXT        NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  meeting_id           UUID        REFERENCES public.meetings(id) ON DELETE SET NULL,
  recurrence_rule      TEXT,       -- iCal RRULE e.g. FREQ=WEEKLY;BYDAY=MO,WE
  recurrence_parent_id UUID        REFERENCES public.scheduled_meetings(id) ON DELETE CASCADE,
  recurrence_end_date  DATE,
  reminder_minutes     INT[]       DEFAULT ARRAY[30],
  external_event_id    TEXT,       -- Google / Outlook calendar event ID
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sm_user_id_idx  ON public.scheduled_meetings(user_id);
CREATE INDEX IF NOT EXISTS sm_org_id_idx   ON public.scheduled_meetings(organization_id);
CREATE INDEX IF NOT EXISTS sm_sched_at_idx ON public.scheduled_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS sm_status_idx   ON public.scheduled_meetings(status);
CREATE INDEX IF NOT EXISTS sm_parent_idx   ON public.scheduled_meetings(recurrence_parent_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Calendar integrations (Google, Outlook, Apple)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID        REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider        TEXT        NOT NULL CHECK (provider IN ('google','microsoft','apple')),
  external_email  TEXT,
  calendar_id     TEXT,
  auto_import     BOOLEAN     NOT NULL DEFAULT true,
  auto_create     BOOLEAN     NOT NULL DEFAULT true,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  sync_token      TEXT,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.scheduled_meetings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled meetings"
  ON public.scheduled_meetings FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Org members can view org scheduled meetings"
  ON public.scheduled_meetings FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own calendar integrations"
  ON public.calendar_integrations FOR ALL
  USING (user_id = auth.uid());
