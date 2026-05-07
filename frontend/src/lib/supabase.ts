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

export async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // Refresh the token if it expires within the next 60 seconds
  const now = Math.floor(Date.now() / 1000)
  if ((session.expires_at ?? 0) - now < 60) {
    const { data: refreshed, error } = await supabase.auth.refreshSession()
    if (error || !refreshed.session) return null
    return refreshed.session.access_token
  }

  return session.access_token
}