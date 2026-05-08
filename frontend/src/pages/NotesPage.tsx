import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, getMeeting } from '../lib/api'
import { AIChatPanel } from '../components/AIChatPanel'
import { Sidebar } from '../components/Sidebar'
import { Spinner } from '../components/Spinner'
import type { MeetingSource, MeetingWithNotes } from '../types'
import { INDUSTRIES } from '../types'

const SOURCE_ICONS: Partial<Record<MeetingSource, string>> = {
  upload: '🎵', zoom: '🎥', teams: '💼', meet: '🟢', webex: '🌐', phone: '📞', email: '📧',
}

const POLL_MS = 3000

type Tab = 'summary' | 'actions' | 'decisions' | 'analysis'

function buildMarkdown(m: MeetingWithNotes): string {
  const n = m.notes
  if (!n) return ''
  const lines: string[] = [
    `# ${m.title}`,
    `_${new Date(m.created_at).toLocaleString()}_`,
    m.location ? `📍 ${m.location}` : '',
    '',
    '## Summary', n.summary ?? '', '',
    '## Action Items',
    ...(n.action_items.length ? n.action_items.map(a => `- [ ] ${a.task} — **${a.owner}**`) : ['_None identified._']),
    '',
    '## Decisions',
    ...(n.decisions.length ? n.decisions.map(d => `- ✓ ${d}`) : ['_None recorded._']),
  ]
  if (n.risks_and_blockers.length) {
    lines.push('', '## Risks & Blockers', ...n.risks_and_blockers.map(r => `- ⚠️ ${r}`))
  }
  if (n.next_meeting_agenda.length) {
    lines.push('', '## Next Meeting Agenda', ...n.next_meeting_agenda.map((a, i) => `${i + 1}. ${a}`))
  }
  return lines.filter(l => l !== null).join('\n')
}

function downloadMd(m: MeetingWithNotes) {
  const blob = new Blob([buildMarkdown(m)], { type: 'text/markdown' })
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `${m.title.replace(/\s+/g, '-').toLowerCase()}-notes.md`,
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

const PRIORITY_CLS: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-700',
  high:   'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-slate-100 text-slate-600',
}

export function NotesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<MeetingWithNotes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<Tab>('summary')
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const meetingRef = useRef(meeting)
  meetingRef.current = meeting

  function stopPolling() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const data = await getMeeting(id!)
        setMeeting(data)
        if (data.organization_id && !activeOrgId) setActiveOrgId(data.organization_id)
        if (data.status === 'done' || data.status === 'error') stopPolling()
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : 'Failed to load meeting')
        stopPolling()
      } finally { setLoading(false) }
    }
    load()
    pollRef.current = setInterval(() => {
      const current = meetingRef.current
      if (current?.status === 'done' || current?.status === 'error') { stopPolling(); return }
      load()
    }, POLL_MS)
    return stopPolling
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCopy() {
    if (!meeting) return
    await navigator.clipboard.writeText(buildMarkdown(meeting))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const extra = meeting?.notes
    ? {
        risks:        meeting.notes.risks_and_blockers   ?? [],
        agenda:       meeting.notes.next_meeting_agenda  ?? [],
        sentiment:    meeting.notes.meeting_sentiment    ?? null,
        participants: meeting.notes.participants         ?? [],
        key_topics:   meeting.notes.key_topics           ?? [],
      }
    : null

  const industryLabel = INDUSTRIES.find(i => i.value === meeting?.industry)

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeOrgId={activeOrgId} onOrgChange={setActiveOrgId} />
      <main className="flex-1 overflow-y-auto px-8 py-6 transition-all">
        {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {!loading && !error && meeting && (
          <>
            <button onClick={() => navigate('/dashboard')} className="mb-3 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700">
              ← Back to dashboard
            </button>

            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {industryLabel && (
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                      {industryLabel.icon} {industryLabel.label}
                    </span>
                  )}
                  {meeting.source && meeting.source !== 'transcript' && SOURCE_ICONS[meeting.source] && (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {SOURCE_ICONS[meeting.source]} {meeting.source.charAt(0).toUpperCase() + meeting.source.slice(1)}
                    </span>
                  )}
                  {meeting.location && (
                    <span className="text-xs text-slate-500">📍 {meeting.location}</span>
                  )}
                  {meeting.meeting_date && (
                    <span className="text-xs text-slate-500">📅 {new Date(meeting.meeting_date).toLocaleDateString()}</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{meeting.title}</h1>
                <p className="mt-1 text-sm text-slate-500">{new Date(meeting.created_at).toLocaleString()}</p>
                {meeting.attendees && meeting.attendees.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {meeting.attendees.map(a => (
                      <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setChatOpen(v => !v)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    chatOpen
                      ? 'border-violet-400 bg-violet-600 text-white'
                      : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}
                >
                  💬 Ask AI
                </button>
                {meeting.status === 'done' && (
                  <>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      📋 {copied ? 'Copied!' : 'Copy MD'}
                    </button>
                    <button onClick={() => downloadMd(meeting)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      ⬇️ Download
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Media viewer for uploaded files */}
            {meeting.media_url && meeting.source === 'upload' && meeting.status === 'done' && (
              <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
                {/\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(meeting.media_url) ? (
                  <>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">🖼️ Source Image</p>
                    <img
                      src={meeting.media_url}
                      alt="Source image"
                      className="max-h-80 w-auto rounded-xl border border-slate-100 object-contain"
                    />
                  </>
                ) : /\.(mp4|mov|webm|mkv)(\?|$)/i.test(meeting.media_url) ? (
                  <>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">🎬 Recording</p>
                    <video src={meeting.media_url} controls className="w-full rounded-xl max-h-56 bg-black" />
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">🎵 Recording</p>
                    <audio src={meeting.media_url} controls className="w-full" />
                  </>
                )}
              </div>
            )}

            {/* Processing */}
            {(meeting.status === 'pending' || meeting.status === 'processing') && (
              <div className="flex items-center gap-4 rounded-2xl bg-violet-50 p-8">
                <Spinner />
                <div>
                  {meeting.source === 'upload' ? (
                    <>
                      <p className="font-medium text-violet-800">
                        {meeting.media_url && /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(meeting.media_url)
                          ? 'Extracting content from your image…'
                          : 'Transcribing your recording…'}
                      </p>
                      <p className="mt-0.5 text-sm text-violet-600">
                        Processing in the background — this page will update when notes are ready.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-violet-800">AI is analysing your transcript…</p>
                      <p className="mt-0.5 text-sm text-violet-600">Usually takes 10–20 seconds.</p>
                    </>
                  )}
                </div>
              </div>
            )}
            {meeting.status === 'error' && (
              <div className="rounded-2xl bg-rose-50 p-8 text-rose-700">
                <p className="font-medium">Processing failed</p>
                <p className="mt-1 text-sm">Check that your transcript is valid text and try again.</p>
              </div>
            )}

            {meeting.status === 'done' && meeting.notes && extra && (
              <>
                {/* Chips */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    ✅ {meeting.notes.action_items.length} action items
                  </span>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                    🎯 {meeting.notes.decisions.length} decisions
                  </span>
                  {extra.risks.length > 0 && (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                      ⚠️ {extra.risks.length} risks
                    </span>
                  )}
                  {extra.sentiment && (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${extra.sentiment.score >= 7 ? 'bg-emerald-100 text-emerald-700' : extra.sentiment.score >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      🌡️ Energy {extra.sentiment.score}/10
                    </span>
                  )}
                  {extra.key_topics.map(t => (
                    <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{t}</span>
                  ))}
                </div>

                {/* Tabs */}
                <div className="mb-4 border-b border-slate-200">
                  <nav className="flex gap-1">
                    {([
                      { key: 'summary',  label: 'Summary' },
                      { key: 'actions',  label: 'Action Items', count: meeting.notes.action_items.length },
                      { key: 'decisions',label: 'Decisions',    count: meeting.notes.decisions.length },
                      { key: 'analysis', label: 'Full Analysis' },
                    ] as { key: Tab; label: string; count?: number }[]).map(t => (
                      <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${tab === t.key ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                      >
                        {t.label}
                        {t.count !== undefined && (
                          <span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t.key ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                            {t.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab: Summary */}
                {tab === 'summary' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                      <p className="leading-relaxed text-slate-800">{meeting.notes.summary}</p>
                    </div>
                    {extra.participants.length > 0 && (
                      <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Participants identified</p>
                        <div className="flex flex-wrap gap-2">
                          {extra.participants.map(p => (
                            <span key={p} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-200 text-xs font-bold text-violet-800">{p[0]?.toUpperCase()}</span>
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Action Items */}
                {tab === 'actions' && (
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    {meeting.notes.action_items.length === 0 ? (
                      <p className="text-sm text-slate-400">No action items identified.</p>
                    ) : (
                      <ul className="space-y-3">
                        {meeting.notes.action_items.map((item, idx) => {
                          const raw = item as unknown as Record<string, string>
                          return (
                            <li key={idx} className="flex items-start gap-4 rounded-xl border border-slate-100 p-4">
                              <span className="shrink-0 rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">{item.owner}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-slate-800">{item.task}</p>
                                {raw.due_date && <p className="mt-0.5 text-xs text-slate-400">Due: {raw.due_date}</p>}
                              </div>
                              {raw.priority && (
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLS[raw.priority] ?? PRIORITY_CLS.medium}`}>
                                  {raw.priority}
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Tab: Decisions */}
                {tab === 'decisions' && (
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    {meeting.notes.decisions.length === 0 ? (
                      <p className="text-sm text-slate-400">No decisions recorded.</p>
                    ) : (
                      <ul className="space-y-3">
                        {meeting.notes.decisions.map((d, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">✓</span>
                            <span className="text-slate-800">{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Tab: Full Analysis */}
                {tab === 'analysis' && (
                  <div className="space-y-4">
                    {extra.risks.length > 0 && (
                      <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">⚠️ Risks & Blockers</p>
                        <ul className="space-y-2">
                          {extra.risks.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                              <span className="mt-0.5 text-rose-500">▲</span>{r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {extra.agenda.length > 0 && (
                      <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">📅 Suggested Next Meeting Agenda</p>
                        <ol className="space-y-2">
                          {extra.agenda.map((a, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-slate-800">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{i + 1}</span>
                              {a}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {extra.sentiment && (
                      <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">🌡️ Meeting Sentiment</p>
                        <div className="flex items-center gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-50">
                            <span className="text-2xl font-bold text-violet-700">{extra.sentiment.score}</span>
                            <span className="text-xs text-violet-500">/10</span>
                          </div>
                          <p className="text-sm text-slate-700">{extra.sentiment.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* AI Chat panel — slides in from the right */}
      <div
        className={`flex h-screen flex-col border-l border-slate-200 bg-white transition-all duration-300 overflow-hidden ${
          chatOpen ? 'w-96' : 'w-0'
        }`}
      >
        {chatOpen && (
          <AIChatPanel
            meetingId={meeting?.id ?? null}
            meetingTitle={meeting?.title}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
