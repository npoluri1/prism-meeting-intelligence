-- Prism v4b — Add missing organization columns
-- Run this if you previously ran migration_v2.sql (not full_setup_v2.sql).
-- Safe to re-run — all statements are idempotent.

-- Add columns the old migration_v2.sql missed
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS industry TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS size     TEXT NOT NULL DEFAULT 'small'
    CHECK (size IN ('solo','small','medium','large','enterprise')),
  ADD COLUMN IF NOT EXISTS website  TEXT;

-- Add meetings columns that full_setup_v2.sql would have added
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS industry    TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS meeting_date DATE,
  ADD COLUMN IF NOT EXISTS location    TEXT,
  ADD COLUMN IF NOT EXISTS attendees   JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS template_id UUID;

-- Create meeting_templates if missing
CREATE TABLE IF NOT EXISTS public.meeting_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  industry        TEXT NOT NULL DEFAULT 'general',
  name            TEXT NOT NULL,
  description     TEXT,
  prompt_hint     TEXT,
  fields          JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, industry, is_system)
);

ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'meeting_templates'
      AND policyname = 'Anyone can read system templates'
  ) THEN
    CREATE POLICY "Anyone can read system templates"
      ON public.meeting_templates FOR SELECT USING (is_system = true);
  END IF;
END $$;

-- Create action_items table if missing
CREATE TABLE IF NOT EXISTS public.action_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  task        TEXT NOT NULL,
  owner       TEXT NOT NULL DEFAULT 'Unassigned',
  due_date    DATE,
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','done','cancelled')),
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high','urgent')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'action_items'
      AND policyname = 'Users access own action items'
  ) THEN
    CREATE POLICY "Users access own action items"
      ON public.action_items
      USING (meeting_id IN (
        SELECT id FROM public.meetings WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
