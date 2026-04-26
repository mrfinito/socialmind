'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface Strength { what: string; why: string }
interface Weakness { severity: string; what: string; why: string; impact: string }
interface Improvement { where: string; current: string; suggested: string; rationale: string }
interface ReviewData {
  verdict: string; score: number; executiveSummary: string
  strengths: Strength[]; weaknesses: Weakness[]
  missingElements: string[]; specificImprovements: Improvement[]
  redFlags: string[]; questions: string[]; nextSteps: string[]
}

const TYPES = [
  { id: 'post', label: '📝 Post' },
  { id: 'strategy', label: '🧭 Strategia' },
  { id: 'campaign', label: '🚀 Kampania' },
  { id: 'video', label: '🎬 Wideo' },
  { id: 'ad', label: '📣 Reklama' },
  { id: 'general', label: '✏️ Inne' },
]

export default function ReviewerPage() {
  const { dna, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'
  const [contentType, setContentType] = useState('post')
  const [content, setContent] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ReviewData | null>(null)
  const [history, setHistory] = useState<HistoryEntry<ReviewData & { content: string }>[]>([])

  useEffect(() => { setHistory(historyLoad('reviewer', projectId)) }, [projectId])

  async function review() {
    if (content.length < 50) { setError('Wklej treść (min 50 znaków)'); return }
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/ai-reviewer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, content, dna, context })
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave('reviewer', projectId, {
        title: content.slice(0, 60), subtitle: `${j.data.verdict} · ${j.data.score}/100`,
        data: { ...j.data, content }
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  const sevColor = (s: string) => s === 'blocker' ? '#ef4444' : s === 'major' ? '#fb923c' : '#fbbf24'

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🧐 AI Reviewer</h1>
          <p className="text-gray-500 text-sm mt-1">Senior content director ocenia Twoją treść — strategicznie, krytycznie, konstruktywnie</p>
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📚 Ostatnie ({history.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {history.slice(0, 6).map(h => (
                <button key={h.id} onClick={() => { setData(h.data); setContent(h.data.content) }}
                  className="text-left p-3 rounded-xl hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-white mb-1 line-clamp-2">{h.title}</p>
                  {h.subtitle && <p className="text-[10px] text-indigo-400">{h.subtitle}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-4">
            <div className="card">
              <label className="label">Typ treści</label>
              <div className="grid grid-cols-6 gap-2">
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => setContentType(t.id)}
                    className="p-2 rounded-lg text-xs"
                    style={{
                      background: contentType === t.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                      border: contentType === t.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      color: contentType === t.id ? '#a5b4fc' : '#9ca3af',
                    }}>{t.label}</button>
                ))}
              </div>
            </div>
            <div className="card">
              <label className="label">📝 Treść do oceny *</label>
              <textarea className="input" rows={10} value={content} onChange={e => setContent(e.target.value)}
                placeholder="Wklej post, strategie, kampanie, scenariusz... Dowolny content marketingowy" />
              <p className="text-[10px] text-gray-500 mt-1">{content.length} znaków</p>
            </div>
            <div className="card">
              <label className="label">📋 Kontekst (opcjonalnie)</label>
              <textarea className="input" rows={2} value={context} onChange={e => setContext(e.target.value)}
                placeholder="np. To kampania świąteczna 2025 dla branży beauty, target 25-35..." />
            </div>
            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}
            <button onClick={review} disabled={loading || content.length < 50}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '✦ Senior review w toku...' : '🧐 Zrób krytyczny review'}
            </button>
          </div>
        )}

        {data && (
          <div>
            <button onClick={() => setData(null)} className="btn-ghost text-sm mb-4">← Nowy review</button>

            <div className="card mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-3xl font-bold text-white">{data.verdict}</p>
                <p className="text-3xl font-bold" style={{color: data.score >= 80 ? '#34d399' : data.score >= 60 ? '#fbbf24' : '#fb923c'}}>{data.score}/100</p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{data.executiveSummary}</p>
            </div>

            {data.redFlags?.length > 0 && (
              <div className="card mb-4 bg-red-500/5 border-red-500/30">
                <h3 className="label" style={{color:'#fca5a5'}}>🚩 Red flags</h3>
                <ul className="space-y-1.5">{data.redFlags.map((r,i) => <li key={i} className="text-sm text-red-300">• {r}</li>)}</ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="card bg-emerald-500/5 border-emerald-500/20">
                <h3 className="label" style={{color:'#6ee7b7'}}>💪 Mocne strony</h3>
                <ul className="space-y-2">
                  {data.strengths?.map((s,i) => (
                    <li key={i}>
                      <p className="text-xs text-white">{s.what}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{s.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3 className="label">⚠️ Słabe strony</h3>
                <ul className="space-y-2">
                  {data.weaknesses?.map((w,i) => (
                    <li key={i}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{background:`${sevColor(w.severity)}22`,color:sevColor(w.severity)}}>{w.severity}</span>
                        <p className="text-xs text-white">{w.what}</p>
                      </div>
                      <p className="text-[10px] text-gray-500">{w.why}</p>
                      <p className="text-[10px] text-gray-400 italic">Impact: {w.impact}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {data.specificImprovements?.length > 0 && (
              <div className="card mb-4">
                <h3 className="label">🔧 Konkretne poprawki</h3>
                <div className="space-y-3">
                  {data.specificImprovements.map((imp,i) => (
                    <div key={i} className="p-3 rounded-lg" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
                      <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-2">📍 {imp.where}</p>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div><p className="text-[9px] text-gray-500 uppercase">Obecne</p><p className="text-xs text-gray-300">{imp.current}</p></div>
                        <div><p className="text-[9px] text-emerald-400 uppercase">Sugerowane</p><p className="text-xs text-emerald-200">{imp.suggested}</p></div>
                      </div>
                      <p className="text-[10px] text-gray-500">→ {imp.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <h3 className="label">❓ Pytania do przemyślenia</h3>
                <ul className="space-y-1.5">{data.questions?.map((q,i) => <li key={i} className="text-xs text-gray-300">• {q}</li>)}</ul>
              </div>
              <div className="card">
                <h3 className="label">➡️ Następne kroki</h3>
                <ul className="space-y-1.5">{data.nextSteps?.map((s,i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-indigo-400">{i+1}.</span>{s}</li>)}</ul>
              </div>
            </div>

            {data.missingElements?.length > 0 && (
              <div className="card mt-4 bg-orange-500/5 border-orange-500/20">
                <h3 className="label" style={{color:'#fdba74'}}>📭 Czego brakuje</h3>
                <ul className="space-y-1">{data.missingElements.map((m,i) => <li key={i} className="text-xs text-orange-200">• {m}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
