-- File: supabase/schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- profiles
-- Auto-populated via trigger on auth.users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- meetings
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meetings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    transcript  TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'done', 'error')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meetings_user_id_idx ON public.meetings(user_id);
CREATE INDEX IF NOT EXISTS meetings_created_at_idx ON public.meetings(created_at DESC);

-- ─────────────────────────────────────────────
-- notes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id    UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    summary       TEXT,
    action_items  JSONB NOT NULL DEFAULT '[]'::JSONB,
    decisions     JSONB NOT NULL DEFAULT '[]'::JSONB,
    raw_response  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_meeting_id_idx ON public.notes(meeting_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes    ENABLE ROW LEVEL SECURITY;

-- meetings policies
CREATE POLICY "Users can view their own meetings"
    ON public.meetings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meetings"
    ON public.meetings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meetings"
    ON public.meetings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meetings"
    ON public.meetings FOR DELETE
    USING (auth.uid() = user_id);

-- notes policies (joined through meetings)
CREATE POLICY "Users can view their own notes"
    ON public.notes FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM public.meetings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own notes"
    ON public.notes FOR INSERT
    WITH CHECK (
        meeting_id IN (
            SELECT id FROM public.meetings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own notes"
    ON public.notes FOR UPDATE
    USING (
        meeting_id IN (
            SELECT id FROM public.meetings WHERE user_id = auth.uid()
        )
    );

-- ─────────────────────────────────────────────
-- Trigger: auto-create profile on user signup
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();