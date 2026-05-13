import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'

type Mode = 'password' | 'magic'
type State = 'idle' | 'loading' | 'sent' | 'error'

const FEATURES = [
  {
    icon: '🎵',
    title: 'Upload any recording',
    desc: 'Drop an MP3, MP4, WAV, or MOV — Prism transcribes and analyses it automatically.',
  },
  {
    icon: '📝',
    title: 'Paste any transcript',
    desc: 'Already have a transcript? Paste it in and get structured notes in seconds.',
  },
  {
    icon: '✅',
    title: 'Action items with owners',
    desc: 'Every task is extracted with its owner, priority, and due date — ready to track.',
  },
  {
    icon: '🎯',
    title: 'Decisions & risks',
    desc: 'Capture decisions made, risks flagged, and the suggested agenda for the follow-up.',
  },
  {
    icon: '🏭',
    title: '33 industry domains',
    desc: 'From healthcare to aerospace — context-aware AI that speaks your industry\'s language.',
  },
  {
    icon: '🏢',
    title: 'Multi-workspace',
    desc: 'Organise meetings across unlimited organisations with role-based access.',
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<State>(
    new URLSearchParams(window.location.search).get('error') === 'link_expired' ? 'error' : 'idle'
  )
  const [errorMsg, setErrorMsg] = useState(
    new URLSearchParams(window.location.search).get('error') === 'link_expired'
      ? 'This magic link has expired. Please request a new one.'
      : ''
  )

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setErrorMsg(error.message); setState('error') }
    else setState('sent')
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    })
    if (!signInErr) { navigate('/auth/callback', { replace: true }); return }
    if (signInErr.message.toLowerCase().includes('invalid login')) {
      const { error: signUpErr } = await supabase.auth.signUp({ email: email.trim(), password })
      if (signUpErr) { setErrorMsg(signUpErr.message); setState('error') }
      else navigate('/auth/callback', { replace: true })
    } else {
      setErrorMsg(signInErr.message); setState('error')
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Left panel — Prism branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-12 lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-lg font-black shadow-lg">
            P
          </div>
          <div>
            <p className="text-xl font-bold text-white tracking-tight">Prism</p>
            <p className="text-xs text-slate-400 -mt-0.5">Universal Meeting Intelligence</p>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Every conversation.<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Instant clarity.
              </span>
            </h1>
            <p className="mt-4 text-slate-400 leading-relaxed">
              Upload a recording or paste a transcript — Prism extracts action items,
              decisions, risks, and insights in seconds. Across any industry.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-xl bg-slate-800/60 p-3">
                <span className="text-xl shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div className="flex gap-6 border-t border-slate-800 pt-6">
            {[
              { n: '33', label: 'Industry domains' },
              { n: '9', label: 'Output categories' },
              { n: '< 60s', label: 'Time to insights' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-violet-400">{s.n}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">© 2026 Prism. All rights reserved.</p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-black">P</div>
            <div>
              <p className="font-bold text-white">Prism</p>
              <p className="text-xs text-slate-400">Universal Meeting Intelligence</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Get started</h2>
            <p className="mt-2 text-slate-400">Sign in or create a free account in seconds.</p>
          </div>

          {/* Mode toggle */}
          <div className="mb-6 flex rounded-xl border border-slate-700 bg-slate-800 p-1">
            {(['password', 'magic'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setState('idle') }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  mode === m ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'password' ? '🔑 Password' : '✉️ Magic Link'}
              </button>
            ))}
          </div>

          {state === 'sent' ? (
            <div className="rounded-2xl border border-emerald-800 bg-emerald-900/30 p-8 text-center">
              <p className="text-4xl">📬</p>
              <p className="mt-3 text-lg font-semibold text-emerald-300">Check your email</p>
              <p className="mt-2 text-sm text-emerald-400">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="mt-4 text-xs text-slate-500">
                Didn't get it? Check your spam folder or{' '}
                <button onClick={() => setState('idle')} className="text-violet-400 hover:underline">
                  try again
                </button>
              </p>
            </div>
          ) : (
            <form
              onSubmit={mode === 'password' ? handlePassword : handleMagicLink}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Work email</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              {mode === 'password' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
                  <input
                    type="password" required minLength={6} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    New to Prism? Enter an email + password to create your account.
                  </p>
                </div>
              )}

              {state === 'error' && (
                <div className="rounded-xl border border-rose-800 bg-rose-900/30 p-3 text-sm text-rose-300">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit" disabled={state === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {state === 'loading' && <Spinner size="sm" />}
                {mode === 'password' ? 'Sign in / Create account' : 'Send magic link'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-slate-600">
            By signing in you agree to Prism's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
