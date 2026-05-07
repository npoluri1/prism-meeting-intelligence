import type {
  ActionItemRecord,
  Analytics,
  CalendarIntegration,
  CreateMeetingInput,
  CreateScheduledMeetingInput,
  Meeting,
  MeetingTemplate,
  MeetingWithNotes,
  OrgMember,
  Organization,
  ScheduledMeeting,
  UpdateScheduledMeetingInput,
  User,
} from '../types'
import { getSessionToken } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL as string

export class ApiError extends Error {
  constructor(
    public readonly detail: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(detail)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getSessionToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (response.status === 204) return undefined as unknown as T
  const body = await response.json().catch(() => ({ detail: 'Unexpected server error', code: 'INTERNAL_ERROR' }))
  if (!response.ok) throw new ApiError(body.detail ?? 'Request failed', body.code ?? 'UNKNOWN_ERROR', response.status)
  return body as T
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function getMe(): Promise<User> {
  return apiFetch<User>('/api/auth/me')
}

// ── Meetings ──────────────────────────────────────────────────────────────────
export async function listMeetings(organizationId?: string): Promise<Meeting[]> {
  const qs = organizationId ? `?organization_id=${organizationId}` : ''
  return apiFetch<Meeting[]>(`/api/meetings${qs}`)
}
export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  return apiFetch<Meeting>('/api/meetings', { method: 'POST', body: JSON.stringify(input) })
}
export async function getMeeting(id: string): Promise<MeetingWithNotes> {
  return apiFetch<MeetingWithNotes>(`/api/meetings/${id}`)
}
export async function processMeeting(id: string): Promise<MeetingWithNotes> {
  return apiFetch<MeetingWithNotes>(`/api/meetings/${id}/process`, { method: 'POST' })
}
export async function deleteMeeting(id: string): Promise<void> {
  return apiFetch<void>(`/api/meetings/${id}`, { method: 'DELETE' })
}

export async function uploadMeeting(formData: FormData): Promise<Meeting> {
  const token = await getSessionToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  // Do NOT set Content-Type — browser sets it with multipart boundary
  const response = await fetch(`${API_BASE}/api/meetings/upload`, {
    method: 'POST',
    headers,
    body: formData,
  })
  const body = await response.json().catch(() => ({ detail: 'Unexpected server error', code: 'INTERNAL_ERROR' }))
  if (!response.ok) throw new ApiError(body.detail ?? 'Upload failed', body.code ?? 'UNKNOWN_ERROR', response.status)
  return body as Meeting
}

// ── Organizations ──────────────────────────────────────────────────────────────
export async function listOrganizations(): Promise<Organization[]> {
  return apiFetch<Organization[]>('/api/organizations')
}
export async function createOrganization(
  name: string, industry: string = 'general', size: string = 'small', website?: string
): Promise<Organization> {
  return apiFetch<Organization>('/api/organizations', {
    method: 'POST', body: JSON.stringify({ name, industry, size, website }),
  })
}
export async function getOrganization(id: string): Promise<Organization> {
  return apiFetch<Organization>(`/api/organizations/${id}`)
}
export async function updateOrganization(id: string, data: Partial<Organization>): Promise<Organization> {
  return apiFetch<Organization>(`/api/organizations/${id}`, {
    method: 'PATCH', body: JSON.stringify(data),
  })
}
export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  return apiFetch<OrgMember[]>(`/api/organizations/${orgId}/members`)
}
export async function addOrgMember(orgId: string, email: string, role = 'member'): Promise<void> {
  return apiFetch<void>(`/api/organizations/${orgId}/members`, {
    method: 'POST', body: JSON.stringify({ email, role }),
  })
}
export async function getOrgAnalytics(orgId: string): Promise<Analytics> {
  return apiFetch<Analytics>(`/api/organizations/${orgId}/analytics`)
}
export async function getOrgActionItems(orgId: string, status?: string): Promise<ActionItemRecord[]> {
  const qs = status ? `?item_status=${status}` : ''
  return apiFetch<ActionItemRecord[]>(`/api/organizations/${orgId}/action-items${qs}`)
}

// ── Templates ──────────────────────────────────────────────────────────────────
export async function listTemplates(industry?: string): Promise<MeetingTemplate[]> {
  const qs = industry ? `?industry=${industry}` : ''
  return apiFetch<MeetingTemplate[]>(`/api/templates${qs}`)
}

// ── Action Items ──────────────────────────────────────────────────────────────
export async function listMyActionItems(status?: string): Promise<ActionItemRecord[]> {
  const qs = status ? `?item_status=${status}` : ''
  return apiFetch<ActionItemRecord[]>(`/api/action-items${qs}`)
}
export async function updateActionItem(id: string, updates: Partial<ActionItemRecord>): Promise<ActionItemRecord> {
  return apiFetch<ActionItemRecord>(`/api/action-items/${id}`, {
    method: 'PATCH', body: JSON.stringify(updates),
  })
}

// ── Analytics ──────────────────────────────────────────────────────────────────
export async function getMyAnalytics(): Promise<Analytics> {
  return apiFetch<Analytics>('/api/analytics')
}

// ── Calendar — Scheduled Meetings ─────────────────────────────────────────────
export async function listScheduledMeetings(params?: {
  start?: string
  end?: string
  organization_id?: string
  status?: string
}): Promise<ScheduledMeeting[]> {
  const qs = new URLSearchParams()
  if (params?.start)           qs.set('start', params.start)
  if (params?.end)             qs.set('end', params.end)
  if (params?.organization_id) qs.set('organization_id', params.organization_id)
  if (params?.status)          qs.set('status', params.status)
  const q = qs.toString() ? `?${qs}` : ''
  return apiFetch<ScheduledMeeting[]>(`/api/calendar/scheduled${q}`)
}

export async function createScheduledMeeting(input: CreateScheduledMeetingInput): Promise<ScheduledMeeting> {
  return apiFetch<ScheduledMeeting>('/api/calendar/scheduled', {
    method: 'POST', body: JSON.stringify(input),
  })
}

export async function getScheduledMeeting(id: string): Promise<ScheduledMeeting> {
  return apiFetch<ScheduledMeeting>(`/api/calendar/scheduled/${id}`)
}

export async function updateScheduledMeeting(id: string, updates: UpdateScheduledMeetingInput): Promise<ScheduledMeeting> {
  return apiFetch<ScheduledMeeting>(`/api/calendar/scheduled/${id}`, {
    method: 'PATCH', body: JSON.stringify(updates),
  })
}

export async function deleteScheduledMeeting(id: string): Promise<void> {
  return apiFetch<void>(`/api/calendar/scheduled/${id}`, { method: 'DELETE' })
}

export async function completeScheduledMeeting(id: string): Promise<ScheduledMeeting> {
  return apiFetch<ScheduledMeeting>(`/api/calendar/scheduled/${id}/complete`, { method: 'POST' })
}

// ── Calendar Integrations ──────────────────────────────────────────────────────
export async function listCalendarIntegrations(): Promise<CalendarIntegration[]> {
  return apiFetch<CalendarIntegration[]>('/api/calendar/integrations')
}

export async function upsertCalendarIntegration(data: {
  provider: string
  external_email?: string
  calendar_id?: string
  auto_import?: boolean
  auto_create?: boolean
}): Promise<CalendarIntegration> {
  return apiFetch<CalendarIntegration>('/api/calendar/integrations', {
    method: 'POST', body: JSON.stringify(data),
  })
}

export async function deleteCalendarIntegration(id: string): Promise<void> {
  return apiFetch<void>(`/api/calendar/integrations/${id}`, { method: 'DELETE' })
}

// ── AI Chat ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Stream an AI chat response. Calls onChunk for each text delta,
 * onDone when the stream ends, onError on failure.
 */
export async function streamChat(
  messages: ChatMessage[],
  meetingId: string | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  const token = await getSessionToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, meeting_id: meetingId }),
    })
  } catch {
    onError('Network error — could not reach the server.')
    return
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: 'Request failed' }))
    onError(body.detail ?? 'Chat request failed')
    return
  }

  const reader = response.body?.getReader()
  if (!reader) { onError('Streaming not supported in this browser.'); return }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { onDone(); return }
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) { onError(parsed.error); return }
        if (parsed.text) onChunk(parsed.text)
      } catch { /* skip malformed */ }
    }
  }
  onDone()
}
