// ── Core meeting types ────────────────────────────────────────────────────────

export interface ActionItem {
  task: string
  owner: string
}

export interface Notes {
  id: string
  summary: string | null
  action_items: ActionItem[]
  decisions: string[]
  risks_and_blockers: string[]
  next_meeting_agenda: string[]
  key_topics: string[]
  participants: string[]
  meeting_sentiment: { score: number; notes: string } | null
  created_at: string
}

export type MeetingSource = 'transcript' | 'upload' | 'zoom' | 'teams' | 'meet' | 'webex' | 'phone' | 'email'

export interface Meeting {
  id: string
  title: string
  status: 'pending' | 'processing' | 'done' | 'error'
  created_at: string
  organization_id: string | null
  industry: string | null
  source: MeetingSource | null
  media_url: string | null
}

export interface DomainCategory {
  key: string
  label: string
  domains: { slug: string; name: string }[]
}

export interface MeetingWithNotes extends Meeting {
  meeting_date: string | null
  location: string | null
  attendees: string[] | null
  notes: Notes | null
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface CreateMeetingInput {
  title: string
  transcript: string
  organization_id?: string | null
  industry?: string
  meeting_date?: string
  location?: string
  attendees?: string[]
  template_id?: string
}

// ── Organization types ────────────────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  industry: string
  size: string
  website?: string
  created_at: string
  role?: string
}

export interface OrgMember {
  user_id: string
  email: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export interface MeetingTemplate {
  id: string
  industry: string
  name: string
  description: string | null
  prompt_hint: string | null
  fields: unknown[]
}

// ── Action item types ─────────────────────────────────────────────────────────

export interface ActionItemRecord {
  id: string
  meeting_id: string
  task: string
  owner: string
  due_date: string | null
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface Analytics {
  total_meetings: number
  done: number
  processing: number
  pending: number
  action_items_open: number
  action_items_done: number
  by_industry: Record<string, number>
}

// ── Calendar / Scheduled meetings ─────────────────────────────────────────────

export type MeetingPlatform = 'general' | 'zoom' | 'teams' | 'meet' | 'webex' | 'phone' | 'in_person'
export type ScheduledMeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'

export interface ScheduledMeeting {
  id: string
  user_id: string
  organization_id: string | null
  title: string
  description: string | null
  scheduled_at: string
  duration_min: number
  timezone: string
  location: string | null
  meeting_url: string | null
  platform: MeetingPlatform
  industry: string
  template_id: string | null
  attendee_emails: string[]
  status: ScheduledMeetingStatus
  meeting_id: string | null
  recurrence_rule: string | null
  recurrence_parent_id: string | null
  recurrence_end_date: string | null
  reminder_minutes: number[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateScheduledMeetingInput {
  title: string
  scheduled_at: string
  duration_min?: number
  timezone?: string
  description?: string
  location?: string
  meeting_url?: string
  platform?: MeetingPlatform
  industry?: string
  template_id?: string
  attendee_emails?: string[]
  organization_id?: string | null
  recurrence_rule?: string | null
  recurrence_end_date?: string | null
  reminder_minutes?: number[]
  notes?: string
}

export interface UpdateScheduledMeetingInput extends Partial<CreateScheduledMeetingInput> {
  status?: ScheduledMeetingStatus
}

export interface CalendarIntegration {
  id: string
  user_id: string
  provider: 'google' | 'microsoft' | 'apple'
  external_email: string | null
  calendar_id: string | null
  auto_import: boolean
  auto_create: boolean
  is_active: boolean
  last_synced_at: string | null
  created_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const INDUSTRIES: { value: string; label: string; icon: string }[] = [
  // Generic
  { value: 'general',          label: 'General Business',               icon: '🏢' },
  // Technology & Cyber
  { value: 'it',               label: 'Technology / IT',                icon: '💻' },
  { value: 'cybersecurity',    label: 'Cybersecurity & InfoSec',        icon: '🛡️' },
  { value: 'telecom',          label: 'Telecommunications',             icon: '📡' },
  // Health & Life Sciences
  { value: 'healthcare',       label: 'Healthcare / Hospital',          icon: '🏥' },
  { value: 'pharma',           label: 'Pharmaceutical & Life Sciences', icon: '🔬' },
  { value: 'fitness',          label: 'Fitness & Wellness',             icon: '💪' },
  // Financial Services
  { value: 'finance',          label: 'Finance / Banking',              icon: '💰' },
  { value: 'insurance',        label: 'Insurance',                      icon: '🛟' },
  { value: 'accounting',       label: 'Accounting & Audit',             icon: '🧾' },
  // Professional Services
  { value: 'legal',            label: 'Legal / Compliance',             icon: '⚖️' },
  { value: 'legaltech',        label: 'Legal Tech & Litigation',        icon: '🗂️' },
  { value: 'architecture',     label: 'Architecture & Design',          icon: '📐' },
  { value: 'creative_agency',  label: 'Creative Agencies',              icon: '🎨' },
  // People & Talent
  { value: 'hr',               label: 'Human Resources',                icon: '👥' },
  { value: 'education',        label: 'Education',                      icon: '🎓' },
  { value: 'sports',           label: 'Sports & Athletics',             icon: '🏆' },
  // Customer-Facing
  { value: 'sales',            label: 'Sales & Marketing',              icon: '📈' },
  { value: 'customer_support', label: 'Customer Support / Service Ops', icon: '🎧' },
  { value: 'retail',           label: 'Retail & E-commerce',            icon: '🛒' },
  { value: 'hospitality',      label: 'Hospitality & Tourism',          icon: '🏨' },
  { value: 'realestate',       label: 'Real Estate',                    icon: '🏗️' },
  // Operations & Industrial
  { value: 'manufacturing',    label: 'Manufacturing & Operations',     icon: '🏭' },
  { value: 'construction',     label: 'Construction & Engineering',     icon: '🔨' },
  { value: 'logistics',        label: 'Logistics & Supply Chain',       icon: '🚚' },
  { value: 'mining',           label: 'Mining & Resources',             icon: '⛏️' },
  { value: 'agriculture',      label: 'Agriculture & Agritech',         icon: '🌾' },
  { value: 'automotive',       label: 'Automotive',                     icon: '🚗' },
  { value: 'aerospace',        label: 'Aerospace & Defense',            icon: '🚀' },
  { value: 'energy',           label: 'Energy & Utilities',             icon: '⚡' },
  // Media & Public
  { value: 'media',            label: 'Media & Entertainment',          icon: '🎬' },
  { value: 'government',       label: 'Government & Public Sector',     icon: '🏛️' },
  { value: 'nonprofit',        label: 'Non-Profit & NGO',               icon: '❤️' },
]

export const INDUSTRY_CATEGORIES: { label: string; values: string[] }[] = [
  { label: 'General',                values: ['general'] },
  { label: 'Technology & Cyber',     values: ['it', 'cybersecurity', 'telecom'] },
  { label: 'Health & Life Sciences', values: ['healthcare', 'pharma', 'fitness'] },
  { label: 'Financial Services',     values: ['finance', 'insurance', 'accounting'] },
  { label: 'Professional Services',  values: ['legal', 'legaltech', 'architecture', 'creative_agency'] },
  { label: 'People & Talent',        values: ['hr', 'education', 'sports'] },
  { label: 'Customer-Facing',        values: ['sales', 'customer_support', 'retail', 'hospitality', 'realestate'] },
  { label: 'Operations & Industrial',values: ['manufacturing', 'construction', 'logistics', 'mining', 'agriculture', 'automotive', 'aerospace', 'energy'] },
  { label: 'Media & Public',         values: ['media', 'government', 'nonprofit'] },
]

export const PLATFORMS: { value: MeetingPlatform; label: string; icon: string; color: string }[] = [
  { value: 'general',   label: 'General',       icon: '📋', color: 'bg-slate-100 text-slate-700' },
  { value: 'zoom',      label: 'Zoom',          icon: '🎥', color: 'bg-blue-100 text-blue-700' },
  { value: 'teams',     label: 'Teams',         icon: '💼', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'meet',      label: 'Google Meet',   icon: '🟢', color: 'bg-green-100 text-green-700' },
  { value: 'webex',     label: 'Webex',         icon: '🌐', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'phone',     label: 'Phone Call',    icon: '📞', color: 'bg-amber-100 text-amber-700' },
  { value: 'in_person', label: 'In Person',     icon: '🤝', color: 'bg-rose-100 text-rose-700' },
]

export const RECURRENCE_OPTIONS: { value: RecurrenceFreq; label: string }[] = [
  { value: 'none',      label: 'Does not repeat' },
  { value: 'daily',     label: 'Daily' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'custom',    label: 'Custom (RRULE)' },
]

export const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
]

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const RRULE_DAYS   = ['MO',  'TU',  'WE',  'TH',  'FR',  'SA',  'SU']
