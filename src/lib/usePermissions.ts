'use client'
import { useState, useEffect } from 'react'
import { createClient } from './supabase'

interface Permissions {
  can_generate_posts: boolean; can_kampania: boolean; can_persona: boolean
  can_listening: boolean; can_competitor: boolean; can_repurposing: boolean
  can_ab_testy: boolean; can_wideo: boolean; can_copywriter: boolean
  can_content_score: boolean; can_trendy: boolean; can_raport: boolean
  max_projects: number; max_posts_per_month: number
}

const DEFAULT: Permissions = {
  can_generate_posts: true, can_kampania: true, can_persona: true,
  can_listening: true, can_competitor: true, can_repurposing: true,
  can_ab_testy: true, can_wideo: true, can_copywriter: true,
  can_content_score: true, can_trendy: true, can_raport: true,
  max_projects: 999, max_posts_per_month: 9999,
}

export function usePermissions() {
  const [perms, setPerms] = useState<Permissions>(DEFAULT)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Guard: don't run if env vars missing
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoaded(true)
      return
    }

    async function load() {
      try {
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) { setLoaded(true); return }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, plan')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.is_admin) { setLoaded(true); return }

        const { data: p } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (p) {
          setPerms({
            can_generate_posts: p.can_generate_posts ?? true,
            can_kampania: p.can_kampania ?? true,
            can_persona: p.can_persona ?? true,
            can_listening: p.can_listening ?? false,
            can_competitor: p.can_competitor ?? true,
            can_repurposing: p.can_repurposing ?? true,
            can_ab_testy: p.can_ab_testy ?? true,
            can_wideo: p.can_wideo ?? true,
            can_copywriter: p.can_copywriter ?? true,
            can_content_score: p.can_content_score ?? true,
            can_trendy: p.can_trendy ?? true,
            can_raport: p.can_raport ?? true,
            max_projects: p.max_projects ?? 3,
            max_posts_per_month: p.max_posts_per_month ?? 50,
          })
        }
      } catch (e) {
        console.error('usePermissions error:', e)
      } finally {
        setLoaded(true)
      }
    }
    load()
  }, [])

  return { perms, loaded }
}
