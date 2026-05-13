// File: frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

let refreshLock: Promise<string | null> | null = null

export async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = session.expires_at ?? 0

  if (expiresAt - now < 120) {
    if (refreshLock) return refreshLock

    refreshLock = (async () => {
      try {
        const { data: refreshed, error } = await supabase.auth.refreshSession()
        if (error || !refreshed.session) return null
        return refreshed.session.access_token
      } finally {
        refreshLock = null
      }
    })()

    return refreshLock
  }

  return session.access_token
}

export async function getSessionTokenWithRetry(): Promise<string | null> {
  const token = await getSessionToken()
  if (token) return token

  await new Promise(r => setTimeout(r, 500))
  return getSessionToken()
}