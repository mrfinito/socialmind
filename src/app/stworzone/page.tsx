'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'

interface HistoryItem {
  id: string
  projectId: string
  module: string
  title: string
  subtitle?: string
  data: unknown
  createdAt: string
}

interface GrafikaItem {
  url: string
  prompt: string
  platform: string
  provider: string
  idea: string
  createdAt: string
}

interface AggregatedItem {
  id: string
  module: string
  title: string
  subtitle?: string
  createdAt: string
  href: string
  thumbnail?: string
  type: 'grafika' | 'historia'
}

const MODULE_INFO: Record<string, { icon: string; label: string; href: string; color: string }> = {
  strategia:      { icon: '🧭', label: 'Strategia',         href: '/strategia',     color: '#a5b4fc' },
  rtm:            { icon: '⚡', label: 'RTM',               href: '/rtm',           color: '#fbbf24' },
  kampania:       { icon: '🚀', label: 'Kampania 360°',     href: '/kampania',      color: '#34d399' },
  persona:        { icon: '👤', label: 'Persona',           href: '/persona',       color: '#f472b6' },
  wideo:          { icon: '🎬', label: 'Skrypt wideo',      href: '/wideo',         color: '#fb923c' },
  'ab-testy':     { icon: '🧪', label: 'A/B Test',          href: '/ab-testy',      color: '#60a5fa' },
  'content-score':{ icon: '📊', label: 'Content Score',     href: '/content-score', color: '#34d399' },
  listening:      { icon: '👁', label: 'Social Listening',  href: '/listening',     color: '#a78bfa' },
  trendy:         { icon: '📈', label: 'Trendy',            href: '/trendy',        color: '#fbbf24' },
  'wlasny-brief': { icon: '📂', label: 'Własny brief',      href: '/wlasny-brief',  color: '#a5b4fc' },
  copywriter:     { icon: '✍️', label: 'AI Copywriter',     href: '/copywriter',    color: '#a5b4fc' },
  repurposing:    { icon: '♻️', label: 'Repurposing',       href: '/repurposing',   color: '#34d399' },
  raport:         { icon: '📊', label: 'Raport',            href: '/raport',        color: '#60a5fa' },
  prezentacja:    { icon: '🎤', label: 'Prezentacja',       href: '/prezentacja',   color: '#fbbf24' },
  'meta-ads':     { icon: '📣', label: 'Meta Ads',          href: '/meta-ads',      color: '#3b82f6' },
  storyboard:     { icon: '🎬', label: 'Storyboard',        href: '/storyboard',    color: '#fb923c' },
  crisis:         { icon: '🚨', label: 'Crisis Response',   href: '/crisis',        color: '#ef4444' },
  'tone-checker': { icon: '🎯', label: 'Voice Checker',     href: '/tone-checker',  color: '#a855f7' },
  newsletter:     { icon: '📧', label: 'Newsletter',        href: '/newsletter',    color: '#34d399' },
  'caption-ab':   { icon: '🧪', label: 'Caption A/B',       href: '/caption-ab',    color: '#60a5fa' },
}

export default function StworzonePage() {
  const { state, projectDrafts } = useStore()
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [grafikaItems, setGrafikaItems] = useState<GrafikaItem[]>([])
  const [filterModule, setFilterModule] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Aggregate all history_* keys from localStorage
    const allHistory: HistoryItem[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('history_')) {
        try {
          const items = JSON.parse(localStorage.getItem(key) || '[]') as HistoryItem[]
          allHistory.push(...items)
        } catch {}
      }
    }
    setHistoryItems(allHistory)

    // Aggregate grafika history (different key format)
    try {
      const grafiki = JSON.parse(localStorage.getItem('sm:grafika:history') || '[]') as GrafikaItem[]
      setGrafikaItems(grafiki)
    } catch {}
  }, [])

  // Combine into single feed
  const allItems: AggregatedItem[] = useMemo(() => {
    const items: AggregatedItem[] = []
    
    historyItems.forEach(h => {
      const info = MODULE_INFO[h.module]
      if (!info) return
      items.push({
        id: h.id,
        module: h.module,
        title: h.title,
        subtitle: h.subtitle,
        createdAt: h.createdAt,
        href: info.href,
        type: 'historia',
      })
    })
    
    grafikaItems.forEach(g => {
      items.push({
        id: g.createdAt,
        module: 'grafika',
        title: g.idea,
        subtitle: `${g.platform} · ${g.provider === 'gemini' ? 'Nano Banana' : 'DALL-E'}`,
        createdAt: g.createdAt,
        href: '/grafika',
        thumbnail: g.url,
        type: 'grafika',
      })
    })
    
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return items
  }, [historyItems, grafikaItems])

  // Filter
  const filtered = allItems.filter(item => {
    if (filterModule !== 'all' && item.module !== filterModule) return false
    if (filterProject !== 'all') {
      const original = historyItems.find(h => h.id === item.id)
      if (original && original.projectId !== filterProject) return false
    }
    return true
  })

  // Stats per module
  const moduleStats = useMemo(() => {
    const stats: Record<string, number> = { grafika: grafikaItems.length }
    historyItems.forEach(h => {
      stats[h.module] = (stats[h.module] || 0) + 1
    })
    return stats
  }, [historyItems, grafikaItems])

  // Add grafika to module info
  const allModules = { ...MODULE_INFO, grafika: { icon: '🖼️', label: 'Grafiki', href: '/grafika', color: '#fb923c' } }
  const moduleEntries = Object.entries(allModules)
    .map(([key, info]) => ({ key, info, count: moduleStats[key] || 0 }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count)

  // Unique projects with content
  const projectsWithContent = state.projects.filter(p =>
    historyItems.some(h => h.projectId === p.id) || projectDrafts.length > 0
  )

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">📦 Stworzone materiały</h1>
          <p className="text-gray-500 text-sm mt-1">Wszystko co wygenerowałeś — strategie, posty, grafiki, prezentacje, raporty. Kliknij żeby wrócić.</p>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="card text-center">
            <p className="text-3xl font-bold text-white">{allItems.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Łącznie</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-indigo-400">{historyItems.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Opracowań AI</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-orange-400">{grafikaItems.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Grafiki</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-emerald-400">{moduleEntries.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Aktywnych modułów</p>
          </div>
        </div>

        {allItems.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-gray-400 mb-1">Jeszcze nic nie wygenerowałeś</p>
            <p className="text-xs text-gray-600">Wygenerowane treści automatycznie pojawią się tutaj</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6 items-start">
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFilterModule('all')}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: filterModule === 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    border: filterModule === 'all' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: filterModule === 'all' ? '#a5b4fc' : '#9ca3af',
                  }}>
                  Wszystko ({allItems.length})
                </button>
                {moduleEntries.map(({ key, info, count }) => (
                  <button key={key} onClick={() => setFilterModule(key)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: filterModule === key ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                      border: filterModule === key ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: filterModule === key ? info.color : '#9ca3af',
                    }}>
                    {info.icon} {info.label} ({count})
                  </button>
                ))}
              </div>
              {projectsWithContent.length > 1 && (
                <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg ml-auto"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                  <option value="all">Wszystkie projekty</option>
                  {projectsWithContent.map(p => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Items grid */}
            <div className="grid grid-cols-3 gap-4">
              {filtered.map(item => {
                const info = allModules[item.module as keyof typeof allModules]
                return (
                  <Link key={`${item.module}-${item.id}`} href={item.href}
                    className="block transition-all hover:border-indigo-500/40"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
                    {item.thumbnail ? (
                      <div className="aspect-video relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-1 rounded-full backdrop-blur"
                          style={{ background: 'rgba(0,0,0,0.6)', color: info?.color || '#9ca3af' }}>
                          {info?.icon} {info?.label}
                        </span>
                      </div>
                    ) : (
                      <div className="px-4 pt-4 flex items-center gap-2">
                        <span className="text-base">{info?.icon}</span>
                        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: info?.color || '#9ca3af' }}>
                          {info?.label}
                        </span>
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-white line-clamp-2 mb-1">{item.title}</p>
                      {item.subtitle && <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">{item.subtitle}</p>}
                      <p className="text-[10px] text-gray-600">
                        {new Date(item.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div className="card text-center py-12">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-gray-400">Brak materiałów dla wybranego filtra</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
