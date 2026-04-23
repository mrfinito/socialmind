'use client'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'
import type { Platform } from '@/lib/types'

export default function AnalitykaPage() {
  const { state, projectDrafts, dna, selectedPlatforms , projectMaterials } = useStore()
  const posts = (projectDrafts || []).filter(p => p && Array.isArray(p.platforms))

  // Compute stats from saved posts
  const total = posts.length
  const platformCounts = PLATFORMS.map(p => ({
    ...p,
    count: posts.filter(post => post.platforms.includes(p.id as Platform)).length,
  })).sort((a, b) => b.count - a.count)

  // Posts per day (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const label = d.toLocaleDateString('pl', { day: 'numeric', month: 'short' })
    const count = posts.filter(p => {
      const pd = new Date(p.createdAt)
      return pd.toDateString() === d.toDateString()
    }).length
    return { label, count }
  })

  const maxCount = Math.max(...last14.map(d => d.count), 1)

  const STAT_CARDS = [
    { label: 'Łącznie postów', value: total.toString(), icon: '✦', color: 'indigo' },
    { label: 'Platform aktywnych', value: (selectedPlatforms || []).length.toString(), icon: '⊹', color: 'purple' },
    { label: 'Materiałów', value: (projectMaterials || []).length.toString(), icon: '⊡', color: 'teal' },
    { label: 'Brand DNA', value: dna ? 'Aktywne' : 'Brak', icon: '◉', color: dna ? 'emerald' : 'gray' },
  ]

  const colorMap: Record<string, string> = {
    indigo: 'rgba(99,102,241,0.15)', purple: 'rgba(168,85,247,0.15)',
    teal: 'rgba(20,184,166,0.15)', emerald: 'rgba(16,185,129,0.15)', gray: 'rgba(107,114,128,0.15)',
  }
  const textColorMap: Record<string, string> = {
    indigo: '#a5b4fc', purple: '#d8b4fe', teal: '#5eead4', emerald: '#6ee7b7', gray: '#9ca3af',
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Analityka</h1>
          <p className="text-gray-500 text-sm mt-1">Statystyki aktywności w aplikacji</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {STAT_CARDS.map(s => (
            <div key={s.label} className="card p-5" style={{ background: '#181c27' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: colorMap[s.color], color: textColorMap[s.color] }}>
                  {s.icon}
                </div>
              </div>
              <p className="text-2xl font-semibold" style={{ color: textColorMap[s.color] }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5 mb-5">
          {/* Activity chart */}
          <div className="card col-span-2">
            <h3 className="text-sm font-semibold text-white mb-5">Aktywność (14 dni)</h3>
            <div className="flex items-end gap-1.5 h-32">
              {last14.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(4, (d.count / maxCount) * 100)}%`,
                      background: d.count > 0 ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.06)',
                    }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {last14.filter((_, i) => i % 2 === 0).map((d, i) => (
                <span key={i} className="text-[10px] text-gray-600">{d.label}</span>
              ))}
            </div>
          </div>

          {/* Platform breakdown */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">Platformy</h3>
            <div className="space-y-3">
              {platformCounts.map(p => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span>{p.emoji}</span> {p.name}
                    </span>
                    <span className="text-xs font-medium text-gray-300">{p.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${total > 0 ? (p.count / total) * 100 : 0}%`,
                      background: 'rgba(99,102,241,0.7)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}
              {total === 0 && <p className="text-xs text-gray-600 text-center py-2">Brak danych</p>}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Ostatnia aktywność</h3>
          {posts.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">Brak historii — zacznij generować posty</p>
          ) : (
            <div className="space-y-1">
              {posts.slice(0, 8).map(p => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-all">
                  <div className="flex gap-0.5 shrink-0">
                    {p.platforms.slice(0, 2).map(plt => {
                      const pconf = PLATFORMS.find(x => x.id === plt)
                      return <span key={plt} className="text-sm">{pconf?.emoji}</span>
                    })}
                  </div>
                  <p className="flex-1 text-sm text-gray-300 truncate">{p.topic || 'Post'}</p>
                  <p className="text-xs text-gray-600 shrink-0">
                    {new Date(p.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
