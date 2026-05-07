import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ApiError,
  deleteCalendarIntegration,
  getOrganization,
  listCalendarIntegrations,
  updateOrganization,
  upsertCalendarIntegration,
} from '../lib/api'
import { Sidebar } from '../components/Sidebar'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import type { CalendarIntegration, Organization } from '../types'
import { INDUSTRIES } from '../types'

const CALENDAR_PROVIDERS = [
  {
    id: 'google' as const,
    label: 'Google Calendar',
    icon: '🟢',
    description: 'Sync with Google Calendar and Google Meet',
    setupUrl: 'https://console.cloud.google.com/',
  },
  {
    id: 'microsoft' as const,
    label: 'Microsoft Outlook',
    icon: '🔵',
    description: 'Sync with Outlook Calendar and Microsoft Teams',
    setupUrl: 'https://portal.azure.com/',
  },
  {
    id: 'apple' as const,
    label: 'Apple Calendar',
    icon: '🍎',
    description: 'Sync with iCloud Calendar',
    setupUrl: 'https://appleid.apple.com/',
  },
]

const ORG_SIZES = [
  { value: 'solo',       label: 'Solo (1 person)' },
  { value: 'small',      label: 'Small (2–10)' },
  { value: 'medium',     label: 'Medium (11–50)' },
  { value: 'large',      label: 'Large (51–200)' },
  { value: 'enterprise', label: 'Enterprise (200+)' },
]

export function OrgSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate  = useNavigate()
  const toast     = useToast()

  const [org, setOrg]         = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const [name, setName]         = useState('')
  const [industry, setIndustry] = useState('general')
  const [size, setSize]         = useState('small')
  const [website, setWebsite]   = useState('')

  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([])
  const [_intLoading, _setIntLoading]     = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    Promise.all([
      getOrganization(orgId),
      listCalendarIntegrations(),
    ])
      .then(([o, ints]) => {
        setOrg(o)
        setName(o.name)
        setIndustry(o.industry)
        setSize(o.size)
        setWebsite(o.website ?? '')
        setIntegrations(ints)
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)
    try {
      const updated = await updateOrganization(orgId, {
        name: name.trim(),
        industry,
        size,
        website: website.trim() || undefined,
      })
      setOrg(updated)
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleConnectCalendar(provider: 'google' | 'microsoft' | 'apple') {
    setConnectingId(provider)
    try {
      const email = prompt(`Enter the ${provider} account email to link (OAuth integration coming soon):`)
      if (!email) return
      const int = await upsertCalendarIntegration({
        provider,
        external_email: email,
        auto_import: true,
        auto_create: true,
      })
      setIntegrations(prev => {
        const existing = prev.findIndex(i => i.provider === provider)
        if (existing >= 0) {
          const copy = [...prev]
          copy[existing] = int
          return copy
        }
        return [...prev, int]
      })
      toast.success(`${provider} Calendar connected`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : 'Failed to connect calendar')
    } finally {
      setConnectingId(null)
    }
  }

  async function handleDisconnect(int: CalendarIntegration) {
    if (!confirm(`Disconnect ${int.provider} calendar?`)) return
    try {
      await deleteCalendarIntegration(int.id)
      setIntegrations(prev => prev.filter(i => i.id !== int.id))
      toast.success('Calendar disconnected')
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar activeOrgId={orgId ?? null} onOrgChange={id => id && navigate(`/org/${id}/settings`)} />
        <main className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeOrgId={orgId ?? null} onOrgChange={id => id && navigate(`/org/${id}/settings`)} />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700"
        >
          ← Back to dashboard
        </button>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Workspace Settings</h1>

        <div className="mx-auto max-w-2xl space-y-6">
          {/* ── General settings ── */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-slate-800">Organization details</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Organization name *</label>
                <input
                  required value={name} onChange={e => setName(e.target.value)} maxLength={100}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Industry</label>
                  <select value={industry} onChange={e => setIndustry(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
                  >
                    {INDUSTRIES.map(i => (
                      <option key={i.value} value={i.value}>{i.icon} {i.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Company size</label>
                  <select value={size} onChange={e => setSize(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
                  >
                    {ORG_SIZES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Website <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="url" value={website} onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit" disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {saving && <Spinner size="sm" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>

          {/* ── Plan info ── */}
          {org && (
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-slate-800">Plan</h2>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${
                    org.plan === 'enterprise' ? 'bg-amber-100 text-amber-700' :
                    org.plan === 'pro'        ? 'bg-violet-100 text-violet-700' :
                                               'bg-slate-100 text-slate-600'
                  }`}>
                    {org.plan}
                  </span>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {org.plan === 'free' ? 'Upgrade to unlock unlimited meetings, all integrations, and team features.' : 'All features included.'}
                  </p>
                </div>
                {org.plan === 'free' && (
                  <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                    Upgrade →
                  </button>
                )}
              </div>
            </section>
          )}

          {/* ── Calendar integrations ── */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Calendar integrations</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Connect your calendar to automatically schedule and sync meetings.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {CALENDAR_PROVIDERS.map(provider => {
                const connected = integrations.find(i => i.provider === provider.id)
                const isConnecting = connectingId === provider.id

                return (
                  <div key={provider.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-2xl">
                        {provider.icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{provider.label}</p>
                        <p className="text-xs text-slate-500">
                          {connected
                            ? `Connected as ${connected.external_email ?? 'unknown'}`
                            : provider.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {connected ? (
                        <>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            ✓ Connected
                          </span>
                          <button
                            onClick={() => handleDisconnect(connected)}
                            className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnectCalendar(provider.id)}
                          disabled={!!connectingId}
                          className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                        >
                          {isConnecting && <Spinner size="sm" />}
                          {isConnecting ? 'Connecting…' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Full OAuth flows for Google, Microsoft, and Apple Calendar are coming in Phase 2.
              Connecting now stores your preferences for when the integration launches.
            </p>
          </section>

          {/* ── Danger zone ── */}
          <section className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-base font-bold text-rose-700">Danger zone</h2>
            <p className="mb-4 text-sm text-slate-500">
              Deleting this workspace is permanent. All meetings, notes, and action items will be lost.
            </p>
            <button
              onClick={() => toast.info('Contact support to delete your workspace.')}
              className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              Delete workspace
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}
