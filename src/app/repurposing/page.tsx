'use client'
import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import type { Platform } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'

interface PlatformPost {
  text: string; hook: string; hashtags: string[]
  format: string; tip: string
}
interface RepurposeData {
  keyInsights: string[]
  posts: Partial<Record<Platform, PlatformPost>>
  voiceNotes?: string
}

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

const CONTENT_TYPES = [
  { id: 'artykul', label: 'Artykuł blogowy', icon: '📝' },
  { id: 'podcast', label: 'Transkrypt podcastu', icon: '🎙️' },
  { id: 'wideo', label: 'Skrypt wideo / YouTube', icon: '🎬' },
  { id: 'newsletter', label: 'Newsletter', icon: '📧' },
  { id: 'webinar', label: 'Notatki z webinaru', icon: '💻' },
  { id: 'wywiad', label: 'Wywiad / rozmowa', icon: '🎤' },
]

export default function RepurposingPage() {
  const { dna, projectDrafts } = useStore()
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState('artykul')
  const [platforms, setPlatforms] = useState<Platform[]>(['facebook','instagram','linkedin'])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<RepurposeData|null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string|null>(null)
  const [expandedPlt, setExpandedPlt] = useState<Platform|null>(null)
  const [useVoice, setUseVoice] = useState(true)

  // Extract voice samples from last posts
  const voiceSamples = projectDrafts
    .filter(d => d.content)
    .slice(0, 5)
    .flatMap(d => platforms.map(p => {
      const post = d.content[p] as {text?:string}|undefined
      return post?.text || ''
    }))
    .filter(Boolean)
    .slice(0, 3)

  function togglePlatform(id: Platform) {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  async function repurpose() {
    if (!content.trim()) { setError('Wklej treść do przepisania'); return }
    if (!platforms.length) { setError('Wybierz przynajmniej jedną platformę'); return }
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/repurpose', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          content, contentType, platforms, dna,
          voiceSamples: useVoice && voiceSamples.length ? voiceSamples : []
        })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      setExpandedPlt(platforms[0])
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 1500)
  }

  function copyAll(post: PlatformPost) {
    const full = `${post.text}\n\n${post.hashtags.join(' ')}`
    copy(full, 'all')
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">♻️ Smart Repurposing</h1>
          <p className="text-gray-500 text-sm mt-1">
            Artykuł, podcast, wideo → posty na wszystkie platformy zachowując unikalny głos Twojej marki
          </p>
        </div>

        {!data && (
          <div className="card space-y-5">
            {/* Content type */}
            <div>
              <label className="label">Typ źródłowej treści</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {CONTENT_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => setContentType(ct.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all text-left"
                    style={{
                      background: contentType===ct.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: contentType===ct.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                      color: contentType===ct.id ? '#a5b4fc' : '#6b7280',
                    }}>
                    <span>{ct.icon}</span> {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label">Wklej treść</label>
                <span className="text-xs text-gray-600">{content.length} znaków</span>
              </div>
              <textarea className="input w-full resize-y" style={{minHeight:180}}
                placeholder={`Wklej tutaj treść ${CONTENT_TYPES.find(c=>c.id===contentType)?.label.toLowerCase() || 'do przepisania'}...`}
                value={content} onChange={e => setContent(e.target.value)} />
            </div>

            {/* Platforms */}
            <div>
              <label className="label">Adaptuj na platformy</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => togglePlatform(p.id as Platform)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all"
                    style={{
                      background: platforms.includes(p.id as Platform) ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: platforms.includes(p.id as Platform) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                      color: platforms.includes(p.id as Platform) ? '#a5b4fc' : '#6b7280',
                    }}>
                    <PlatformIcon platform={p.id} size={18}/>
                    <span className="text-xs">{p.name}</span>
                    {platforms.includes(p.id as Platform) && <span className="text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice preservation */}
            {voiceSamples.length > 0 && (
              <button onClick={() => setUseVoice(v => !v)}
                className="flex items-start gap-3 p-3 rounded-xl w-full text-left transition-all"
                style={{background: useVoice ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${useVoice ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`}}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${useVoice ? 'bg-indigo-500 border-indigo-500' : 'border-gray-700'}`}>
                  {useVoice && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <p className={`text-sm font-medium ${useVoice ? 'text-indigo-300' : 'text-gray-500'}`}>
                    🎙️ Zachowaj głos marki (Smart Voice)
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    AI przeanalizuje {voiceSamples.length} Twoich poprzednich postów i zachowa unikalny styl pisania
                  </p>
                </div>
              </button>
            )}

            {dna && (
              <div className="flex items-center gap-2 text-xs text-indigo-400/80 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-3 py-2">
                <span>✦</span> Adaptacja dopasowana do Brand DNA: <strong>{dna.brandName}</strong> · {dna.tone}
              </div>
            )}

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}

            <button className="btn-primary flex items-center gap-2 px-6 py-3" onClick={repurpose} disabled={loading}>
              {loading ? <><Dots/> Przepisuję treść...</> : '♻️ Przepisz na posty'}
            </button>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Przepisane posty</h2>
              <button onClick={() => setData(null)} className="btn-ghost text-sm">← Nowy repurposing</button>
            </div>

            {/* Key insights */}
            {data.keyInsights?.length > 0 && (
              <div className="card">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kluczowe wnioski ze źródła</h3>
                <div className="flex flex-wrap gap-2">
                  {data.keyInsights.map((ins, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-full"
                      style={{background:'rgba(99,102,241,0.12)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>
                      {ins}
                    </span>
                  ))}
                </div>
                {data.voiceNotes && (
                  <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-white/5">
                    🎙️ {data.voiceNotes}
                  </p>
                )}
              </div>
            )}

            {/* Platform tabs */}
            <div className="flex gap-1 p-1 rounded-2xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              {platforms.filter(p => data.posts[p]).map(p => (
                <button key={p} onClick={() => setExpandedPlt(p)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
                  style={{background:expandedPlt===p?'rgba(99,102,241,0.25)':'transparent'}}>
                  <PlatformIcon platform={p} size={18}/>
                  <span className="text-xs font-medium" style={{color:expandedPlt===p?'#a5b4fc':'#6b7280'}}>
                    {PLATFORMS.find(pl=>pl.id===p)?.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Active platform post */}
            {expandedPlt && data.posts[expandedPlt] && (() => {
              const post = data.posts[expandedPlt]!
              return (
                <div className="card space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={expandedPlt} size={28}/>
                      <div>
                        <p className="font-semibold text-white capitalize">{expandedPlt}</p>
                        <p className="text-xs text-gray-600">{post.format} · {post.text?.length} znaków</p>
                      </div>
                    </div>
                    <button onClick={() => copyAll(post)}
                      className="btn-primary text-xs py-2 px-4">
                      {copied==='all' ? '✓ Skopiowano' : 'Kopiuj tekst + hashtagi'}
                    </button>
                  </div>

                  {/* Hook */}
                  <div className="p-3 rounded-xl" style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)'}}>
                    <p className="text-[10px] text-amber-400 mb-1">🎣 Hook (pierwsze zdanie)</p>
                    <p className="text-sm font-medium text-white">&ldquo;{post.hook}&rdquo;</p>
                  </div>

                  {/* Text */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-600">Pełny tekst</p>
                      <button onClick={() => copy(post.text, 'text')} className="text-xs text-indigo-400 hover:text-indigo-300">
                        {copied==='text'?'✓':'Kopiuj'}
                      </button>
                    </div>
                    <div className="p-4 rounded-xl whitespace-pre-wrap text-sm text-gray-200 leading-relaxed"
                      style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                      {post.text}
                    </div>
                  </div>

                  {/* Hashtags */}
                  {post.hashtags?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-600">Hashtagi</p>
                        <button onClick={() => copy(post.hashtags.join(' '),'hashtags')} className="text-xs text-indigo-400 hover:text-indigo-300">
                          {copied==='hashtags'?'✓':'Kopiuj'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {post.hashtags.map((h,i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                            style={{background:'rgba(99,102,241,0.12)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tip */}
                  {post.tip && (
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <span>💡</span> {post.tip}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* All platforms quick copy */}
            <div className="card">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Wszystkie platformy — szybkie kopiowanie</h3>
              <div className="space-y-2">
                {platforms.filter(p => data.posts[p]).map(p => {
                  const post = data.posts[p]!
                  return (
                    <div key={p} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <PlatformIcon platform={p} size={20}/>
                      <p className="text-xs text-gray-400 flex-1 truncate">{post.text?.slice(0,60)}...</p>
                      <button onClick={() => copy(`${post.text}\n\n${post.hashtags.join(' ')}`, p)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0">
                        {copied===p?'✓':' Kopiuj'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
