'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Usage { used: number; limit: number; plan: string }

export default function LimitBanner() {
  const [usage, setUsage] = useState<Usage|null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('is_admin,plan').eq('id', user.id).single()
      if (profile?.is_admin) return // admins don't see limit banner

      const { data: perms } = await supabase
        .from('user_permissions').select('max_posts_per_month').eq('user_id', user.id).single()

      const planLimits: Record<string,number> = { free:10, pro:200, agency:9999 }
      const limit = perms?.max_posts_per_month ?? planLimits[profile?.plan||'free'] ?? 10

      const monthStart = new Date()
      monthStart.setDate(1); monthStart.setHours(0,0,0,0)

      const { count } = await supabase
        .from('drafts').select('*', { count:'exact', head:true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())

      const used = count || 0
      setUsage({ used, limit, plan: profile?.plan || 'free' })
    }
    load()
  }, [])

  if (!usage) return null
  const pct = Math.min((usage.used / usage.limit) * 100, 100)
  const isWarning = pct >= 80
  const isExceeded = pct >= 100

  if (pct < 50) return null // don't show when usage is low

  return (
    <div className="mx-8 mt-4 rounded-xl px-4 py-3 flex items-center gap-4"
      style={{
        background: isExceeded ? 'rgba(239,68,68,0.08)' : isWarning ? 'rgba(251,191,36,0.08)' : 'rgba(99,102,241,0.08)',
        border: `1px solid ${isExceeded ? 'rgba(239,68,68,0.25)' : isWarning ? 'rgba(251,191,36,0.25)' : 'rgba(99,102,241,0.2)'}`,
      }}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium" style={{color: isExceeded?'#f87171':isWarning?'#fbbf24':'#a5b4fc'}}>
            {isExceeded
              ? '🚫 Limit postów wyczerpany'
              : isWarning
              ? `⚠️ Zbliżasz się do limitu — ${usage.used}/${usage.limit} postów`
              : `📊 ${usage.used}/${usage.limit} postów w tym miesiącu`}
          </p>
          {isExceeded && (
            <Link href="/ustawienia" className="text-xs text-indigo-400 hover:text-indigo-300">
              Ulepsz plan →
            </Link>
          )}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
          <div className="h-full rounded-full transition-all"
            style={{
              width:`${pct}%`,
              background: isExceeded?'#f87171':isWarning?'#fbbf24':'#6366f1'
            }}/>
        </div>
      </div>
      {!isExceeded && (
        <p className="text-[10px] text-gray-600 shrink-0">
          Limit odnawia się 1.{new Date().getMonth()+2 > 12 ? 1 : new Date().getMonth()+2}
        </p>
      )}
    </div>
  )
}
