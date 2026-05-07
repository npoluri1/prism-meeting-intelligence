import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  createScheduledMeeting,
  deleteScheduledMeeting,
  listScheduledMeetings,
  updateScheduledMeeting,
} from '../lib/api'
import { Sidebar } from '../components/Sidebar'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import type { CreateScheduledMeetingInput, MeetingPlatform, RecurrenceFreq, ScheduledMeeting } from '../types'
import {
  DAYS_OF_WEEK,
  DURATION_OPTIONS,
  INDUSTRIES,
  PLATFORMS,
  RECURRENCE_OPTIONS,
  RRULE_DAYS,
} from '../types'

type CalendarView = 'month' | 'agenda'

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
function firstDayOfMonth(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7 // 0=Mon
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

const PLATFORM_INFO = Object.fromEntries(PLATFORMS.map(p => [p.value, p]))
const INDUSTRY_INFO = Object.fromEntries(INDUSTRIES.map(i => [i.value, i]))

const STATUS_COLOR: Record<string, string> = {
  scheduled:   'bg-violet-100 text-violet-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-slate-100 text-slate-400 line-through',
}

function buildRRule(freq: RecurrenceFreq, selectedDays: number[]): string | null {
  if (freq === 'none') return null
  if (freq === 'daily')    return 'FREQ=DAILY'
  if (freq === 'weekly')   return `FREQ=WEEKLY${selectedDays.length ? ';BYDAY=' + selectedDays.map(d => RRULE_DAYS[d]).join(',') : ''}`
  if (freq === 'biweekly') return `FREQ=WEEKLY;INTERVAL=2${selectedDays.length ? ';BYDAY=' + selectedDays.map(d => RRULE_DAYS[d]).join(',') : ''}`
  if (freq === 'monthly')  return 'FREQ=MONTHLY'
  return null
}

// ── Schedule Meeting Modal ────────────────────────────────────────────────────

interface ScheduleModalProps {
  initialDate?: string
  activeOrgId: string | null
  onClose: () => void
  onCreated: (sm: ScheduledMeeting) => void
}

function ScheduleModal({ initialDate, activeOrgId, onClose, onCreated }: ScheduleModalProps) {
  const toast = useToast()
  const [title, setTitle]             = useState('')
  const [dateVal, setDateVal]         = useState(initialDate ?? isoDate(new Date()))
  const [timeVal, setTimeVal]         = useState('09:00')
  const [duration, setDuration]       = useState(60)
  const [platform, setPlatform]       = useState<MeetingPlatform>('general')
  const [meetingUrl, setMeetingUrl]   = useState('')
  const [location, setLocation]       = useState('')
  const [industry, setIndustry]       = useState('general')
  const [attendees, setAttendees]     = useState('')
  const [description, setDescription] = useState('')
  const [freq, setFreq]               = useState<RecurrenceFreq>('none')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [endDate, setEndDate]         = useState('')
  const [saving, setSaving]           = useState(false)

  function toggleDay(idx: number) {
    setSelectedDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const scheduled_at = new Date(`${dateVal}T${timeVal}`).toISOString()
      const input: CreateScheduledMeetingInput = {
        title: title.trim(),
        scheduled_at,
        duration_min: duration,
        platform,
        industry,
        organization_id: activeOrgId,
        attendee_emails: attendees.split(',').map(s => s.trim()).filter(Boolean),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        meeting_url: meetingUrl.trim() || undefined,
        recurrence_rule: buildRRule(freq, selectedDays) ?? undefined,
        recurrence_end_date: endDate || undefined,
      }
      const sm = await createScheduledMeeting(input)
      onCreated(sm)
      toast.success('Meeting scheduled')
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : 'Failed to schedule meeting')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Schedule Meeting</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              placeholder="e.g. Weekly Team Standup"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Date *</label>
              <input type="date" required value={dateVal} onChange={e => setDateVal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Time *</label>
              <input type="time" required value={timeVal} onChange={e => setTimeVal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Duration</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
            >
              {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Platform */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Platform</label>
            <div className="grid grid-cols-4 gap-2">
              {PLATFORMS.map(p => (
                <button key={p.value} type="button" onClick={() => setPlatform(p.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center transition-all ${
                    platform === p.value
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-transparent bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-xs font-medium leading-tight text-slate-600">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* URL / Location */}
          {(platform === 'zoom' || platform === 'teams' || platform === 'meet' || platform === 'webex') && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Meeting link</label>
              <input type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
          )}
          {platform === 'in_person' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Room A, 123 Main St…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
          )}

          {/* Industry */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Industry context</label>
            <select value={industry} onChange={e => setIndustry(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
            >
              {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.icon} {i.label}</option>)}
            </select>
          </div>

          {/* Attendees */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Attendees <span className="font-normal text-slate-400">(comma-separated emails)</span></label>
            <input value={attendees} onChange={e => setAttendees(e.target.value)}
              placeholder="alice@co.com, bob@co.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Repeat</label>
            <select value={freq} onChange={e => setFreq(e.target.value as RecurrenceFreq)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
            >
              {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {(freq === 'weekly' || freq === 'biweekly') && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Repeat on</label>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((day, idx) => (
                  <button key={day} type="button" onClick={() => toggleDay(idx)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      selectedDays.includes(idx)
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {freq !== 'none' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">End date <span className="font-normal text-slate-400">(optional)</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Notes <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Agenda, goals, context…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving || !title.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {saving && <Spinner size="sm" />}
              {saving ? 'Scheduling…' : 'Schedule meeting'}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Meeting Detail Popover ────────────────────────────────────────────────────

function MeetingPopover({
  sm,
  onClose,
  onDelete,
  onCancel,
}: {
  sm: ScheduledMeeting
  onClose: () => void
  onDelete: () => void
  onCancel: () => void
}) {
  const navigate = useNavigate()
  const pInfo = PLATFORM_INFO[sm.platform]
  const iInfo = INDUSTRY_INFO[sm.industry]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[sm.status]}`}>
                {sm.status.replace('_', ' ')}
              </span>
              {pInfo && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pInfo.color}`}>
                  {pInfo.icon} {pInfo.label}
                </span>
              )}
              {iInfo && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {iInfo.icon} {iInfo.label}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900">{sm.title}</h3>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">📅</span>
            <span>{formatDate(sm.scheduled_at)} at {formatTime(sm.scheduled_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">⏱</span>
            <span>{sm.duration_min >= 60 ? `${sm.duration_min / 60}h` : `${sm.duration_min}min`}</span>
          </div>
          {sm.location && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">📍</span>
              <span>{sm.location}</span>
            </div>
          )}
          {sm.meeting_url && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">🔗</span>
              <a href={sm.meeting_url} target="_blank" rel="noreferrer"
                className="truncate text-violet-600 hover:underline"
              >{sm.meeting_url}</a>
            </div>
          )}
          {sm.attendee_emails.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-slate-400">👥</span>
              <span>{sm.attendee_emails.join(', ')}</span>
            </div>
          )}
          {sm.recurrence_rule && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">🔁</span>
              <span className="text-xs text-slate-500">{sm.recurrence_rule}</span>
            </div>
          )}
          {sm.description && (
            <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{sm.description}</p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          {sm.status === 'completed' && sm.meeting_id && (
            <button
              onClick={() => navigate(`/meetings/${sm.meeting_id}`)}
              className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              View notes
            </button>
          )}
          {sm.status === 'scheduled' && (
            <button
              onClick={() => navigate('/meetings/new')}
              className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Process transcript
            </button>
          )}
          {sm.status === 'scheduled' && (
            <button onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button onClick={onDelete}
            className="rounded-xl border border-rose-100 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Calendar Page ────────────────────────────────────────────────────────

export function CalendarPage() {
  const toast = useToast()
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [view, setView] = useState<CalendarView>('month')
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [selected, setSelected] = useState<ScheduledMeeting | null>(null)
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())



  useEffect(() => {
    setLoading(true)
    const start = view === 'month'
      ? new Date(currentYear, currentMonth - 1, 1).toISOString()
      : new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
    const end = view === 'month'
      ? new Date(currentYear, currentMonth + 2, 0).toISOString()
      : new Date(today.getFullYear(), today.getMonth() + 3, 0).toISOString()

    listScheduledMeetings({ start, end, organization_id: activeOrgId ?? undefined })
      .then(setMeetings)
      .catch(() => toast.error('Failed to load calendar'))
      .finally(() => setLoading(false))
  }, [activeOrgId, currentYear, currentMonth, view]) // eslint-disable-line react-hooks/exhaustive-deps

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }
  function goToday() { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()) }

  function handleCreated(sm: ScheduledMeeting) {
    setMeetings(prev => [...prev, sm].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)))
  }

  async function handleDelete(sm: ScheduledMeeting) {
    if (!confirm(`Delete "${sm.title}"?`)) return
    try {
      await deleteScheduledMeeting(sm.id)
      setMeetings(prev => prev.filter(m => m.id !== sm.id))
      setSelected(null)
      toast.success('Meeting deleted')
    } catch { toast.error('Failed to delete') }
  }

  async function handleCancel(sm: ScheduledMeeting) {
    try {
      const updated = await updateScheduledMeeting(sm.id, { status: 'cancelled' })
      setMeetings(prev => prev.map(m => m.id === sm.id ? updated : m))
      setSelected(null)
      toast.info('Meeting cancelled')
    } catch { toast.error('Failed to cancel') }
  }

  // ── Month view data ────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const firstDay = firstDayOfMonth(currentYear, currentMonth)
    const days = daysInMonth(currentYear, currentMonth)
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= days; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [currentYear, currentMonth])

  const meetingsByDay = useMemo(() => {
    const map: Record<string, ScheduledMeeting[]> = {}
    meetings.forEach(sm => {
      const day = sm.scheduled_at.slice(0, 10)
      if (!map[day]) map[day] = []
      map[day].push(sm)
    })
    return map
  }, [meetings])

  // ── Agenda view data ───────────────────────────────────────────────────────

  const agendaGroups = useMemo(() => {
    const upcoming = meetings
      .filter(sm => sm.status !== 'cancelled')
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    const groups: { date: string; items: ScheduledMeeting[] }[] = []
    for (const sm of upcoming) {
      const day = sm.scheduled_at.slice(0, 10)
      const last = groups[groups.length - 1]
      if (last && last.date === day) last.items.push(sm)
      else groups.push({ date: day, items: [sm] })
    }
    return groups
  }, [meetings])

  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeOrgId={activeOrgId} onOrgChange={setActiveOrgId} />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
            <p className="mt-0.5 text-sm text-slate-500">Schedule and manage your meetings</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {(['month', 'agenda'] as CalendarView[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    view === v ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {v === 'month' ? '📅 Month' : '📋 Agenda'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setSelectedDate(undefined); setShowModal(true) }}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              + Schedule
            </button>
          </div>
        </div>

        {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

        {!loading && (
          <>
            {/* ── Month View ── */}
            {view === 'month' && (
              <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                {/* Month nav */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <h2 className="text-base font-bold text-slate-900">{monthLabel}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={goToday}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Today
                    </button>
                    <button onClick={prevMonth} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">←</button>
                    <button onClick={nextMonth} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">→</button>
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-slate-100">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400">{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-28 border-b border-r border-slate-50 bg-slate-50/50" />
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayMeetings = meetingsByDay[dateStr] || []
                    const isToday = dateStr === isoDate(today)
                    const isWeekend = (idx % 7) >= 5

                    return (
                      <div
                        key={dateStr}
                        onClick={() => { setSelectedDate(dateStr); setShowModal(true) }}
                        className={`h-28 cursor-pointer border-b border-r border-slate-100 p-1.5 transition-colors hover:bg-violet-50 ${isWeekend ? 'bg-slate-50/30' : ''}`}
                      >
                        <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday ? 'bg-violet-600 text-white' : 'text-slate-600'
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayMeetings.slice(0, 2).map(sm => {
                            const pInfo = PLATFORM_INFO[sm.platform]
                            return (
                              <button
                                key={sm.id}
                                onClick={e => { e.stopPropagation(); setSelected(sm) }}
                                className={`w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium ${STATUS_COLOR[sm.status]}`}
                              >
                                {pInfo?.icon} {formatTime(sm.scheduled_at)} {sm.title}
                              </button>
                            )
                          })}
                          {dayMeetings.length > 2 && (
                            <p className="px-1 text-xs text-slate-400">+{dayMeetings.length - 2} more</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Agenda View ── */}
            {view === 'agenda' && (
              <div className="space-y-6">
                {agendaGroups.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                    <p className="text-4xl">📅</p>
                    <p className="mt-3 font-medium text-slate-700">No upcoming meetings</p>
                    <button onClick={() => setShowModal(true)}
                      className="mt-3 text-sm font-medium text-violet-600 hover:underline"
                    >
                      Schedule your first meeting →
                    </button>
                  </div>
                ) : agendaGroups.map(group => (
                  <div key={group.date}>
                    <div className="mb-2 flex items-center gap-3">
                      <span className={`rounded-xl px-3 py-1 text-sm font-semibold ${
                        group.date === isoDate(today)
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-slate-700 shadow-sm'
                      }`}>
                        {group.date === isoDate(today) ? 'Today' : formatDate(group.date)}
                      </span>
                      <div className="flex-1 border-t border-slate-200" />
                    </div>
                    <div className="space-y-2">
                      {group.items.map(sm => {
                        const pInfo = PLATFORM_INFO[sm.platform]
                        const iInfo = INDUSTRY_INFO[sm.industry]
                        return (
                          <button
                            key={sm.id}
                            onClick={() => setSelected(sm)}
                            className="group w-full rounded-xl bg-white px-5 py-4 text-left shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                                  {pInfo?.icon ?? '📋'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 truncate">{sm.title}</p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <span>⏰ {formatTime(sm.scheduled_at)}</span>
                                    <span>⏱ {sm.duration_min >= 60 ? `${sm.duration_min / 60}h` : `${sm.duration_min}m`}</span>
                                    {sm.location && <span>📍 {sm.location}</span>}
                                    {sm.attendee_emails.length > 0 && <span>👥 {sm.attendee_emails.length}</span>}
                                    {sm.recurrence_rule && <span>🔁 Recurring</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {iInfo && <span className="text-base">{iInfo.icon}</span>}
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[sm.status]}`}>
                                  {sm.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showModal && (
        <ScheduleModal
          initialDate={selectedDate}
          activeOrgId={activeOrgId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {selected && (
        <MeetingPopover
          sm={selected}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected)}
          onCancel={() => handleCancel(selected)}
        />
      )}
    </div>
  )
}
