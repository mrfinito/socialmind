'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import HistoryDrawer from '@/components/HistoryDrawer'
import { historyLoad, historySave, historyDelete } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'
import { useStore } from '@/lib/store'

interface ScriptData {
  title: string; platform: string; duration: string; style: string
  hook: { text: string; visual: string; caption: string; duration: number }
  scenes: { number: number; duration: number; script: string; visual: string; caption: string; cameraNote: string; emotion: string }[]
  cta: { text: string; visual: string; caption: string }
  music: { mood: string; bpm: string; suggestion: string }
  hashtags: string[]
  caption: string
  tips: string[]
}

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', color: '#010101', ratio: '9:16' },
  { id: 'instagram-reels', name: 'Instagram Reels', color: '#E1306C', ratio: '9:16' },
  { id: 'youtube-shorts', name: 'YouTube Shorts', color: '#FF0000', ratio: '9:16' },
  { id: 'facebook-reels', name: 'Facebook Reels', color: '#1877F2', ratio: '9:16' },
]
const DURATIONS = ['15s','30s','60s','90s','3min']
const STYLES = ['Dynamiczny / energetyczny','Spokojny / inspirujący','Edukacyjny / ekspert','Humorystyczny / lekki','Emocjonalny / storytelling','Produktowy / showroom']

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

export default function WideoPage() {
  const { dna } = useStore()
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('tiktok')
  const [duration, setDuration] = useState('60s')
  const [style, setStyle] = useState(STYLES[0])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ScriptData|null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string|null>(null)
  const [history, setHistory] = useState<HistoryEntry<ScriptData>[]>([])

  const projectId = dna?.brandName || 'default'

  useEffect(() => {
    setHistory(historyLoad<ScriptData>('wideo', projectId))
  }, [projectId])

  async function generate() {
    if (!topic.trim()) { setError('Wpisz temat wideo'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/video-script', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ topic, platform, duration, style, masterPrompt: dna?.masterPrompt, brandName: dna?.brandName })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      const entry = historySave<ScriptData>('wideo', projectId, {
        title: topic,
        subtitle: `${platform} · ${duration}`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 1500)
  }

  function exportScript() {
    if (!data) return
    let txt = `SKRYPT WIDEO — ${data.title}\n`
    txt += `Platforma: ${data.platform} | Czas: ${data.duration} | Styl: ${data.style}\n\n`
    txt += `═══ HOOK (${data.hook.duration}s) ═══\n`
    txt += `Mówione: ${data.hook.text}\nWizualne: ${data.hook.visual}\nCaption: ${data.hook.caption}\n\n`
    data.scenes.forEach(s => {
      txt += `═══ SCENA ${s.number} (${s.duration}s) ═══\n`
      txt += `Skrypt: ${s.script}\nWizualne: ${s.visual}\nCaption: ${s.caption}\nKamera: ${s.cameraNote}\n\n`
    })
    txt += `═══ CTA ═══\n${data.cta.text}\n\n`
    txt += `═══ MUZYKA ═══\n${data.music.mood} · ${data.music.bpm} · ${data.music.suggestion}\n\n`
    txt += `═══ CAPTION ═══\n${data.caption}\n\n`
    txt += `═══ WSKAZÓWKI ═══\n${data.tips.map((t,i)=>`${i+1}. ${t}`).join('\n')}`
    const blob = new Blob([txt], {type:'text/plain;charset=utf-8'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `skrypt_${data.platform}_${Date.now()}.txt`
    a.click()
  }

  const EMOTION_COLOR: Record<string,string> = {
    'zaciekawienie':'text-yellow-400','emocja':'text-pink-400','zaufanie':'text-blue-400',
    'inspiracja':'text-purple-400','humor':'text-green-400','pilnosc':'text-red-400',
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🎬 Generator skryptów wideo</h1>
          <p className="text-gray-500 text-sm mt-1">TikTok, Reels, Shorts — profesjonalne skrypty z podziałem na sceny i wskazówkami montażu</p>
          <div className="mt-3">
            <HistoryDrawer<ScriptData>
              module="wideo" projectId={projectId} entries={history}
              icon="🎬"
              onLoad={e => { setData(e.data); setTopic(e.title) }}
              onDelete={id => setHistory(prev => prev.filter(e => e.id !== id))}
              formatTitle={e => e.title}
              formatSubtitle={e => e.subtitle || ''}
            />
          </div>
        </div>

        <div className="card mb-6 space-y-5">
          <div>
            <label className="label">Temat wideo</label>
            <textarea className="input resize-none" style={{minHeight:80}}
              placeholder="np. 3 mity o odżywianiu które niszczą Twoją dietę, Jak wybrać przedszkole dla dziecka, Nasz produkt w 60 sekund..."
              value={topic} onChange={e=>setTopic(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Platforma</label>
              <div className="space-y-2">
                {PLATFORMS.map(p=>(
                  <button key={p.id} onClick={()=>setPlatform(p.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                    style={{background:platform===p.id?`${p.color}20`:'rgba(255,255,255,0.03)',borderColor:platform===p.id?`${p.color}60`:'rgba(255,255,255,0.08)',color:platform===p.id?'white':'#6b7280'}}>
                    <span className="text-xs font-mono opacity-60">{p.ratio}</span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Czas trwania</label>
              <div className="space-y-2">
                {DURATIONS.map(d=>(
                  <button key={d} onClick={()=>setDuration(d)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                    style={{background:duration===d?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.03)',borderColor:duration===d?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.08)',color:duration===d?'#a5b4fc':'#6b7280'}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Styl</label>
              <div className="space-y-2">
                {STYLES.map(s=>(
                  <button key={s} onClick={()=>setStyle(s)}
                    className="w-full px-3 py-2 rounded-xl border text-xs transition-all text-left leading-tight"
                    style={{background:style===s?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.03)',borderColor:style===s?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.08)',color:style===s?'#a5b4fc':'#6b7280'}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
          <button className="btn-primary flex items-center gap-2 px-6 py-3" onClick={generate} disabled={loading}>
            {loading ? <><Dots /> Piszę skrypt ({duration})...</> : `🎬 Generuj skrypt ${duration}`}
          </button>
        </div>

        {data && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{data.title}</h2>
                <p className="text-gray-500 text-xs mt-0.5">{data.platform} · {data.duration} · {data.style}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={exportScript} className="btn-secondary text-sm">⬇ Pobierz .txt</button>
                <button onClick={()=>copy(data.caption,'caption')} className="btn-secondary text-sm">
                  {copied==='caption'?'✓ Skopiowano':'Kopiuj caption'}
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="card">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Storyboard / Timeline</h3>

              {/* Hook */}
              <div className="relative mb-3">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)'}}>
                      HOOK
                    </div>
                    <div className="w-px flex-1 mt-2" style={{background:'rgba(255,255,255,0.08)'}}/>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-amber-400">Hook — {data.hook.duration}s</span>
                      <span className="text-[10px] text-gray-600">ZATRZYMAJ SCROLLOWANIE</span>
                    </div>
                    <div className="p-3 rounded-xl space-y-2" style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)'}}>
                      <p className="text-sm font-medium text-white">&ldquo;{data.hook.text}&rdquo;</p>
                      <p className="text-xs text-gray-500">📹 {data.hook.visual}</p>
                      <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded" style={{background:'rgba(245,158,11,0.2)',color:'#fbbf24'}}>
                        Caption: {data.hook.caption}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scenes */}
              {data.scenes.map((scene, i) => (
                <div key={i} className="relative mb-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{background:'rgba(99,102,241,0.3)',border:'1px solid rgba(99,102,241,0.4)'}}>
                        {scene.number}
                      </div>
                      {i < data.scenes.length - 1 && <div className="w-px flex-1 mt-2" style={{background:'rgba(255,255,255,0.08)'}}/>}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-indigo-300">Scena {scene.number}</span>
                        <span className="text-[10px] text-gray-600">{scene.duration}s</span>
                        {scene.emotion && (
                          <span className={`text-[10px] ${EMOTION_COLOR[scene.emotion.toLowerCase()] || 'text-gray-500'}`}>
                            {scene.emotion}
                          </span>
                        )}
                      </div>
                      <div className="p-3 rounded-xl space-y-2" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                        <p className="text-sm text-gray-200">&ldquo;{scene.script}&rdquo;</p>
                        <p className="text-xs text-gray-500">📹 {scene.visual}</p>
                        <p className="text-xs text-gray-600">🎬 {scene.cameraNote}</p>
                        {scene.caption && (
                          <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded" style={{background:'rgba(99,102,241,0.2)',color:'#a5b4fc'}}>
                            Caption: {scene.caption}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* CTA */}
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{background:'linear-gradient(135deg,#10b981,#6366f1)'}}>
                  CTA
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-emerald-400 mb-2">Call to Action</p>
                  <div className="p-3 rounded-xl space-y-1.5" style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)'}}>
                    <p className="text-sm font-medium text-white">&ldquo;{data.cta.text}&rdquo;</p>
                    <p className="text-xs text-gray-500">📹 {data.cta.visual}</p>
                    <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded" style={{background:'rgba(16,185,129,0.2)',color:'#34d399'}}>
                      {data.cta.caption}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Music + Hashtags + Tips */}
            <div className="grid grid-cols-3 gap-5">
              <div className="card">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">🎵 Muzyka</h3>
                <p className="text-sm font-medium text-white mb-1">{data.music.mood}</p>
                <p className="text-xs text-gray-500">{data.music.bpm}</p>
                <p className="text-xs text-indigo-400 mt-2">{data.music.suggestion}</p>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide"># Hashtagi</h3>
                  <button onClick={()=>copy((data.hashtags||[]).join(' '),'hashtags')} className="text-[10px] text-indigo-400">
                    {copied==='hashtags'?'✓':'kopiuj'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(data.hashtags||[]).map((h,i)=>(
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.25)'}}>
                      {h}
                    </span>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">💡 Wskazówki produkcyjne</h3>
                <ul className="space-y-2">
                  {(data.tips||[]).map((t,i)=>(
                    <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                      <span className="text-indigo-400 shrink-0">{i+1}.</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Caption */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Caption posta</h3>
                <button onClick={()=>copy(data.caption,'caption2')} className="text-xs text-indigo-400">
                  {copied==='caption2'?'✓ Skopiowano':'Kopiuj'}
                </button>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{data.caption}</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
