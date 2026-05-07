import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError, createMeeting, listTemplates, processMeeting, uploadMeeting } from '../lib/api'
import { Sidebar } from '../components/Sidebar'
import { Spinner } from '../components/Spinner'
import { UploadZone } from '../components/UploadZone'
import type { MeetingTemplate } from '../types'
import { INDUSTRIES, INDUSTRY_CATEGORIES } from '../types'
import { useToast } from '../components/Toast'

type Mode = 'transcript' | 'upload'
type State = 'idle' | 'creating' | 'processing' | 'uploading' | 'error'

export function NewMeetingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const orgId: string | null = (location.state as { organizationId?: string | null })?.organizationId ?? null

  const [activeOrgId, setActiveOrgId] = useState<string | null>(orgId)
  const [mode, setMode] = useState<Mode>('transcript')

  // Transcript mode state
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [location_, setLocation_] = useState('')
  const [attendees, setAttendees] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Upload mode state
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  // Shared state
  const [industry, setIndustry] = useState('general')
  const [industrySearch, setIndustrySearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate | null>(null)
  const [templates, setTemplates] = useState<MeetingTemplate[]>([])
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    listTemplates(industry).then(setTemplates).catch(() => {})
  }, [industry])

  // ── Transcript submit ────────────────────────────────────────────────────────
  async function handleTranscriptSubmit(e: FormEvent) {
    e.preventDefault()
    setState('creating')
    setErrorMsg('')
    try {
      const meeting = await createMeeting({
        title: title.trim(),
        transcript: transcript.trim(),
        organization_id: activeOrgId,
        industry,
        meeting_date: meetingDate || undefined,
        location: location_.trim() || undefined,
        attendees: attendees.split(',').map(s => s.trim()).filter(Boolean),
        template_id: selectedTemplate?.id,
      })
      setState('processing')
      await processMeeting(meeting.id)
      navigate(`/meetings/${meeting.id}`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Something went wrong'
      setErrorMsg(msg)
      toast.error(msg)
      setState('error')
    }
  }

  // ── Upload submit ─────────────────────────────────────────────────────────────
  async function handleUploadSubmit(e: FormEvent) {
    e.preventDefault()
    if (!uploadFile) { setErrorMsg('Please select a file'); return }
    if (!uploadTitle.trim()) { setErrorMsg('Please enter a meeting title'); return }

    setState('uploading')
    setErrorMsg('')
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('title', uploadTitle.trim())
      fd.append('industry', industry)
      if (activeOrgId) fd.append('organization_id', activeOrgId)

      const meeting = await uploadMeeting(fd)
      navigate(`/meetings/${meeting.id}`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Upload failed'
      setErrorMsg(msg)
      toast.error(msg)
      setState('error')
    }
  }

  const isSubmitting = ['creating', 'processing', 'uploading'].includes(state)
  const industryTemplates = templates.filter(t => t.industry === industry || t.industry === 'general')

  const filteredIndustries = industrySearch.trim()
    ? INDUSTRIES.filter(i => i.label.toLowerCase().includes(industrySearch.toLowerCase()))
    : null

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeOrgId={activeOrgId} onOrgChange={setActiveOrgId} />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <button onClick={() => navigate('/dashboard')} className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700">
          ← Back to dashboard
        </button>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">New Meeting</h1>

        <div className="mx-auto max-w-3xl space-y-5">
          {/* Mode tabs */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {([['transcript', '📝 Paste transcript'], ['upload', '🎵 Upload recording']] as [Mode, string][]).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setErrorMsg('') }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  mode === m ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Industry picker — grouped + searchable */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Industry context</p>
              <input
                type="search"
                value={industrySearch}
                onChange={e => setIndustrySearch(e.target.value)}
                placeholder="Search industries…"
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs focus:border-violet-400 focus:outline-none w-40"
              />
            </div>

            {filteredIndustries ? (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {filteredIndustries.map(ind => (
                  <IndustryButton
                    key={ind.value}
                    ind={ind}
                    selected={industry === ind.value}
                    onClick={() => { setIndustry(ind.value); setSelectedTemplate(null); setIndustrySearch('') }}
                  />
                ))}
                {filteredIndustries.length === 0 && (
                  <p className="col-span-5 py-4 text-center text-sm text-slate-400">No matching industries</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {INDUSTRY_CATEGORIES.map(cat => {
                  const catIndustries = INDUSTRIES.filter(i => cat.values.includes(i.value))
                  return (
                    <div key={cat.label}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{cat.label}</p>
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                        {catIndustries.map(ind => (
                          <IndustryButton
                            key={ind.value}
                            ind={ind}
                            selected={industry === ind.value}
                            onClick={() => { setIndustry(ind.value); setSelectedTemplate(null) }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Template picker */}
          {industryTemplates.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Meeting template <span className="font-normal text-slate-400">(optional)</span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {industryTemplates.slice(0, 9).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplate(selectedTemplate?.id === t.id ? null : t)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      selectedTemplate?.id === t.id
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-transparent bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <p className={`text-sm font-medium ${selectedTemplate?.id === t.id ? 'text-violet-700' : 'text-slate-800'}`}>
                      {t.name}
                    </p>
                    {t.description && <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{t.description}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transcript form */}
          {mode === 'transcript' && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <form onSubmit={handleTranscriptSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Meeting title *</label>
                  <input
                    required maxLength={200} value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Q2 Planning Session"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(v => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
                >
                  {showAdvanced ? '▼' : '▶'} {showAdvanced ? 'Hide' : 'Show'} meeting details
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Meeting date</label>
                      <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Location / Link</label>
                      <input type="text" value={location_} onChange={e => setLocation_(e.target.value)} placeholder="Room A / Zoom"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Attendees (comma-separated)</label>
                      <input type="text" value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="Alice, Bob, Carol"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Transcript *</label>
                  <textarea
                    required minLength={10} maxLength={50_000} rows={14}
                    value={transcript} onChange={e => setTranscript(e.target.value)}
                    placeholder="Paste your meeting transcript here…"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {transcript.length.toLocaleString()} / 50,000
                  </p>
                </div>

                <FormFooter state={state} errorMsg={errorMsg} navigate={navigate}
                  label={state === 'processing' ? 'Processing…' : 'Analyse transcript'}
                />
              </form>
            </div>
          )}

          {/* Upload form */}
          {mode === 'upload' && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Meeting title *</label>
                  <input
                    required maxLength={200} value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                    placeholder="e.g. Customer call — Acme Corp"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                </div>

                <UploadZone file={uploadFile} onFile={setUploadFile} />

                <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 space-y-2">
                  <p className="text-xs font-semibold text-violet-700">Supported file types</p>
                  <div className="space-y-1.5 text-xs text-violet-600">
                    <p>🖼️ <strong>Images:</strong> JPG, PNG, WEBP, GIF, BMP — whiteboard photos, sticky notes, slides, handwritten notes, screenshots</p>
                    <p>🎵 <strong>Audio:</strong> MP3, WAV, M4A — meeting recordings, phone calls, voice memos</p>
                    <p>🎬 <strong>Video:</strong> MP4, MOV, WEBM, MKV — Zoom, Teams, Meet recordings</p>
                    <p>🔄 <strong>How it works:</strong> Images → AI vision extracts all text. Audio/video → AI transcribes speech. Both go through full meeting analysis automatically.</p>
                    <p>⏱️ Processing runs in the background — you'll land on the meeting page immediately and notes appear when ready.</p>
                  </div>
                </div>

                <FormFooter state={state} errorMsg={errorMsg} navigate={navigate}
                  label={state === 'uploading' ? 'Uploading…' : 'Upload & transcribe'}
                />
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function IndustryButton({
  ind, selected, onClick,
}: { ind: { value: string; label: string; icon: string }; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={ind.label}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center transition-all ${
        selected
          ? 'border-violet-500 bg-violet-50 text-violet-700'
          : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200'
      }`}
    >
      <span className="text-xl">{ind.icon}</span>
      <span className="text-[10px] font-medium leading-tight line-clamp-2">{ind.label}</span>
    </button>
  )
}

function FormFooter({
  state, errorMsg, navigate, label,
}: { state: State; errorMsg: string; navigate: (path: string) => void; label: string }) {
  const isSubmitting = ['creating', 'processing', 'uploading'].includes(state)
  return (
    <>
      {state === 'error' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMsg}</div>
      )}
      {state === 'processing' && (
        <div className="flex items-center gap-3 rounded-xl bg-violet-50 p-4 text-sm text-violet-700">
          <Spinner /> AI is analysing your transcript…
        </div>
      )}
      {state === 'uploading' && (
        <div className="flex items-center gap-3 rounded-xl bg-violet-50 p-4 text-sm text-violet-700">
          <Spinner /> Uploading your recording…
        </div>
      )}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
        >
          {isSubmitting && <Spinner size="sm" />}
          {label}
        </button>
        <button type="button" onClick={() => navigate('/dashboard')}
          className="rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:text-slate-800"
        >
          Cancel
        </button>
      </div>
    </>
  )
}
