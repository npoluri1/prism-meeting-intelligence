import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Navbar() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-black">P</div>
          <span className="text-base font-bold text-slate-900 tracking-tight">Prism</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/calendar" className="text-sm text-gray-500 hover:text-gray-700">Calendar</Link>
          <Link to="/meetings/new"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            New Meeting
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
