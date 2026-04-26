'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface AdVariant {
  id: string
  angle: string
  headline: string
  primaryText: string
  description: string
  cta: string
  hashtags: string[]
  imageIdea: string
}

interface Audience {
  name: string
  type: 'core' | 'lookalike' | 'retargeting'
  demographics: { ageMin: number; ageMax: number; gender: string; locations: string[] }
  interests: string[]
  behaviors: string[]
  rationale: string
}

interface MetaAdsData {
  variants: AdVariant[]
  audiences: Audience[]
  tips: string[]
  estimatedBudget: { daily: string; test: string; rationale: string }
}

const GOALS = [
  { id: 'conversions', label: '🎯 Konwersje (sprzedaż)' },
  { id: 'traffic', label: '🌐 Ruch na stronie' },
  { id: 'awareness', label: '📣 Świadomość marki' },
  { id: 'leads', label: '📋 Lead generation' },
  { id: 'engagement', label: '💬 Zaangażowanie' },
  { id: 'app-installs', label: '📱 Instalacje aplikacji' },
]

export default function MetaAdsPage() {
  const { dna, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'
  const [product, setProduct] = useState('')
  const [goal, setGoal] = useState('conversions')
  const [offer, setOffer] = useState('')
  const [usp, setUsp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<MetaAdsData | null>(null)
  const [history, setHistory] = useState<HistoryEntry<MetaAdsData>[]>([])
  const [activeVariant, setActiveVariant] = useState(0)

  useEffect(() => {
    setHistory(historyLoad<MetaAdsData>('meta-ads', projectId))
  }, [projectId])

  async function generate() {
    if (product.length < 5) { setError('Opisz produkt'); return }
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/meta-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, goal, offer, usp, dna }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave<MetaAdsData>('meta-ads', projectId, {
        title: product.slice(0, 60),
        subtitle: `${goal} · ${j.data.variants?.length || 0} wariantów`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setLoading(false)
    }
  }

  function copyAll(v: AdVariant) {
    const text = `Headline: ${v.headline}\n\nPrimary text: ${v.primaryText}\n\nDescription: ${v.description}\n\nCTA: ${v.cta}\n\n${v.hashtags.join(' ')}`
    navigator.clipboard.writeText(text)
  }

  function exportCSV() {
    if (!data || !data.variants?.length) return
    const headers = ['Variant', 'Angle', 'Headline', 'Primary Text', 'Description', 'CTA', 'Hashtags', 'Image Idea']
    const rows = data.variants.map(v => [
      v.id, v.angle, v.headline, v.primaryText, v.description, v.cta, v.hashtags?.join(' ') || '', v.imageIdea
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meta-ads-${product.replace(/[^a-z0-9]/gi, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">📣 Meta Ads Generator</h1>
          <p className="text-gray-500 text-sm mt-1">5 wariantów reklamy + targeting suggestions + eksport CSV gotowy do importu w Meta Ads Manager</p>
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📚 Ostatnie reklamy ({history.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {history.slice(0, 6).map(h => (
                <button key={h.id} onClick={() => { setData(h.data); setProduct(h.title); setActiveVariant(0) }}
                  className="text-left p-3 rounded-xl transition-all hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-semibold text-white line-clamp-2 mb-1">{h.title}</p>
                  {h.subtitle && <p className="text-[11px] text-indigo-400">{h.subtitle}</p>}
                  <p className="text-[10px] text-gray-600 mt-1">{new Date(h.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-4">
            <div className="card">
              <label className="label">📦 Produkt / usługa *</label>
              <textarea className="input" rows={2} value={product} onChange={e => setProduct(e.target.value)}
                placeholder="np. Premium kawa specialty z lokalnej palarni — pakiety subskrypcyjne 250g/500g/1kg" />
            </div>

            <div className="card">
              <label className="label">🎯 Cel kampanii</label>
              <div className="grid grid-cols-3 gap-2">
                {GOALS.map(g => (
                  <button key={g.id} onClick={() => setGoal(g.id)}
                    className="text-sm py-2.5 px-3 rounded-lg transition-all"
                    style={{
                      background: goal === g.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      border: goal === g.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      color: goal === g.id ? '#a5b4fc' : '#9ca3af',
                    }}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="label">💰 Oferta</label>
              <input className="input" value={offer} onChange={e => setOffer(e.target.value)}
                placeholder="np. -20% na pierwszą subskrypcję, darmowa dostawa" />
            </div>

            <div className="card">
              <label className="label">⭐ USP / wyróżniki (opcjonalnie)</label>
              <textarea className="input" rows={2} value={usp} onChange={e => setUsp(e.target.value)}
                placeholder="np. Single origin, palone w Warszawie, dostawa w 24h, eko-opakowania" />
            </div>

            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}

            <button onClick={generate} disabled={loading || product.length < 5}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '✦ Generuję 5 wariantów reklamy...' : '✦ Wygeneruj reklamy Meta Ads'}
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">5 wariantów + {data.audiences?.length || 0} grup docelowych</h2>
              <div className="flex gap-2">
                <button onClick={exportCSV} className="btn-secondary text-xs">📥 Eksport CSV</button>
                <button onClick={() => setData(null)} className="btn-ghost text-xs">+ Nowa</button>
              </div>
            </div>

            {/* Variants tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2">
              {data.variants?.map((v, i) => (
                <button key={v.id} onClick={() => setActiveVariant(i)}
                  className="text-xs px-4 py-2 rounded-lg whitespace-nowrap transition-all"
                  style={{
                    background: activeVariant === i ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    border: activeVariant === i ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: activeVariant === i ? '#a5b4fc' : '#9ca3af',
                  }}>
                  {v.id.toUpperCase()} · {v.angle}
                </button>
              ))}
            </div>

            {/* Active variant */}
            {data.variants[activeVariant] && (() => {
              const v = data.variants[activeVariant]
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div className="card">
                    <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-1">Angle</p>
                    <p className="text-sm font-semibold text-white mb-4">{v.angle}</p>

                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Headline ({v.headline.length}/27)</p>
                    <p className="text-base font-bold text-white mb-3">{v.headline}</p>

                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Primary Text</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap mb-3 leading-relaxed">{v.primaryText}</p>

                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Description ({v.description.length}/27)</p>
                    <p className="text-sm text-gray-300 mb-3">{v.description}</p>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">CTA:</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300">{v.cta}</span>
                    </div>

                    {v.hashtags?.length > 0 && (
                      <p className="text-xs text-gray-500">{v.hashtags.join(' ')}</p>
                    )}

                    <button onClick={() => copyAll(v)} className="btn-secondary text-xs w-full mt-4">📋 Kopiuj cały wariant</button>
                  </div>

                  <div className="card">
                    <p className="text-[10px] uppercase tracking-wider text-orange-400 mb-2">🖼️ Pomysł na grafikę</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{v.imageIdea}</p>
                  </div>
                </div>
              )
            })()}

            {/* Audiences */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">🎯 Sugerowane grupy docelowe</h3>
              <div className="grid grid-cols-3 gap-3">
                {data.audiences?.map((a, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-white">{a.name}</p>
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded"
                        style={{
                          background: a.type === 'core' ? 'rgba(34,197,94,0.2)' : a.type === 'lookalike' ? 'rgba(99,102,241,0.2)' : 'rgba(251,146,60,0.2)',
                          color: a.type === 'core' ? '#86efac' : a.type === 'lookalike' ? '#a5b4fc' : '#fdba74',
                        }}>
                        {a.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">
                      {a.demographics.ageMin}-{a.demographics.ageMax} · {a.demographics.gender} · {a.demographics.locations.join(', ')}
                    </p>
                    {a.interests?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] text-gray-500 mb-1">Zainteresowania:</p>
                        <div className="flex flex-wrap gap-1">
                          {a.interests.map((int, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-300">{int}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {a.behaviors?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] text-gray-500 mb-1">Zachowania:</p>
                        <div className="flex flex-wrap gap-1">
                          {a.behaviors.map((b, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-300">{b}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-indigo-400/80 mt-2 italic">{a.rationale}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget + tips */}
            <div className="grid grid-cols-2 gap-4">
              {data.estimatedBudget && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-2">💰 Sugerowany budżet</h3>
                  <p className="text-2xl font-bold text-emerald-400 mb-1">{data.estimatedBudget.daily}</p>
                  <p className="text-xs text-gray-500 mb-2">{data.estimatedBudget.test}</p>
                  <p className="text-[11px] text-gray-400 italic">{data.estimatedBudget.rationale}</p>
                </div>
              )}
              {data.tips?.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-2">💡 Tips</h3>
                  <ul className="space-y-1.5">
                    {data.tips.map((t, i) => (
                      <li key={i} className="text-xs text-gray-300 flex gap-2">
                        <span className="text-indigo-400">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
