-- MeetingMind v2 Migration
-- Run this in the Supabase SQL editor: https://app.supabase.com/project/srfgzwpnebqlnravtift/sql

-- ─────────────────────────────────────────────
-- Organizations
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  plan       TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Organization members
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON public.organization_members(user_id);

-- ─────────────────────────────────────────────
-- Add organization_id to meetings
-- ─────────────────────────────────────────────
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS meetings_org_id_idx ON public.meetings(organization_id);

-- ─────────────────────────────────────────────
-- RLS: organizations
-- ─────────────────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their organizations"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─────────────────────────────────────────────
-- RLS: organization_members
-- ─────────────────────────────────────────────
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org members"
  ON public.organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- Meetings: add org-scoped policy
-- ─────────────────────────────────────────────
CREATE POLICY "Org members can view org meetings"
  ON public.meetings FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert org meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL AND
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update org meetings"
  ON public.meetings FOR UPDATE
  USING (
    organization_id IS NOT NULL AND
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );


CREATE POLICY "Org members can delete org meetings"
  ON public.meetings FOR DELETE
  USING (
    organization_id IS NOT NULL AND
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- Notes: add org-scoped policy
-- ─────────────────────────────────────────────
CREATE POLICY "Org members can view org notes"
  ON public.notes FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Org members can insert org notes"
  ON public.notes FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
