'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface ResponseOption {
  approach: string
  label: string
  text: string
  tone: string
  useWhen: string
}

interface CrisisData {
  analysis: {
    type: string; severity: string; sentiment: number
    publicVisibility: string; needsResponse: boolean
    responseUrgency: string; keyTriggers: string[]
    underlying_emotion: string
  }
  responses: ResponseOption[]
  actions: { immediate: string[]; shortTerm: string[]; longTerm: string[] }
  doNotDo: string[]
  monitoring: { watchFor: string[]; escalateIf: string }
  playbook: { title: string; steps: string[] }
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#10b981', medium: '#fbbf24', high: '#f97316', critical: '#ef4444'
}

export default function CrisisPage() {
  const { dna, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'
  const [commentText, setCommentText] = useState('')
  const [context, setContext] = useState('')
  const [platform, setPlatform] = useState('Facebook')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<CrisisData | null>(null)
  const [history, setHistory] = useState<HistoryEntry<CrisisData>[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setHistory(historyLoad<CrisisData>('crisis', projectId))
  }, [projectId])

  async function analyze() {
    if (commentText.length < 3) { setError('Wklej komentarz'); return }
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/crisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentText, context, platform, dna }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave<CrisisData>('crisis', projectId, {
        title: commentText.slice(0, 60),
        subtitle: `${platform} · ${j.data.analysis?.severity} severity`,
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
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🚨 Crisis Response</h1>
          <p className="text-gray-500 text-sm mt-1">Analiza negatywnego komentarza + 3 warianty odpowiedzi + playbook kryzysowy</p>
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📚 Ostatnie analizy ({history.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {history.slice(0, 6).map(h => (
                <button key={h.id} onClick={() => setData(h.data)}
                  className="text-left p-3 rounded-xl transition-all hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-white line-clamp-2 mb-1">{h.title}</p>
                  {h.subtitle && <p className="text-[11px] text-red-400">{h.subtitle}</p>}
                  <p className="text-[10px] text-gray-600 mt-1">{new Date(h.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-4">
            <div className="card">
              <label className="label">💬 Komentarz / wpis do analizy *</label>
              <textarea className="input" rows={4} value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Wklej negatywny komentarz, hejt, krytyczną opinię..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <label className="label">📱 Platforma</label>
                <select className="input" value={platform} onChange={e => setPlatform(e.target.value)}>
                  <option>Facebook</option><option>Instagram</option><option>TikTok</option>
                  <option>LinkedIn</option><option>Twitter/X</option><option>YouTube</option><option>Inna</option>
                </select>
              </div>
              <div className="card">
                <label className="label">📋 Kontekst (opcjonalnie)</label>
                <input className="input" value={context} onChange={e => setContext(e.target.value)}
                  placeholder="Co wywołało komentarz? Pod jakim postem?" />
              </div>
            </div>
            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}
            <button onClick={analyze} disabled={loading || commentText.length < 3}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '⏳ Analizuję sytuację...' : '🚨 Analizuj i zaproponuj odpowiedzi'}
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Analiza i rekomendacje</h2>
              <button onClick={() => setData(null)} className="btn-ghost text-xs">+ Nowa analiza</button>
            </div>

            {/* Analysis */}
            <div className="card">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase text-gray-500 mb-1">Typ</p>
                  <p className="text-sm font-semibold text-white">{data.analysis.type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500 mb-1">Severity</p>
                  <p className="text-sm font-bold uppercase" style={{ color: SEVERITY_COLORS[data.analysis.severity] }}>
                    {data.analysis.severity}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500 mb-1">Sentyment</p>
                  <p className="text-sm font-semibold text-red-400">{data.analysis.sentiment}/100</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-500 mb-1">Pilność</p>
                  <p className="text-sm font-semibold text-white">{data.analysis.responseUrgency}</p>
                </div>
              </div>
              {data.analysis.keyTriggers?.length > 0 && (
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[10px] uppercase text-gray-500 mb-1">Triggery</p>
                  <div className="flex flex-wrap gap-2">
                    {data.analysis.keyTriggers.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-300 border border-red-500/20">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Response options */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">3 warianty odpowiedzi</h3>
              <div className="grid grid-cols-3 gap-3">
                {data.responses?.map((r, i) => (
                  <div key={i} className="card flex flex-col">
                    <div className="mb-3">
                      <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">{r.approach}</p>
                      <p className="text-sm font-semibold text-white">{r.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{r.tone}</p>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed mb-3 flex-1">{r.text}</p>
                    <p className="text-[10px] text-gray-500 italic mb-3">📌 {r.useWhen}</p>
                    <button onClick={() => copy(r.text, `r-${i}`)}
                      className="btn-secondary text-xs w-full">
                      {copied === `r-${i}` ? '✓ Skopiowano' : '📋 Kopiuj'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card">
                <h3 className="text-sm font-semibold text-red-400 mb-2">🚨 W ciągu 15 min</h3>
                <ul className="space-y-1.5">
                  {data.actions?.immediate?.map((a, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-2"><span>•</span><span>{a}</span></li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-orange-400 mb-2">⏰ W ciągu 24h</h3>
                <ul className="space-y-1.5">
                  {data.actions?.shortTerm?.map((a, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-2"><span>•</span><span>{a}</span></li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-emerald-400 mb-2">📅 Długofalowo</h3>
                <ul className="space-y-1.5">
                  {data.actions?.longTerm?.map((a, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-2"><span>•</span><span>{a}</span></li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Don't do */}
            {data.doNotDo?.length > 0 && (
              <div className="card" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <h3 className="text-sm font-semibold text-red-300 mb-2">❌ Czego NIE robić</h3>
                <ul className="space-y-1.5">
                  {data.doNotDo.map((d, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-red-400">×</span><span>{d}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {/* Playbook */}
            {data.playbook && (
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">📖 {data.playbook.title}</h3>
                <ol className="space-y-2">
                  {data.playbook.steps?.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold">{i+1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
