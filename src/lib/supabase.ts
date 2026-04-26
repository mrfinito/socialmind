// Browser client only — safe to import in Client Components
// Singleton pattern to avoid multiple gotrue locks
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let browserClient: SupabaseClient | undefined

export function createClient() {
  if (typeof window === 'undefined') {
    // SSR: always create new client
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return browserClient
}
