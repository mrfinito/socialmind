'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface ScoreItem { score: number; comment: string }
interface Issue { severity: string; what: string; why: string; fix: string }
interface VoiceData {
  overallScore: number; verdict: string; summary: string
  scores: { tone: ScoreItem; vocabulary: ScoreItem; values: ScoreItem; audience: ScoreItem; platform: ScoreItem }
  strengths: string[]; issues: Issue[]
  rewrittenVersion: string
  alternativeVariants: { label: string; text: string }[]
  doMore: string[]; avoidWords: string[]
}

export default function VoiceCheckPage() {
  const { dna, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'
  const [content, setContent] = useState('')
  const [platform, setPlatform] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<VoiceData | null>(null)
  const [history, setHistory] = useState<HistoryEntry<VoiceData & { content: string }>[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { setHistory(historyLoad('voice-check', projectId)) }, [projectId])

  async function check() {
    if (!dna) { setError('Najpierw zdefiniuj Brand DNA w sekcji Marka'); return }
    if (content.length < 20) { setError('Wklej tekst (min 20 znaków)'); return }
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/voice-check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, platform, dna })
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave('voice-check', projectId, {
        title: content.slice(0, 60), subtitle: `Score ${j.data.overallScore}/100 · ${j.data.verdict}`,
        data: { ...j.data, content }
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 1500)
  }

  const scoreColor = (s: number) => s >= 80 ? '#34d399' : s >= 60 ? '#fbbf24' : '#fb923c'

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🎙️ Voice & Tone Checker</h1>
          <p className="text-gray-500 text-sm mt-1">Sprawdź czy tekst jest zgodny z DNA Twojej marki — score 0-100 + konkretne poprawki</p>
        </div>

        {!dna && (
          <div className="card bg-orange-500/10 border-orange-500/30 mb-4">
            <p className="text-sm text-orange-300">⚠️ Brak Brand DNA. <a href="/marka" className="underline">Zdefiniuj DNA marki</a> żeby AI mógł oceniać zgodność.</p>
          </div>
        )}

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
              <label className="label">📝 Tekst do oceny *</label>
              <textarea className="input" rows={8} value={content} onChange={e => setContent(e.target.value)}
                placeholder="Wklej post, copy reklamy, opis produktu — cokolwiek napisanego dla marki" />
              <p className="text-[10px] text-gray-500 mt-1">{content.length} znaków</p>
            </div>
            <div className="card">
              <label className="label">📱 Platforma (opcjonalnie)</label>
              <input className="input" value={platform} onChange={e => setPlatform(e.target.value)}
                placeholder="np. Instagram, LinkedIn, email, banner..." />
            </div>
            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}
            <button onClick={check} disabled={loading || content.length < 20 || !dna}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '✦ Analizuję...' : '🎙️ Sprawdź zgodność z marką'}
            </button>
          </div>
        )}

        {data && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setData(null)} className="btn-ghost text-sm">← Nowa analiza</button>
            </div>

            {/* Score panel */}
            <div className="card mb-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-6xl font-bold" style={{color: scoreColor(data.overallScore)}}>{data.overallScore}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">/ 100</p>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-white mb-1">{data.verdict}</p>
                  <p className="text-sm text-gray-400">{data.summary}</p>
                </div>
              </div>
            </div>

            {/* Sub scores */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {Object.entries(data.scores || {}).map(([key, val]) => (
                <div key={key} className="card text-center">
                  <p className="text-2xl font-bold" style={{color: scoreColor(val.score)}}>{val.score}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1 mb-2">{key}</p>
                  <p className="text-[10px] text-gray-400">{val.comment}</p>
                </div>
              ))}
            </div>

            {data.issues?.length > 0 && (
              <div className="card mb-4">
                <h3 className="label">⚠️ Problemy do poprawy</h3>
                <div className="space-y-3">
                  {data.issues.map((iss, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{
                      background: iss.severity === 'high' ? 'rgba(239,68,68,0.05)' : iss.severity === 'medium' ? 'rgba(251,146,60,0.05)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${iss.severity === 'high' ? 'rgba(239,68,68,0.2)' : iss.severity === 'medium' ? 'rgba(251,146,60,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <p className="text-xs font-semibold text-white mb-1">{iss.what}</p>
                      <p className="text-[11px] text-gray-500 mb-1">{iss.why}</p>
                      <p className="text-xs text-emerald-400">→ {iss.fix}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card mb-4 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="label" style={{color:'#6ee7b7'}}>✨ Poprawiona wersja (rekomendowana)</h3>
                <button onClick={() => copy(data.rewrittenVersion, 'rewrite')} className="text-xs text-emerald-400 hover:text-white">
                  {copied === 'rewrite' ? '✓' : 'Skopiuj'}
                </button>
              </div>
              <p className="text-sm text-white whitespace-pre-wrap">{data.rewrittenVersion}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {data.alternativeVariants?.map((v, i) => (
                <div key={i} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-indigo-400">{v.label}</p>
                    <button onClick={() => copy(v.text, `alt-${i}`)} className="text-xs text-indigo-400">
                      {copied === `alt-${i}` ? '✓' : 'Skopiuj'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{v.text}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <h3 className="label">💪 Mocne strony</h3>
                <ul className="space-y-1.5">{data.strengths?.map((s,i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-emerald-400">✓</span>{s}</li>)}</ul>
              </div>
              <div className="card">
                <h3 className="label">🚫 Słów do unikania</h3>
                <div className="flex flex-wrap gap-1">{data.avoidWords?.map((w,i) => (
                  <span key={i} className="text-[11px] px-2 py-1 rounded" style={{background:'rgba(239,68,68,0.1)',color:'#fca5a5'}}>{w}</span>
                ))}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
