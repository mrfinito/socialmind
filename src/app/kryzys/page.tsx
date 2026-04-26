'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface Response {
  tone: string; label: string; rationale: string
  publicReply: string; privateReply: string; tips: string
}
interface CrisisData {
  analysis: { severity: string; intent: string; publicVisibility: string; responseUrgency: string; potentialRisk: string }
  responses: Response[]
  playbook: { doNow: string[]; dontDo: string[]; escalate: string; monitor: string; longTermLessons: string }
  templates: { apology: string; acknowledgment: string; redirect: string }
}

export default function KryzysPage() {
  const { dna, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'
  const [negativeComment, setNegativeComment] = useState('')
  const [context, setContext] = useState('')
  const [platform, setPlatform] = useState('Facebook')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<CrisisData | null>(null)
  const [activeTab, setActiveTab] = useState<'responses'|'playbook'|'templates'>('responses')
  const [history, setHistory] = useState<HistoryEntry<CrisisData & { comment: string }>[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { setHistory(historyLoad('kryzys', projectId)) }, [projectId])

  async function generate() {
    if (negativeComment.length < 10) { setError('Wklej negatywny komentarz'); return }
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/kryzys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negativeComment, context, platform, dna })
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave('kryzys', projectId, {
        title: negativeComment.slice(0, 60), subtitle: `${j.data.analysis?.severity || 'medium'} · ${platform}`,
        data: { ...j.data, comment: negativeComment }
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 1500)
  }

  const SEVERITY_COLORS: Record<string, string> = {
    low: '#34d399', medium: '#fbbf24', high: '#fb923c', critical: '#ef4444'
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🚨 Crisis Response</h1>
          <p className="text-gray-500 text-sm mt-1">Jak reagować na hejt, krytykę, kryzys — 3 warianty + playbook</p>
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📚 Ostatnie ({history.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {history.slice(0, 6).map(h => (
                <button key={h.id} onClick={() => { setData(h.data); setNegativeComment(h.data.comment) }}
                  className="text-left p-3 rounded-xl hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-white mb-1 line-clamp-2">{h.title}</p>
                  {h.subtitle && <p className="text-[10px] text-orange-400">{h.subtitle}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-4">
            <div className="card">
              <label className="label">😡 Negatywny komentarz / sytuacja *</label>
              <textarea className="input" rows={4} value={negativeComment} onChange={e => setNegativeComment(e.target.value)}
                placeholder="np. 'Zamówiłem produkt 2 tygodnie temu i wciąż go nie ma. Wasza firma to oszustwo!'" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <label className="label">📱 Platforma</label>
                <select className="input" value={platform} onChange={e => setPlatform(e.target.value)}>
                  <option>Facebook</option><option>Instagram</option><option>LinkedIn</option>
                  <option>Twitter/X</option><option>TikTok</option><option>Google</option>
                </select>
              </div>
              <div className="card">
                <label className="label">📋 Kontekst (opcjonalnie)</label>
                <input className="input" value={context} onChange={e => setContext(e.target.value)}
                  placeholder="np. pojawił się pod naszym postem o premierze" />
              </div>
            </div>
            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}
            <button onClick={generate} disabled={loading || negativeComment.length < 10}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '✦ Analizuję...' : '🚨 Analizuj kryzys i zaproponuj odpowiedź'}
            </button>
          </div>
        )}

        {data && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setData(null)} className="btn-ghost text-sm">← Nowa analiza</button>
            </div>

            {/* Severity panel */}
            <div className="card mb-4" style={{
              background: `${SEVERITY_COLORS[data.analysis?.severity || 'medium']}11`,
              border: `1px solid ${SEVERITY_COLORS[data.analysis?.severity || 'medium']}40`
            }}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{
                  data.analysis?.severity === 'critical' ? '🔥' :
                  data.analysis?.severity === 'high' ? '⚠️' :
                  data.analysis?.severity === 'medium' ? '⚡' : '💡'
                }</span>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{color: SEVERITY_COLORS[data.analysis?.severity || 'medium']}}>
                    Severity: {data.analysis?.severity}
                  </p>
                  <p className="text-sm text-white">{data.analysis?.intent}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div><p className="text-gray-500 mb-0.5">Widoczność</p><p className="text-white">{data.analysis?.publicVisibility}</p></div>
                <div><p className="text-gray-500 mb-0.5">Pilność</p><p className="text-white">{data.analysis?.responseUrgency}</p></div>
                <div><p className="text-gray-500 mb-0.5">Ryzyko</p><p className="text-white">{data.analysis?.potentialRisk}</p></div>
              </div>
            </div>

            <div className="flex gap-1 mb-4 border-b border-white/10 pb-3">
              {[['responses','💬 3 warianty odpowiedzi'],['playbook','📋 Playbook'],['templates','📝 Szablony']].map(([id,label]) => (
                <button key={id} onClick={() => setActiveTab(id as 'responses'|'playbook'|'templates')}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: activeTab === id ? 'rgba(99,102,241,0.2)' : 'transparent', color: activeTab === id ? '#a5b4fc' : '#9ca3af' }}>
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'responses' && (
              <div className="space-y-4">
                {data.responses?.map((r, i) => (
                  <div key={i} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-base font-bold text-white">{r.label}</p>
                        <p className="text-[11px] text-gray-500 italic mt-0.5">{r.rationale}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg" style={{background:'rgba(99,102,241,0.05)',border:'1px solid rgba(99,102,241,0.15)'}}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-indigo-400">📣 Odpowiedź publiczna</p>
                          <button onClick={() => copy(r.publicReply, `pub-${i}`)} className="text-[10px] text-indigo-300 hover:text-white">
                            {copied === `pub-${i}` ? '✓ skopiowano' : 'Skopiuj'}
                          </button>
                        </div>
                        <p className="text-sm text-white whitespace-pre-wrap">{r.publicReply}</p>
                      </div>
                      {r.privateReply && (
                        <div className="p-3 rounded-lg" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">📨 Wiadomość prywatna</p>
                            <button onClick={() => copy(r.privateReply, `priv-${i}`)} className="text-[10px] text-gray-400 hover:text-white">
                              {copied === `priv-${i}` ? '✓ skopiowano' : 'Skopiuj'}
                            </button>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{r.privateReply}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">💡 {r.tips}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'playbook' && data.playbook && (
              <div className="grid grid-cols-2 gap-4">
                <div className="card bg-emerald-500/5 border-emerald-500/20">
                  <h3 className="label" style={{color:'#6ee7b7'}}>✅ Zrób natychmiast</h3>
                  <ul className="space-y-2">{data.playbook.doNow?.map((d,i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-emerald-400">{i+1}.</span>{d}</li>)}</ul>
                </div>
                <div className="card bg-red-500/5 border-red-500/20">
                  <h3 className="label" style={{color:'#fca5a5'}}>🚫 Czego nie robić</h3>
                  <ul className="space-y-2">{data.playbook.dontDo?.map((d,i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-red-400">✗</span>{d}</li>)}</ul>
                </div>
                <div className="card"><h3 className="label">⬆️ Kiedy eskalować</h3><p className="text-sm text-gray-300">{data.playbook.escalate}</p></div>
                <div className="card"><h3 className="label">👀 Co monitorować (24-72h)</h3><p className="text-sm text-gray-300">{data.playbook.monitor}</p></div>
                <div className="card col-span-2"><h3 className="label">🎓 Wnioski długoterminowe</h3><p className="text-sm text-gray-300">{data.playbook.longTermLessons}</p></div>
              </div>
            )}

            {activeTab === 'templates' && data.templates && (
              <div className="space-y-3">
                {[
                  { key: 'apology', label: '🙇 Przeprosiny', text: data.templates.apology },
                  { key: 'acknowledgment', label: '✓ Potwierdzenie problemu', text: data.templates.acknowledgment },
                  { key: 'redirect', label: '↗ Przekierowanie do supportu', text: data.templates.redirect },
                ].map(t => (
                  <div key={t.key} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-white">{t.label}</p>
                      <button onClick={() => copy(t.text, t.key)} className="text-xs text-indigo-400 hover:text-white">
                        {copied === t.key ? '✓ skopiowano' : 'Skopiuj'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{t.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
