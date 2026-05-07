import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, createOrganization, listOrganizations } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Organization } from '../types'
import { useToast } from './Toast'

interface SidebarProps {
  activeOrgId: string | null
  onOrgChange: (orgId: string | null) => void
}

export function Sidebar({ activeOrgId, onOrgChange }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [showOrgMenu, setShowOrgMenu] = useState(false)
  const [showNewOrg, setShowNewOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgIndustry, setNewOrgIndustry] = useState('general')
  const [creating, setCreating] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listOrganizations()
      .then(setOrgs)
      .catch(() => toast.error('Failed to load workspaces'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOrgMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setCreating(true)
    try {
      const org = await createOrganization(newOrgName.trim(), newOrgIndustry)
      setOrgs(prev => [...prev, org])
      onOrgChange(org.id)
      setShowNewOrg(false)
      setNewOrgName('')
      setNewOrgIndustry('general')
      setShowOrgMenu(false)
      toast.success(`Workspace "${org.name}" created`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Failed to create workspace'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const activeOrg = orgs.find(o => o.id === activeOrgId)
  const workspaceName = activeOrg ? activeOrg.name : 'Personal'
  const workspaceInitial = workspaceName[0].toUpperCase()

  function navLink(to: string, label: string, icon: string) {
    const active = location.pathname === to || location.pathname.startsWith(to + '/')
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? 'bg-violet-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span className="text-base">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-slate-900 px-3 py-4">
      {/* Workspace selector */}
      <div className="relative mb-4" ref={menuRef}>
        <button
          onClick={() => setShowOrgMenu(v => !v)}
          className="flex w-full items-center gap-3 rounded-lg bg-slate-800 px-3 py-2.5 text-left hover:bg-slate-700"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-xs font-bold text-white">
            {workspaceInitial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{workspaceName}</p>
            <p className="text-xs text-slate-400">{activeOrg ? activeOrg.plan : 'personal'}</p>
          </div>
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showOrgMenu && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
            <button
              onClick={() => { onOrgChange(null); setShowOrgMenu(false) }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                activeOrgId === null ? 'text-violet-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-600 text-xs font-bold">P</span>
              Personal
            </button>

            {orgs.map(org => (
              <button
                key={org.id}
                onClick={() => { onOrgChange(org.id); setShowOrgMenu(false) }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                  activeOrgId === org.id ? 'text-violet-400' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-violet-700 text-xs font-bold text-white">
                  {org.name[0].toUpperCase()}
                </span>
                <span className="truncate">{org.name}</span>
                {org.role === 'owner' && (
                  <span className="ml-auto text-xs text-slate-500">owner</span>
                )}
              </button>
            ))}

            <div className="my-1 border-t border-slate-700" />

            {showNewOrg ? (
              <form onSubmit={handleCreateOrg} className="px-3 py-2">
                <input
                  autoFocus
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  placeholder="Organization name"
                  maxLength={100}
                  className="mb-2 w-full rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-white placeholder-slate-400 outline-none focus:border-violet-500"
                />
                <select
                  value={newOrgIndustry}
                  onChange={e => setNewOrgIndustry(e.target.value)}
                  className="mb-2 w-full rounded border border-slate-600 bg-slate-700 px-2 py-1.5 text-sm text-white outline-none focus:border-violet-500"
                >
                  <option value="general">General Business</option>
                  <option value="it">Technology / IT</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance / Banking</option>
                  <option value="education">Education</option>
                  <option value="sales">Sales & Marketing</option>
                  <option value="legal">Legal / Compliance</option>
                  <option value="hr">Human Resources</option>
                  <option value="realestate">Real Estate</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !newOrgName.trim()}
                    className="flex-1 rounded bg-violet-600 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating…' : 'Create workspace'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewOrg(false); setNewOrgName('') }}
                    className="flex-1 rounded bg-slate-700 py-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowNewOrg(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white"
              >
                <span className="text-lg leading-none">+</span>
                New organization
              </button>
            )}
          </div>
        )}
      </div>

      {/* Brand */}
      <div className="mb-5 px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-black">P</div>
          <span className="text-base font-bold text-white tracking-tight">Prism</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 pl-9">Meeting Intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navLink('/dashboard', 'Dashboard', '📊')}
        {navLink('/calendar', 'Calendar', '📅')}
        {navLink('/meetings/new', 'New Meeting', '➕')}
        {activeOrgId && navLink(`/org/${activeOrgId}/members`, 'Team Members', '👥')}
        {activeOrgId && navLink(`/org/${activeOrgId}/settings`, 'Workspace Settings', '⚙️')}
      </nav>

      {/* User section */}
      <div className="mt-auto border-t border-slate-800 pt-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <span>🚪</span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
