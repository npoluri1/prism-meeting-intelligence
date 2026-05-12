// File: frontend/src/components/AuthGuard.tsx
import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner } from './Spinner'

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Call getSession() first — it awaits Supabase client initialization
    // and recovers sessions from URL hash or localStorage.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session) {
        setAuthenticated(true)
        setLoading(false)
      }
    })

    // Also listen for auth state changes — fires immediately with current session,
    // then on every subsequent change (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED).
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setAuthenticated(!!session)
      setLoading(false)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}