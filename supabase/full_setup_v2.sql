-- ═══════════════════════════════════════════════════════════════════════════
-- MeetingMind v2 — Single-shot idempotent setup
-- Safe to run on a fresh project OR re-run on an existing one.
-- Each DROP is in its own exception block so a missing table never aborts.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — Drop every policy that might already exist.
--          Each statement is isolated; a "table does not exist" error is caught
--          silently and the script continues.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN DROP POLICY IF EXISTS "Members can view their organizations"   ON public.organizations;        EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Members can update their organizations" ON public.organizations;        EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Members can view their org members"     ON public.organization_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Members can view org members"           ON public.organization_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users see own memberships"              ON public.organization_members; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Org members can view org meetings"      ON public.meetings;             EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Org members can insert org meetings"    ON public.meetings;             EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Org members can update org meetings"    ON public.meetings;             EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Org members can delete org meetings"    ON public.meetings;             EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Org members can view org notes"         ON public.notes;                EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Org members can insert org notes"       ON public.notes;                EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Anyone can read system templates"       ON public.meeting_templates;    EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users access own action items"          ON public.action_items;         EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Users manage own categories"            ON public.meeting_categories;   EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — Create tables (all guarded with IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  plan       TEXT        NOT NULL DEFAULT 'free'
               CHECK (plan IN ('free','pro','enterprise')),
  industry   TEXT        NOT NULL DEFAULT 'general',
  size       TEXT        NOT NULL DEFAULT 'small'
               CHECK (size IN ('solo','small','medium','large','enterprise')),
  website    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner','admin','member')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON public.organization_members(user_id);

-- Add new columns to meetings (safe; ignored if column already exists)
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS industry        TEXT        NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS meeting_date    DATE,
  ADD COLUMN IF NOT EXISTS location        TEXT,
  ADD COLUMN IF NOT EXISTS attendees       JSONB       DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS template_id     UUID;
CREATE INDEX IF NOT EXISTS meetings_org_id_idx ON public.meetings(organization_id);

CREATE TABLE IF NOT EXISTS public.meeting_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        REFERENCES public.organizations(id) ON DELETE CASCADE,
  industry        TEXT        NOT NULL DEFAULT 'general',
  name            TEXT        NOT NULL,
  description     TEXT,
  prompt_hint     TEXT,
  fields          JSONB       NOT NULL DEFAULT '[]'::JSONB,
  is_system       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, industry, is_system)   -- prevents duplicate seeds on re-run
);

CREATE TABLE IF NOT EXISTS public.action_items (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID        NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  task       TEXT        NOT NULL,
  owner      TEXT        NOT NULL DEFAULT 'Unassigned',
  due_date   DATE,
  status     TEXT        NOT NULL DEFAULT 'open'
               CHECK (status   IN ('open','in_progress','done','cancelled')),
  priority   TEXT        NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('low','medium','high','urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS action_items_meeting_id_idx ON public.action_items(meeting_id);

CREATE TABLE IF NOT EXISTS public.meeting_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id)      ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#6366f1',
  icon            TEXT          DEFAULT '📋'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3 — Enable RLS on every table that needs it
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_categories   ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4 — Create policies (clean after Step 1 drops)
-- ─────────────────────────────────────────────────────────────────────────────

-- Organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can update their organizations"
  ON public.organizations FOR UPDATE
  USING (id IN (
    SELECT organization_id FROM public.organization_members
    WHERE  user_id = auth.uid() AND role IN ('owner','admin')
  ));

-- Organization members: non-recursive — only own row visible
-- (backend uses service-role admin headers for cross-member queries)
CREATE POLICY "Users see own memberships"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Templates: system templates visible to all authenticated users
CREATE POLICY "Anyone can read system templates"
  ON public.meeting_templates FOR SELECT
  USING (is_system = true);

-- Action items: full access to items belonging to the user's own meetings
CREATE POLICY "Users access own action items"
  ON public.action_items FOR ALL
  USING (meeting_id IN (
    SELECT id FROM public.meetings WHERE user_id = auth.uid()
  ));

-- Categories
CREATE POLICY "Users manage own categories"
  ON public.meeting_categories FOR ALL
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5 — Seed 31 system meeting templates
--          UNIQUE(name, industry, is_system) + ON CONFLICT DO NOTHING
--          means re-runs never create duplicates.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.meeting_templates (industry, name, description, prompt_hint, is_system) VALUES

  -- General
  ('general',    'General Meeting',          'Standard business meeting',          '',                                                                          true),
  ('general',    'Brainstorming Session',     'Idea generation',                    'Focus on creative ideas and concepts discussed.',                           true),
  ('general',    'Weekly Standup',            'Team status update',                 'Extract blockers, progress updates, and sprint goals.',                     true),
  ('general',    'Retrospective',             'Team retrospective',                 'What went well, what to improve, and action items.',                        true),

  -- Technology / IT
  ('it',         'Sprint Planning',           'Agile sprint planning',              'Extract user stories, story points, sprint goals, and technical tasks.',    true),
  ('it',         'Architecture Review',       'Technical architecture discussion',  'Focus on ADRs, trade-offs, and tech debt.',                                 true),
  ('it',         'Incident Postmortem',       'Post-incident analysis',             'Extract root cause, timeline, impact, and prevention actions.',             true),
  ('it',         'Code Review Discussion',    'Code review feedback',               'Extract code quality, security issues, and improvement tasks.',             true),
  ('it',         'Product Roadmap',           'Product planning and roadmap',       'Extract feature priorities, timelines, and technical dependencies.',        true),

  -- Healthcare / Hospital
  ('healthcare', 'Clinical Rounds',           'Daily patient rounds notes',         'Extract patient case updates, treatment decisions, and follow-up orders.',  true),
  ('healthcare', 'Case Conference',           'Multi-disciplinary case review',     'Extract diagnosis discussions, care plan decisions, and referrals.',        true),
  ('healthcare', 'Department Meeting',        'Healthcare department meeting',      'Focus on patient outcomes, compliance items, and staff actions.',           true),
  ('healthcare', 'Quality Improvement',       'Clinical quality review',            'Extract KPIs, improvement actions, and compliance decisions.',              true),

  -- Finance / Banking
  ('finance',    'Board Meeting',             'Board of directors meeting',         'Extract board resolutions, strategic decisions, and fiduciary actions.',    true),
  ('finance',    'Investment Committee',      'Investment review and decisions',    'Extract investment decisions, risk assessments, and portfolio actions.',     true),
  ('finance',    'Quarterly Business Review', 'QBR with financial review',          'Extract financial performance, forecasts, budget decisions, and pivots.',   true),
  ('finance',    'Audit Meeting',             'Internal or external audit review',  'Extract audit findings, compliance gaps, and remediation actions.',         true),

  -- Education
  ('education',  'Faculty Meeting',           'Academic faculty meeting',           'Extract curriculum decisions, student policy changes, departmental items.', true),
  ('education',  'Student Progress Review',   'Student performance discussion',     'Extract student progress, support actions, and parent communication.',      true),
  ('education',  'Curriculum Planning',       'Course and program planning',        'Extract learning objectives, resource needs, and timeline decisions.',      true),

  -- Sales & Marketing
  ('sales',      'Sales Pipeline Review',     'Sales team pipeline discussion',     'Extract deal statuses, objections, next steps, and revenue forecasts.',     true),
  ('sales',      'Client Kickoff',            'New client onboarding meeting',      'Extract client goals, success metrics, project scope, and next steps.',     true),
  ('sales',      'Marketing Strategy',        'Marketing planning session',         'Extract campaign plans, budget allocations, KPIs, and channel strategies.', true),
  ('sales',      'Account Review',            'Customer account health check',      'Extract satisfaction scores, upsell opportunities, and risk indicators.',   true),

  -- Legal / Compliance
  ('legal',      'Legal Review',              'Contract or compliance review',      'Extract legal risks, contract terms, and compliance requirements.',         true),
  ('legal',      'Compliance Audit',          'Regulatory compliance meeting',      'Extract regulatory findings, remediation plans, and compliance deadlines.', true),

  -- Human Resources
  ('hr',         'Performance Review',        'Employee performance discussion',    'Extract performance ratings, development goals, and feedback points.',      true),
  ('hr',         'Hiring Committee',          'Candidate evaluation meeting',       'Extract candidate scores, hiring decisions, and interview feedback.',       true),
  ('hr',         'All Hands Meeting',         'Company-wide meeting',               'Extract key announcements, strategic updates, and employee Q&A themes.',    true),

  -- Real Estate / Construction
  ('realestate', 'Project Status Meeting',    'Construction project update',        'Extract milestone progress, blockers, budget updates, contractor actions.', true),
  ('realestate', 'Property Review',           'Real estate property discussion',    'Extract valuations, investment decisions, and market analysis.',            true)

ON CONFLICT (name, industry, is_system) DO NOTHING;
