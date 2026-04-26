'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface Shot {
  shotNumber: number
  startTime: number
  duration: number
  type: 'hook' | 'build' | 'value' | 'cta' | 'outro'
  description: string
  shotType: string
  onScreenText: string
  voiceover: string
  audioCue: string
  transition: string
  tip: string
}

interface StoryboardData {
  title: string
  hookText: string
  totalDuration: number
  shots: Shot[]
  audio: { musicSuggestion: string; soundEffects: string[]; voiceoverTone: string }
  production: { totalShots: number; estimatedShootTime: string; equipment: string[]; locations: string[]; props: string[] }
  caption: { hook: string; body: string; cta: string; hashtags: string[] }
  retention_tips: string[]
}

const SHOT_TYPE_COLORS: Record<string, string> = {
  hook: '#ef4444', build: '#fbbf24', value: '#10b981', cta: '#6366f1', outro: '#a855f7'
}

export default function StoryboardPage() {
  const { dna, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState<'reels' | 'tiktok' | 'shorts'>('reels')
  const [duration, setDuration] = useState(30)
  const [vibe, setVibe] = useState('')
  const [hookType, setHookType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<StoryboardData | null>(null)
  const [history, setHistory] = useState<HistoryEntry<StoryboardData>[]>([])

  useEffect(() => {
    setHistory(historyLoad<StoryboardData>('storyboard', projectId))
  }, [projectId])

  async function generate() {
    if (topic.length < 3) { setError('Opisz temat'); return }
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, platform, duration, vibe, hookType, dna }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave<StoryboardData>('storyboard', projectId, {
        title: j.data.title || topic.slice(0, 60),
        subtitle: `${platform} · ${duration}s · ${j.data.shots?.length || 0} ujęć`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🎬 Storyboard Reels/TikTok</h1>
          <p className="text-gray-500 text-sm mt-1">AI rozpisuje scenariusz ujęcie po ujęciu — sekundy, kadry, voiceover, muzyka</p>
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📚 Ostatnie storyboardy ({history.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {history.slice(0, 6).map(h => (
                <button key={h.id} onClick={() => setData(h.data)}
                  className="text-left p-3 rounded-xl transition-all hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-semibold text-white line-clamp-2 mb-1">{h.title}</p>
                  {h.subtitle && <p className="text-[11px] text-orange-400">{h.subtitle}</p>}
                  <p className="text-[10px] text-gray-600 mt-1">{new Date(h.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-4">
            <div className="card">
              <label className="label">🎬 Temat / koncepcja</label>
              <textarea className="input" rows={2} value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="np. Pokazanie procesu palenia kawy w naszej palarni — od ziaren do gotowego produktu" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="card">
                <label className="label">📱 Platforma</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['reels', 'tiktok', 'shorts'] as const).map(p => (
                    <button key={p} onClick={() => setPlatform(p)}
                      className="text-xs py-2 rounded-lg transition-all"
                      style={{
                        background: platform === p ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        border: platform === p ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        color: platform === p ? '#a5b4fc' : '#9ca3af',
                      }}>
                      {p === 'reels' ? '📷 Reels' : p === 'tiktok' ? '🎵 TikTok' : '🔴 Shorts'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card">
                <label className="label">⏱ Długość: {duration}s</label>
                <input type="range" min={7} max={90} value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))} className="w-full" />
              </div>
              <div className="card">
                <label className="label">🎨 Vibe / styl</label>
                <input className="input" value={vibe} onChange={e => setVibe(e.target.value)}
                  placeholder="np. cinematic, energetyczny, ASMR" />
              </div>
            </div>

            <div className="card">
              <label className="label">🪝 Typ hooka (opcjonalnie)</label>
              <input className="input" value={hookType} onChange={e => setHookType(e.target.value)}
                placeholder="np. shocking statement, question, before/after, point of view" />
            </div>

            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}

            <button onClick={generate} disabled={loading || topic.length < 3}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '✦ Tworzę storyboard...' : '✦ Wygeneruj storyboard'}
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{data.title}</h2>
                <p className="text-sm text-gray-500">{data.totalDuration}s · {data.shots?.length || 0} ujęć · {data.production?.estimatedShootTime}</p>
              </div>
              <button onClick={() => setData(null)} className="btn-ghost text-xs">+ Nowy</button>
            </div>

            {/* Hook highlight */}
            <div className="card" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">🪝 Hook (pierwsze 2s)</p>
              <p className="text-base font-semibold text-white">{data.hookText}</p>
            </div>

            {/* Timeline */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">⏱ Timeline ujęć</h3>
              <div className="relative h-12 mb-4 rounded-lg overflow-hidden flex" style={{ background: 'rgba(0,0,0,0.3)' }}>
                {data.shots?.map((shot, i) => {
                  const widthPct = data.totalDuration > 0 ? (shot.duration / data.totalDuration) * 100 : 0
                  return (
                    <div key={i} className="flex items-center justify-center text-xs font-bold text-white relative group"
                      style={{
                        width: `${widthPct}%`,
                        background: SHOT_TYPE_COLORS[shot.type] || '#6366f1',
                        borderRight: i < data.shots.length - 1 ? '1px solid rgba(0,0,0,0.4)' : 'none',
                      }}
                      title={`${shot.type}: ${shot.description}`}>
                      {shot.shotNumber}
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-3 text-[10px]">
                {Object.entries(SHOT_TYPE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded" style={{ background: color }}></span>
                    <span className="text-gray-400 uppercase">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shots list */}
            <div className="space-y-3">
              {data.shots?.map((shot, i) => (
                <div key={i} className="card">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white"
                      style={{ background: SHOT_TYPE_COLORS[shot.type] || '#6366f1' }}>
                      {shot.shotNumber}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-semibold text-white uppercase tracking-wider"
                          style={{ color: SHOT_TYPE_COLORS[shot.type] }}>{shot.type}</span>
                        <span className="text-xs text-gray-500">{shot.startTime}s — {shot.startTime + shot.duration}s ({shot.duration}s)</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-400">{shot.shotType}</span>
                      </div>

                      <p className="text-sm text-white mb-3 leading-relaxed">{shot.description}</p>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="text-[10px] uppercase text-gray-500 mb-1">📺 Tekst na ekranie</p>
                          <p className="text-gray-300">{shot.onScreenText || '—'}</p>
                        </div>
                        <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="text-[10px] uppercase text-gray-500 mb-1">🎙 Voiceover</p>
                          <p className="text-gray-300">{shot.voiceover || '—'}</p>
                        </div>
                        <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="text-[10px] uppercase text-gray-500 mb-1">🎵 Audio</p>
                          <p className="text-gray-300">{shot.audioCue}</p>
                        </div>
                        <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="text-[10px] uppercase text-gray-500 mb-1">🔄 Przejście</p>
                          <p className="text-gray-300">{shot.transition}</p>
                        </div>
                      </div>

                      {shot.tip && (
                        <p className="text-[11px] text-indigo-400/80 mt-2 italic">💡 {shot.tip}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Audio + Production + Caption */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2">🎵 Audio</h3>
                <p className="text-xs text-gray-300 mb-2"><strong className="text-indigo-400">Muzyka:</strong> {data.audio?.musicSuggestion}</p>
                <p className="text-xs text-gray-300 mb-2"><strong className="text-indigo-400">Voiceover:</strong> {data.audio?.voiceoverTone}</p>
                {data.audio?.soundEffects?.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {data.audio.soundEffects.map((sfx, i) => (
                      <li key={i} className="text-[11px] text-gray-400">• {sfx}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2">🎥 Produkcja</h3>
                <p className="text-xs text-gray-400 mb-2">⏱ {data.production?.estimatedShootTime}</p>
                <div className="text-[11px] space-y-1.5">
                  {data.production?.equipment?.length > 0 && (
                    <div><strong className="text-indigo-400">Sprzęt:</strong> {data.production.equipment.join(', ')}</div>
                  )}
                  {data.production?.locations?.length > 0 && (
                    <div><strong className="text-indigo-400">Lokacje:</strong> {data.production.locations.join(', ')}</div>
                  )}
                  {data.production?.props?.length > 0 && (
                    <div><strong className="text-indigo-400">Rekwizyty:</strong> {data.production.props.join(', ')}</div>
                  )}
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-2">📝 Caption</h3>
                <p className="text-xs text-gray-300 mb-2"><strong className="text-indigo-400">Hook:</strong> {data.caption?.hook}</p>
                <p className="text-xs text-gray-300 mb-2 line-clamp-3">{data.caption?.body}</p>
                <p className="text-xs text-emerald-400 mb-2">{data.caption?.cta}</p>
                {data.caption?.hashtags?.length > 0 && (
                  <p className="text-[11px] text-gray-500">{data.caption.hashtags.join(' ')}</p>
                )}
              </div>
            </div>

            {/* Retention tips */}
            {data.retention_tips?.length > 0 && (
              <div className="card" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <h3 className="text-sm font-semibold text-indigo-300 mb-2">📈 Retention tips</h3>
                <ul className="space-y-1.5">
                  {data.retention_tips.map((tip, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-2">
                      <span className="text-indigo-400 font-bold">{i+1}.</span>
                      <span>{tip}</span>
                    </li>
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
