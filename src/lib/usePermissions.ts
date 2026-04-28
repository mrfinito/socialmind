'use client'
import { useState, useEffect } from 'react'
import { createClient } from './supabase'

export interface Permissions {
  // Główne
  can_strategia: boolean
  can_rtm: boolean
  can_asystent: boolean
  can_briefy: boolean
  can_wlasny_brief: boolean
  can_grafika: boolean
  can_prezentacja: boolean
  can_generate_posts: boolean
  // Praca codzienna
  can_biblioteka: boolean
  can_scheduler: boolean
  can_kalendarz: boolean
  can_analityka: boolean
  can_raport: boolean
  // Marka
  can_marka: boolean
  can_brand_dna: boolean
  can_platformy: boolean
  can_materialy: boolean
  can_stworzone: boolean
  can_news: boolean
  can_projekty: boolean
  can_wiadomosci: boolean
  // AI Tools
  can_copywriter: boolean
  can_content_score: boolean
  can_kampania: boolean
  can_persona: boolean
  can_listening: boolean
  can_wideo: boolean
  can_trendy: boolean
  can_competitor: boolean
  can_repurposing: boolean
  can_ab_testy: boolean
  // Specjaliści AI
  can_meta_ads: boolean
  can_performance: boolean
  can_storyboard: boolean
  can_crisis: boolean
  can_voice_checker: boolean
  can_newsletter: boolean
  can_caption_ab: boolean
  // Limits
  max_projects: number
  max_posts_per_month: number
}

const DEFAULT: Permissions = {
  can_strategia: true, can_rtm: true, can_asystent: true,
  can_briefy: true, can_wlasny_brief: true, can_grafika: true,
  can_prezentacja: true, can_generate_posts: true,
  can_biblioteka: true, can_scheduler: true, can_kalendarz: true,
  can_analityka: true, can_raport: true,
  can_marka: true, can_brand_dna: true, can_platformy: true,
  can_materialy: true, can_stworzone: true, can_news: true,
  can_projekty: true, can_wiadomosci: true,
  can_copywriter: true, can_content_score: true, can_kampania: true,
  can_persona: true, can_listening: true, can_wideo: true,
  can_trendy: true, can_competitor: true, can_repurposing: true,
  can_ab_testy: true,
  can_meta_ads: true, can_performance: true, can_storyboard: true,
  can_crisis: true, can_voice_checker: true, can_newsletter: true,
  can_caption_ab: true,
  max_projects: 999, max_posts_per_month: 9999,
}

export function usePermissions() {
  const [perms, setPerms] = useState<Permissions>(DEFAULT)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
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
          .single()

        // Admin always gets full access
        if (profile?.is_admin) { setLoaded(true); return }

        const { data: p } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (p) {
          setPerms({
            can_strategia: p.can_strategia ?? true,
            can_rtm: p.can_rtm ?? true,
            can_asystent: p.can_asystent ?? true,
            can_briefy: p.can_briefy ?? true,
            can_wlasny_brief: p.can_wlasny_brief ?? true,
            can_grafika: p.can_grafika ?? true,
            can_prezentacja: p.can_prezentacja ?? true,
            can_generate_posts: p.can_generate_posts ?? true,
            can_biblioteka: p.can_biblioteka ?? true,
            can_scheduler: p.can_scheduler ?? true,
            can_kalendarz: p.can_kalendarz ?? true,
            can_analityka: p.can_analityka ?? true,
            can_raport: p.can_raport ?? true,
            can_marka: p.can_marka ?? true,
            can_brand_dna: p.can_brand_dna ?? true,
            can_platformy: p.can_platformy ?? true,
            can_materialy: p.can_materialy ?? true,
            can_stworzone: p.can_stworzone ?? true,
            can_news: p.can_news ?? true,
            can_projekty: p.can_projekty ?? true,
            can_wiadomosci: p.can_wiadomosci ?? true,
            can_copywriter: p.can_copywriter ?? true,
            can_content_score: p.can_content_score ?? true,
            can_kampania: p.can_kampania ?? true,
            can_persona: p.can_persona ?? true,
            can_listening: p.can_listening ?? false,
            can_wideo: p.can_wideo ?? true,
            can_trendy: p.can_trendy ?? true,
            can_competitor: p.can_competitor ?? true,
            can_repurposing: p.can_repurposing ?? true,
            can_ab_testy: p.can_ab_testy ?? true,
            can_meta_ads: p.can_meta_ads ?? true,
            can_performance: p.can_performance ?? true,
            can_storyboard: p.can_storyboard ?? true,
            can_crisis: p.can_crisis ?? true,
            can_voice_checker: p.can_voice_checker ?? true,
            can_newsletter: p.can_newsletter ?? true,
            can_caption_ab: p.can_caption_ab ?? true,
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
