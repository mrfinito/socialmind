'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface Variant {
  id: string
  strategy: string
  hook: string
  fullCaption: string
  characters: number
  tactics: string[]
  hashtags: string[]
  predictedPerformance: { ctr: string; engagement: string; saves: string; rationale: string }
  bestFor: string
}

interface CaptionData {
  variants: Variant[]
  testingPlan: { duration: string; metrics: string[]; splitMethod: string; winnerCriteria: string }
  winner: { predictedVariant: string; confidence: string; rationale: string }
  tips: string[]
}

const PERF_COLORS: Record<string, string> = { high: '#10b981', medium: '#fbbf24', low: '#9ca3af' }

export default function CaptionABPage() {
  const { dna, activeProject, projectDrafts } = useStore()
  const projectId = activeProject?.id || 'default'
  const [idea, setIdea] = useState('')
  const [platform, setPlatform] = useState('Instagram')
  const [goal, setGoal] = useState('engagement')
  const [usePastData, setUsePastData] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<CaptionData | null>(null)
  const [history, setHistory] = useState<HistoryEntry<CaptionData>[]>([])
  const [activeVariant, setActiveVariant] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setHistory(historyLoad<CaptionData>('caption-ab', projectId))
  }, [projectId])

  async function generate() {
    if (idea.length < 10) { setError('Opisz pomysł (min 10 znaków)'); return }
    setLoading(true); setError(''); setData(null); setActiveVariant(0)
    try {
      const pastPosts = usePastData ? projectDrafts
        .filter(d => d.content)
        .slice(0, 10)
        .map(d => ({
          caption: typeof d.content === 'string' ? d.content : JSON.stringify(d.content).slice(0, 300),
          metrics: undefined,
        })) : undefined

      const res = await fetch('/api/caption-ab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, platform, goal, dna, pastPosts }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave<CaptionData>('caption-ab', projectId, {
        title: idea.slice(0, 60),
        subtitle: `${platform} · ${j.data.variants?.length || 5} wariantów`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally { setLoading(false) }
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🧪 Caption A/B Test</h1>
          <p className="text-gray-500 text-sm mt-1">5 RADYKALNIE różnych wariantów tego samego pomysłu — różne strategie, hooks, struktura. Idealnie do A/B testowania.</p>
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📚 Ostatnie testy ({history.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {history.slice(0, 6).map(h => (
                <button key={h.id} onClick={() => setData(h.data)}
                  className="text-left p-3 rounded-xl transition-all hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-white line-clamp-2 mb-1">{h.title}</p>
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
              <label className="label">💡 Pomysł na post</label>
              <textarea className="input" rows={3} value={idea} onChange={e => setIdea(e.target.value)}
                placeholder="np. Pokazujemy backstage z naszej kampanii zimowej — zespół przy pracy, ujęcia BTS, atmosfera" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <label className="label">📱 Platforma</label>
                <select className="input" value={platform} onChange={e => setPlatform(e.target.value)}>
                  <option>Instagram</option><option>Facebook</option><option>LinkedIn</option>
                  <option>Twitter/X</option><option>TikTok</option>
                </select>
              </div>
              <div className="card">
                <label className="label">🎯 Cel</label>
                <select className="input" value={goal} onChange={e => setGoal(e.target.value)}>
                  <option value="engagement">Engagement (komentarze, lajki)</option>
                  <option value="reach">Zasięg (wyświetlenia)</option>
                  <option value="saves">Saves (zapisy)</option>
                  <option value="shares">Shares (udostępnienia)</option>
                  <option value="clicks">Kliki w link/profil</option>
                  <option value="conversions">Konwersje (zakup/lead)</option>
                </select>
              </div>
            </div>
            {projectDrafts.length > 0 && (
              <div className="card flex items-center gap-3">
                <input type="checkbox" id="pastData" checked={usePastData} onChange={e => setUsePastData(e.target.checked)} />
                <label htmlFor="pastData" className="text-sm text-gray-300 cursor-pointer">
                  Użyj danych z {projectDrafts.length} poprzednich postów żeby AI dopasowało styl do tego co działa na Twoim koncie
                </label>
              </div>
            )}
            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}
            <button onClick={generate} disabled={loading || idea.length < 10}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '⏳ Generuję 5 wariantów...' : '🧪 Wygeneruj 5 wariantów A/B'}
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">5 wariantów captionów do testu</h2>
              <button onClick={() => setData(null)} className="btn-ghost text-xs">+ Nowy test</button>
            </div>

            {/* Winner prediction */}
            {data.winner && (
              <div className="card" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏆</span>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-0.5">AI predicts winner ({data.winner.confidence} confidence)</p>
                    <p className="text-sm text-white">Wariant <strong className="text-emerald-300">{data.winner.predictedVariant?.toUpperCase()}</strong> — {data.winner.rationale}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2">
              {data.variants?.map((v, i) => {
                const isWinner = v.id === data.winner?.predictedVariant
                return (
                  <button key={v.id} onClick={() => setActiveVariant(i)}
                    className="text-xs px-4 py-2 rounded-lg whitespace-nowrap transition-all"
                    style={{
                      background: activeVariant === i ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                      border: activeVariant === i ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: activeVariant === i ? '#a5b4fc' : '#9ca3af',
                    }}>
                    {isWinner && '🏆 '}{v.id.toUpperCase()} · {v.strategy.split(' - ')[0]}
                  </button>
                )
              })}
            </div>

            {/* Active variant */}
            {data.variants[activeVariant] && (() => {
              const v = data.variants[activeVariant]
              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Strategy</p>
                        <p className="text-sm font-semibold text-white">{v.strategy}</p>
                      </div>
                      <button onClick={() => copy(v.fullCaption, v.id)} className="btn-secondary text-xs">
                        {copied === v.id ? '✓ Skopiowano' : '📋 Kopiuj'}
                      </button>
                    </div>

                    <p className="text-[10px] uppercase text-gray-500 mb-1">Hook (pierwsze zdanie)</p>
                    <p className="text-base font-semibold text-white mb-4 p-3 rounded" style={{ background: 'rgba(99,102,241,0.08)' }}>
                      {v.hook}
                    </p>

                    <p className="text-[10px] uppercase text-gray-500 mb-1">Pełny caption ({v.characters} znaków)</p>
                    <div className="p-3 rounded mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{v.fullCaption}</p>
                    </div>

                    {v.hashtags?.length > 0 && (
                      <p className="text-xs text-gray-500 mb-3">{v.hashtags.join(' ')}</p>
                    )}

                    {v.tactics?.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase text-gray-500 mb-2">Taktyki użyte</p>
                        <div className="flex flex-wrap gap-1.5">
                          {v.tactics.map((t, i) => (
                            <span key={i} className="text-[11px] px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-3">Predykcja</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">CTR:</span>
                        <span className="font-semibold uppercase" style={{ color: PERF_COLORS[v.predictedPerformance?.ctr] || '#9ca3af' }}>{v.predictedPerformance?.ctr}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Engagement:</span>
                        <span className="font-semibold uppercase" style={{ color: PERF_COLORS[v.predictedPerformance?.engagement] || '#9ca3af' }}>{v.predictedPerformance?.engagement}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Saves:</span>
                        <span className="font-semibold uppercase" style={{ color: PERF_COLORS[v.predictedPerformance?.saves] || '#9ca3af' }}>{v.predictedPerformance?.saves}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 italic mb-3">{v.predictedPerformance?.rationale}</p>
                    <div className="pt-3 border-t border-white/5">
                      <p className="text-[10px] uppercase text-gray-500 mb-1">Best for</p>
                      <p className="text-xs text-gray-300">{v.bestFor}</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Testing plan */}
            {data.testingPlan && (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">📋 Plan testu A/B</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 mb-1">Duration</p>
                    <p className="text-sm text-white">{data.testingPlan.duration}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 mb-1">Metrics</p>
                    <p className="text-sm text-white">{data.testingPlan.metrics?.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 mb-1">Split</p>
                    <p className="text-sm text-white">{data.testingPlan.splitMethod}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 mb-1">Winner criteria</p>
                    <p className="text-sm text-white">{data.testingPlan.winnerCriteria}</p>
                  </div>
                </div>
              </div>
            )}

            {data.tips?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2">💡 Tips</h3>
                <ul className="space-y-1.5">
                  {data.tips.map((t, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-indigo-400">•</span><span>{t}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
