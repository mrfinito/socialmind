'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface Issue {
  severity: 'high' | 'medium' | 'low'
  category: string
  fragment: string
  problem: string
  fix: string
  rewrittenFragment: string
}

interface ToneData {
  overallScore: number
  verdict: string
  summary: string
  scores: { tone: number; vocabulary: number; values: number; audienceFit: number; platformOptimization: number }
  strengths: string[]
  issues: Issue[]
  suggestedRewrite?: string
  platformTips: string[]
  quickWins: string[]
}

const SEV_COLORS: Record<string, string> = { high: '#ef4444', medium: '#fbbf24', low: '#10b981' }

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#fbbf24' : '#ef4444'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }}></div>
      </div>
    </div>
  )
}

export default function ToneCheckerPage() {
  const { dna, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'
  const [text, setText] = useState('')
  const [platform, setPlatform] = useState('Instagram')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ToneData | null>(null)
  const [history, setHistory] = useState<HistoryEntry<ToneData>[]>([])
  const [showRewrite, setShowRewrite] = useState(false)

  useEffect(() => {
    setHistory(historyLoad<ToneData>('tone-checker', projectId))
  }, [projectId])

  async function check() {
    if (text.length < 10) { setError('Tekst musi mieć min 10 znaków'); return }
    setLoading(true); setError(''); setData(null); setShowRewrite(false)
    try {
      const res = await fetch('/api/tone-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, platform, dna }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave<ToneData>('tone-checker', projectId, {
        title: text.slice(0, 60),
        subtitle: `${platform} · score ${j.data.overallScore}/100`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally { setLoading(false) }
  }

  if (!dna?.brandName) {
    return (
      <AppShell>
        <div className="px-8 py-8 max-w-2xl">
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">🧬</p>
            <h2 className="text-lg font-semibold text-white mb-2">Brak Brand DNA</h2>
            <p className="text-gray-500 text-sm mb-4">Voice & Tone Checker porównuje tekst z Twoim Brand DNA. Skonfiguruj najpierw markę.</p>
            <a href="/marka" className="btn-primary inline-block">Skonfiguruj Brand DNA</a>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🎯 Voice & Tone Checker</h1>
          <p className="text-gray-500 text-sm mt-1">Wklej gotowy tekst — AI oceni zgodność z Brand DNA i poprawi błędy</p>
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📚 Ostatnie sprawdzenia ({history.length})</h3>
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
              <label className="label">📝 Tekst do sprawdzenia</label>
              <textarea className="input" rows={8} value={text} onChange={e => setText(e.target.value)}
                placeholder="Wklej post / caption / artykuł / komunikat..." />
              <p className="text-[10px] text-gray-600 mt-1">{text.length} znaków</p>
            </div>
            <div className="card">
              <label className="label">📱 Platforma</label>
              <select className="input" value={platform} onChange={e => setPlatform(e.target.value)}>
                <option>Instagram</option><option>Facebook</option><option>LinkedIn</option>
                <option>Twitter/X</option><option>TikTok</option><option>Newsletter</option>
                <option>Strona www</option><option>Blog</option>
              </select>
            </div>
            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}
            <button onClick={check} disabled={loading || text.length < 10}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '⏳ Analizuję...' : '🎯 Sprawdź zgodność z Brand DNA'}
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Wynik analizy</h2>
              <button onClick={() => setData(null)} className="btn-ghost text-xs">+ Sprawdź inny tekst</button>
            </div>

            {/* Overall score */}
            <div className="card text-center py-8">
              <div className="text-7xl font-bold mb-2"
                style={{ color: data.overallScore >= 80 ? '#10b981' : data.overallScore >= 60 ? '#fbbf24' : '#ef4444' }}>
                {data.overallScore}
              </div>
              <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">Score</p>
              <p className="text-base font-semibold text-white mb-3">{data.verdict?.replace('-', ' ').toUpperCase()}</p>
              <p className="text-sm text-gray-300 max-w-xl mx-auto">{data.summary}</p>
            </div>

            {/* Sub scores */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">📊 Score per kategoria</h3>
              <div className="grid grid-cols-5 gap-4">
                <ScoreBar label="Ton" score={data.scores?.tone || 0} />
                <ScoreBar label="Słownictwo" score={data.scores?.vocabulary || 0} />
                <ScoreBar label="Wartości" score={data.scores?.values || 0} />
                <ScoreBar label="Grupa docelowa" score={data.scores?.audienceFit || 0} />
                <ScoreBar label="Platforma" score={data.scores?.platformOptimization || 0} />
              </div>
            </div>

            {/* Strengths */}
            {data.strengths?.length > 0 && (
              <div className="card" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <h3 className="text-sm font-semibold text-emerald-300 mb-2">✓ Mocne strony</h3>
                <ul className="space-y-1.5">
                  {data.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-emerald-400">+</span><span>{s}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {/* Issues */}
            {data.issues?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">🔧 Problemy do poprawy ({data.issues.length})</h3>
                <div className="space-y-3">
                  {data.issues?.map((issue, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${SEV_COLORS[issue.severity]}30` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded"
                          style={{ background: `${SEV_COLORS[issue.severity]}30`, color: SEV_COLORS[issue.severity] }}>
                          {issue.severity}
                        </span>
                        <span className="text-[11px] text-gray-500 uppercase tracking-wider">{issue.category}</span>
                      </div>
                      <p className="text-sm text-gray-400 italic mb-2">&quot;{issue.fragment}&quot;</p>
                      <p className="text-sm text-white mb-2"><strong className="text-red-400">Problem:</strong> {issue.problem}</p>
                      <p className="text-sm text-white mb-2"><strong className="text-emerald-400">Poprawka:</strong> {issue.fix}</p>
                      {issue.rewrittenFragment && (
                        <div className="p-2 rounded mt-2" style={{ background: 'rgba(16,185,129,0.08)' }}>
                          <p className="text-[10px] uppercase text-emerald-400 mb-1">Powinno brzmieć:</p>
                          <p className="text-sm text-gray-200">{issue.rewrittenFragment}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick wins */}
            {data.quickWins?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2">⚡ Quick wins</h3>
                <ul className="space-y-1.5">
                  {data.quickWins.map((q, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-yellow-400">⚡</span><span>{q}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested rewrite */}
            {data.suggestedRewrite && (
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">✨ Sugerowana poprawiona wersja</h3>
                  <button onClick={() => { navigator.clipboard.writeText(data.suggestedRewrite!); setShowRewrite(true); setTimeout(() => setShowRewrite(false), 1500) }}
                    className="btn-secondary text-xs">{showRewrite ? '✓ Skopiowano' : '📋 Kopiuj'}</button>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{data.suggestedRewrite}</p>
                </div>
              </div>
            )}

            {/* Platform tips */}
            {data.platformTips?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2">📱 Tips dla {platform}</h3>
                <ul className="space-y-1.5">
                  {data.platformTips.map((t, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-indigo-400">→</span><span>{t}</span></li>
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
