// File: frontend/src/pages/AuthCallbackPage.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      // PKCE flow — exchange the one-time code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        navigate(error ? '/login' : '/dashboard', { replace: true })
      })
    } else {
      // Password / implicit flow — session already in storage
      supabase.auth.getSession().then(({ data }) => {
        navigate(data.session ? '/dashboard' : '/login', { replace: true })
      })
    }
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