import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const err = params.get('error')
    const errDesc = params.get('error_description')

    async function handleCallback() {
      if (err) {
        console.error('Auth callback error:', errDesc || err)
        if (!cancelled) navigate('/login?error=link_expired', { replace: true })
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!cancelled) navigate(error ? '/login' : '/dashboard', { replace: true })
      } else {
        const { data } = await supabase.auth.getSession()
        if (!cancelled) navigate(data.session ? '/dashboard' : '/login', { replace: true })
      }
    }
    handleCallback()

    return () => { cancelled = true }
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  )
}