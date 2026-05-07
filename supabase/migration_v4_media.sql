-- Prism v4 — Media Upload + Source Tracking
-- Run in Supabase SQL editor after migration_v3_calendar.sql
-- Idempotent (safe to re-run)

-- Make transcript nullable (audio uploads don't have a transcript at insert time)
ALTER TABLE public.meetings
  ALTER COLUMN transcript DROP NOT NULL;

-- Add media/source fields
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS media_url   TEXT,
  ADD COLUMN IF NOT EXISTS media_type  TEXT,
  ADD COLUMN IF NOT EXISTS source      TEXT NOT NULL DEFAULT 'transcript'
    CHECK (source IN ('transcript','upload','zoom','teams','meet','webex','phone','email'));

CREATE INDEX IF NOT EXISTS meetings_source_idx ON public.meetings(source);
