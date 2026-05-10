// DashboardPage v2
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, deleteMeeting, getMyAnalytics, getOrgAnalytics, listMeetings, listMyActionItems, getOrgActionItems, updateActionItem } from '../lib/api'
import { Sidebar } from '../components/Sidebar'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import type { ActionItemRecord, Analytics, Meeting, MeetingSource } from '../types'
import { INDUSTRIES } from '../types'

const SOURCE_BADGE: Record<MeetingSource, { icon: string; label: string; cls: string }> = {
  transcript: { icon: '📝', label: 'Transcript', cls: 'bg-slate-100 text-slate-500' },
  upload:     { icon: '🎵', label: 'Upload',     cls: 'bg-indigo-100 text-indigo-600' },
  zoom:       { icon: '🎥', label: 'Zoom',       cls: 'bg-blue-100 text-blue-600' },
  teams:      { icon: '💼', label: 'Teams',      cls: 'bg-purple-100 text-purple-600' },
  meet:       { icon: '🟢', label: 'Meet',       cls: 'bg-green-100 text-green-600' },
  webex:      { icon: '🌐', label: 'Webex',      cls: 'bg-emerald-100 text-emerald-600' },
  phone:      { icon: '📞', label: 'Phone',      cls: 'bg-amber-100 text-amber-600' },
  email:      { icon: '📧', label: 'Email',      cls: 'bg-rose-100 text-rose-600' },
}

type StatusFilter = 'all' | 'done' | 'processing' | 'pending' | 'error'
type DashTab = 'meetings' | 'actions' | 'analytics'

const STATUS_BADGE: Record<Meeting['status'], { label: string; cls: string }> = {
  pending:    { label: 'Pending',    cls: 'bg-slate-100 text-slate-600' },
  processing: { label: 'Processing', cls: 'bg-amber-100 text-amber-700' },
  done:       { label: 'Done',       cls: 'bg-emerald-100 text-emerald-700' },
  error:      { label: 'Error',      cls: 'bg-rose-100 text-rose-700' },
}

const PRIORITY_CLS: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-700',
  high:   'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-slate-100 text-slate-500',
}

const AI_STATUS_CLS: Record<string, string> = {
  open:        'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-700',
  done:        'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-rose-50 text-rose-400',
}

function PrismEmptyState({ orgId }: { orgId: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-8 py-10 text-white text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl font-black text-white">P</div>
        <h2 className="text-2xl font-bold">Welcome to Prism</h2>
        <p className="mt-2 text-violet-200 text-sm max-w-lg mx-auto">
          Upload a recording or paste a transcript — Prism extracts action items, decisions, risks,
          and sentiment across 33 industry domains.
        </p>
        <Link
          to="/meetings/new"
          state={{ organizationId: orgId }}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 transition-colors"
        >
          + Create your first meeting
        </Link>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3">
        {[
          { icon: '📁', title: 'Upload anything', desc: 'Whiteboard photos, screenshots, audio, video — all analysed automatically' },
          { icon: '📝', title: 'Paste transcripts', desc: 'Copy-paste any transcript and get structured notes instantly' },
          { icon: '✅', title: 'Action items', desc: 'Every task with its owner, priority, and due date' },
          { icon: '🎯', title: 'Key decisions', desc: 'Decisions, risks, blockers, and next-meeting agenda' },
          { icon: '🌡️', title: 'Sentiment score', desc: 'Meeting energy scored 1–10 with context notes' },
          { icon: '🏭', title: '33 industry domains', desc: 'Healthcare, Legal, Finance, Aerospace, and 29 more' },
        ].map(f => (
          <div key={f.title} className="bg-white p-5">
            <p className="text-2xl">{f.icon}</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{f.title}</p>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* How to start */}
      <div className="border-t border-slate-100 px-8 py-6 bg-slate-50">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">How to get started</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          {[
            { n: '1', label: 'Click "New Meeting" above' },
            { n: '2', label: 'Upload an audio/video file or paste a transcript' },
            { n: '3', label: 'Choose your industry domain for richer extraction' },
            { n: '4', label: 'View your notes, action items, and decisions instantly' },
          ].map(s => (
            <div key={s.n} className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{s.n}</span>
              <span className="text-xs text-slate-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, sub, color }: { label: string; value: number; icon: string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${color}`}>{icon}</span>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [dashTab, setDashTab] = useState<DashTab>('meetings')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [actionItems, setActionItems] = useState<ActionItemRecord[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [actionFilter, setActionFilter] = useState<string>('open')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    setLoading(true); setError('')
    setAnalytics(null)
    const orgId = activeOrgId ?? undefined

    // Load meetings — primary data, failure shows error
    listMeetings(orgId)
      .then(setMeetings)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.detail : 'Failed to load'))
      .finally(() => setLoading(false))

    // Load action items — non-critical, defaults to empty
    const aiPromise = activeOrgId ? getOrgActionItems(activeOrgId) : listMyActionItems()
    aiPromise.then(setActionItems).catch(() => {})

    // Load analytics — non-critical, defaults to null
    const anPromise = activeOrgId ? getOrgAnalytics(activeOrgId) : getMyAnalytics()
    anPromise.then(setAnalytics).catch(() => {})
  }, [activeOrgId])

  const filtered = useMemo(() => meetings.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  }), [meetings, search, statusFilter])

  const filteredActions = useMemo(() =>
    actionItems.filter(a => actionFilter === 'all' || a.status === actionFilter),
    [actionItems, actionFilter]
  )

  async function handleDelete(id: string) {
    if (!confirm('Delete this meeting and its notes?')) return
    setDeletingId(id)
    try { await deleteMeeting(id); setMeetings(p => p.filter(m => m.id !== id)) }
    catch (err) { toast.error(err instanceof ApiError ? err.detail : 'Failed to delete') }
    finally { setDeletingId(null) }
  }

  async function toggleActionStatus(item: ActionItemRecord) {
    const next = item.status === 'open' ? 'done' : 'open'
    try {
      await updateActionItem(item.id, { status: next })
      setActionItems(prev => prev.map(a => a.id === item.id ? { ...a, status: next } : a))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : 'Failed to update action item')
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeOrgId={activeOrgId} onOrgChange={setActiveOrgId} />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-0.5 text-sm text-slate-500">{activeOrgId ? 'Organization workspace' : 'Personal workspace'}</p>
          </div>
          <Link to="/meetings/new" state={{ organizationId: activeOrgId }}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            + New Meeting
          </Link>
        </div>

        {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {!loading && (
          <>
            {/* Stats — only shown when analytics loaded */}
            {analytics && (
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Total Meetings" value={analytics.total_meetings} icon="📋" color="bg-violet-50" />
                <StatCard label="Completed"      value={analytics.done}           icon="✅" color="bg-emerald-50" sub={`${analytics.total_meetings ? Math.round(analytics.done / analytics.total_meetings * 100) : 0}% completion rate`} />
                <StatCard label="Open Tasks"     value={analytics.action_items_open} icon="🎯" color="bg-amber-50" sub={`${analytics.action_items_done} completed`} />
                <StatCard label="Processing"     value={analytics.processing}     icon="⚡" color="bg-blue-50" />
              </div>
            )}

            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
              {([
                { key: 'meetings',  label: '📋 Meetings'    },
                { key: 'actions',   label: '✅ Action Items' },
                { key: 'analytics', label: '📊 Analytics'   },
              ] as { key: DashTab; label: string }[]).map(t => (
                <button key={t.key} onClick={() => setDashTab(t.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${dashTab === t.key ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Meetings ── */}
            {dashTab === 'meetings' && (
              <>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    <input type="text" placeholder="Search meetings…" value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                  </div>
                  <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
                    {(['all','done','processing','pending','error'] as StatusFilter[]).map(s => (
                      <button key={s} onClick={() => setStatusFilter(s)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  search || statusFilter !== 'all' ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
                      <p className="text-3xl">🔍</p>
                      <p className="mt-3 font-medium text-slate-700">No meetings match your filter</p>
                    </div>
                  ) : (
                    <PrismEmptyState orgId={activeOrgId} />
                  )
                  ) : (
                  <div className="space-y-2">
                    {filtered.map(m => {
                      const badge = STATUS_BADGE[m.status]
                      const ind = INDUSTRIES.find(i => i.value === m.industry)
                      return (
                        <div key={m.id} className="group flex items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm hover:shadow-md">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                            {ind && <span className="text-base">{ind.icon}</span>}
                            {m.source && m.source !== 'transcript' && SOURCE_BADGE[m.source] && (
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE[m.source].cls}`}>
                                {SOURCE_BADGE[m.source].icon} {SOURCE_BADGE[m.source].label}
                              </span>
                            )}
                            <div className="min-w-0">
                              <Link to={`/meetings/${m.id}`} className="truncate font-semibold text-slate-900 hover:text-violet-600">{m.title}</Link>
                              <p className="mt-0.5 text-xs text-slate-400">{new Date(m.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 pl-4">
                            {m.status === 'done' && (
                              <Link to={`/meetings/${m.id}`} className="hidden rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 group-hover:flex">
                                View notes
                              </Link>
                            )}
                            <button onClick={() => handleDelete(m.id)} disabled={deletingId === m.id}
                              className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                            >
                              {deletingId === m.id ? <Spinner size="sm" /> : '🗑'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Tab: Action Items ── */}
            {dashTab === 'actions' && (
              <>
                <div className="mb-3 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
                  {(['all','open','in_progress','done','cancelled'] as string[]).map(s => (
                    <button key={s} onClick={() => setActionFilter(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${actionFilter === s ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                {filteredActions.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
                    No action items found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredActions.map(a => (
                      <div key={a.id} className="flex items-start gap-4 rounded-xl bg-white px-5 py-4 shadow-sm">
                        <button onClick={() => toggleActionStatus(a)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs ${a.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-violet-500'}`}
                        >
                          {a.status === 'done' && '✓'}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm text-slate-800 ${a.status === 'done' ? 'line-through text-slate-400' : ''}`}>{a.task}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-500">👤 {a.owner}</span>
                            {a.due_date && <span className="text-xs text-slate-400">📅 {new Date(a.due_date).toLocaleDateString()}</span>}
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${AI_STATUS_CLS[a.status] ?? AI_STATUS_CLS.open}`}>{a.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLS[a.priority] ?? PRIORITY_CLS.medium}`}>{a.priority}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Tab: Analytics ── */}
            {dashTab === 'analytics' && analytics && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <p className="mb-4 text-sm font-semibold text-slate-700">Meeting completion</p>
                    <div className="space-y-3">
                      {(['done','processing','pending','error'] as const).map(s => {
                        const val = analytics[s as keyof Analytics] as number
                        const pct = analytics.total_meetings ? Math.round(val / analytics.total_meetings * 100) : 0
                        const cls = { done: 'bg-emerald-500', processing: 'bg-amber-500', pending: 'bg-slate-300', error: 'bg-rose-500' }[s]
                        return (
                          <div key={s}>
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="capitalize text-slate-600">{s}</span>
                              <span className="font-medium text-slate-800">{val} ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${cls}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <p className="mb-4 text-sm font-semibold text-slate-700">Action items</p>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-amber-600">{analytics.action_items_open}</p>
                        <p className="mt-1 text-xs text-slate-500">Open</p>
                      </div>
                      <div className="text-center">
                        <p className="text-4xl font-bold text-emerald-600">{analytics.action_items_done}</p>
                        <p className="mt-1 text-xs text-slate-500">Done</p>
                      </div>
                      <div className="text-center">
                        <p className="text-4xl font-bold text-slate-700">
                          {analytics.action_items_open + analytics.action_items_done > 0
                            ? Math.round(analytics.action_items_done / (analytics.action_items_open + analytics.action_items_done) * 100)
                            : 0}%
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Completion</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="mb-4 text-sm font-semibold text-slate-700">Meetings by industry</p>
                  {Object.keys(analytics.by_industry).length === 0 ? (
                    <p className="text-sm text-slate-400">No data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(analytics.by_industry).sort((a, b) => b[1] - a[1]).map(([ind, count]) => {
                        const info = INDUSTRIES.find(i => i.value === ind)
                        const pct = analytics.total_meetings ? Math.round(count / analytics.total_meetings * 100) : 0
                        return (
                          <div key={ind}>
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-slate-600">{info?.icon} {info?.label ?? ind}</span>
                              <span className="font-medium text-slate-800">{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
