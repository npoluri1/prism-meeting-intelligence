import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, addOrgMember, listOrgMembers } from '../lib/api'
import { Sidebar } from '../components/Sidebar'
import { Spinner } from '../components/Spinner'
import type { OrgMember } from '../types'

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-700',
  admin: 'bg-violet-100 text-violet-700',
  member: 'bg-slate-100 text-slate-600',
}

export function OrgMembersPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    if (!orgId) return
    listOrgMembers(orgId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId || !email.trim()) return
    setAdding(true)
    setAddError('')
    try {
      await addOrgMember(orgId, email.trim(), role)
      const updated = await listOrgMembers(orgId)
      setMembers(updated)
      setEmail('')
    } catch (err) {
      setAddError(err instanceof ApiError ? err.detail : 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeOrgId={orgId ?? null} onOrgChange={(id) => id && navigate(`/org/${id}/members`)} />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700"
        >
          ← Back to dashboard
        </button>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Team Members</h1>

        <div className="mx-auto max-w-2xl space-y-6">
          {/* Add member */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Add a member</h2>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <button
                type="submit"
                disabled={adding}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {adding ? <Spinner size="sm" /> : 'Add'}
              </button>
            </form>
            {addError && (
              <p className="mt-2 text-sm text-rose-600">{addError}</p>
            )}
          </div>

          {/* Member list */}
          <div className="rounded-2xl bg-white shadow-sm">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                        {m.email[0].toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.email}</p>
                        <p className="text-xs text-slate-400">
                          Joined {new Date(m.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[m.role] ?? ROLE_BADGE.member}`}
                    >
                      {m.role}
                    </span>
                  </li>
                ))}
                {members.length === 0 && (
                  <li className="px-6 py-12 text-center text-sm text-slate-400">
                    No members yet. Add your first team member above.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
