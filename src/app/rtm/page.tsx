'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import type { Platform } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'
import ImageGenerator from '@/components/ImageGenerator'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface RtmPost { platform: string; angle: string; text: string; hook: string; hashtags: string[]; emoji: boolean; imageIdea: string }
interface RtmOpportunity { id:string; title:string; category:string; relevance:string; why:string; risk:string; urgency:string; posts: RtmPost[] }
interface CalendarItem { name:string; type:string; potential:string; idea:string }
interface WeeklyTrend { trend:string; platform:string; relevance:string }
interface RtmData {
  date: string
  opportunities: RtmOpportunity[]
  todayCalendar: CalendarItem[]
  weeklyTrends: WeeklyTrend[]
  avoidTopics: string[]
  rtmTips: string[]
}

const RELEVANCE_CFG: Record<string,{color:string;bg:string;border:string}> = {
  wysokie: {color:'#34d399',bg:'rgba(52,211,153,0.12)',border:'rgba(52,211,153,0.25)'},
  srednie: {color:'#fbbf24',bg:'rgba(251,191,36,0.12)',border:'rgba(251,191,36,0.25)'},
  niskie:  {color:'#9ca3af',bg:'rgba(156,163,175,0.1)',border:'rgba(156,163,175,0.2)'},
}
const URGENCY_CFG: Record<string,{color:string;label:string}> = {
  dzisiaj:      {color:'#f87171',label:'🔴 Dzisiaj'},
  'ten tydzien':{color:'#fbbf24',label:'🟡 Ten tydzień'},
  'ten miesiac':{color:'#60a5fa',label:'🔵 Ten miesiąc'},
}
const CATEGORY_ICONS: Record<string,string> = {
  sport:'⚽', kultura:'🎭', technologia:'💻', swieto:'🎉', trend:'📈', news:'📰', meme:'😄'
}

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

export default function RtmPage() {
  const { dna, selectedPlatforms: storePlatforms, activeProject } = useStore()
  const [platforms, setPlatforms] = useState<Platform[]>(storePlatforms.length ? storePlatforms : ['facebook','instagram'])
  const [industry, setIndustry] = useState(dna?.industry || '')
  const [loading, setLoading] = useState(false)
  const [generatingPostsFor, setGeneratingPostsFor] = useState<string | null>(null)
  const [data, setData] = useState<RtmData|null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<RtmOpportunity|null>(null)
  const [selectedPost, setSelectedPost] = useState<RtmPost|null>(null)
  const [history, setHistory] = useState<HistoryEntry<RtmData>[]>([])
  const projectId = activeProject?.id || 'default'

  useEffect(() => {
    const h = historyLoad<RtmData>('rtm', projectId)
    setHistory(h)
    if (h.length > 0 && !data) {
      setData(h[0].data)
      if (h[0].data.opportunities?.length) setSelected(h[0].data.opportunities[0])
    }
  }, [projectId])
  const [copied, setCopied] = useState<string|null>(null)

  function togglePlatform(id: Platform) { setPlatforms(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]) }

  const [streamProgress, setStreamProgress] = useState('')

  async function generatePostsForOpportunity(opp: RtmOpportunity) {
    if (!dna) {
      setError('Brak Brand DNA - przejdź do zakładki "Marka" i uzupełnij')
      return
    }
    setGeneratingPostsFor(opp.id)
    try {
      const res = await fetch('/api/rtm-single-opportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dna,
          opportunity: { title: opp.title, why: opp.why, category: opp.category },
          platforms: storePlatforms?.length ? storePlatforms : ['facebook', 'instagram'],
        })
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error || 'Błąd generowania')
      // Update selected with generated posts
      const updatedOpp = { ...opp, posts: j.posts }
      setSelected(updatedOpp)
      if (j.posts?.[0]) setSelectedPost(j.posts[0])
      // Also update in data if exists
      setData(prev => prev ? {
        ...prev,
        opportunities: prev.opportunities.map(o => o.id === opp.id ? updatedOpp : o)
      } : prev)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setGeneratingPostsFor(null)
    }
  }

  async function scan() {
    setLoading(true); setError(''); setData(null); setSelected(null); setStreamProgress('')
    try {
      const res = await fetch('/api/rtm', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ dna, industry: industry || dna?.industry, platforms, country: 'Polska' })
      })

      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('Brak streamu')

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue
          let parsedLine: {chunk?:string;done?:boolean;data?:RtmData;error?:string} | null = null
          try {
            parsedLine = JSON.parse(jsonStr)
          } catch {
            continue
          }
          if (!parsedLine) continue
          if (parsedLine.chunk) {
            setStreamProgress('Skanuje trendy i newsy...')
          }
          if (parsedLine.error) {
            console.error('RTM SSE error:', parsedLine.error, 'debug:', (parsedLine as {debug?:unknown}).debug)
            throw new Error(parsedLine.error)
          }
          if (parsedLine.done && parsedLine.data) {
            setData(parsedLine.data)
            setStreamProgress('')
            if (parsedLine.data.opportunities?.length) setSelected(parsedLine.data.opportunities[0])
            const entry = historySave<RtmData>('rtm', projectId, {
              title: `RTM — ${dna?.brandName || 'Marka'}`,
              subtitle: parsedLine.data.date || new Date().toLocaleDateString('pl'),
              data: parsedLine.data,
            })
            setHistory(prev => [entry, ...prev].slice(0, 10))
          }
        }
      }
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false); setStreamProgress('') }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(()=>setCopied(null),1500)
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">⚡ RTM Generator</h1>
            <p className="text-gray-500 text-sm mt-1">Real Time Marketing — dzisiejsze newsy i trendy przetworzone w gotowe posty dla Twojej marki</p>
          </div>
          {data && <button onClick={() => setData(null)} className="btn-ghost text-sm">← Nowe skanowanie</button>}
        </div>

        {/* Setup */}
        {!data && (
          <div className="card space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Branża (opcjonalnie — doprecyzowanie)</label>
                <input className="input" placeholder={dna?.industry || 'np. edukacja, moda, gastronomia...'}
                  value={industry} onChange={e=>setIndustry(e.target.value)}/>
              </div>
              <div>
                <label className="label">Platformy</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={()=>togglePlatform(p.id as Platform)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-all"
                      style={{background:platforms.includes(p.id as Platform)?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.03)',borderColor:platforms.includes(p.id as Platform)?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.07)'}}>
                      <PlatformIcon platform={p.id} size={16}/>
                      <span className={platforms.includes(p.id as Platform)?'text-indigo-300':'text-gray-600'}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4 text-xs text-amber-400/80 leading-relaxed"
              style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)'}}>
              ⚡ RTM Generator używa wiedzy AI o aktualnych trendach i wydarzeniach. Dla najlepszych wyników skanuj codziennie rano — RTM działa najlepiej w ciągu 24-48h od wydarzenia.
            </div>

            {dna && (
              <div className="flex items-center gap-2 text-xs text-indigo-400/80 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-3 py-2">
                <span>⚡</span> Posty RTM będą napisane głosem marki <strong>{dna.brandName}</strong> · ton: {dna.tone}
              </div>
            )}
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            <button className="btn-primary flex items-center gap-2 px-8 py-3 text-base" onClick={scan} disabled={loading}>
              {loading ? <><Dots/> Skanuję trendy i newsy...</> : '⚡ Skanuj dzisiejsze trendy'}
            </button>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-5">
            {/* Date banner */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <span className="text-sm font-medium text-white">{data.date}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>🎯 {data.opportunities?.length} okazji RTM</span>
                <span>·</span>
                <span>📅 {data.todayCalendar?.length} dat w kalendarzu</span>
                <span>·</span>
                <span>📈 {data.weeklyTrends?.length} trendów tygodniowych</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {/* Left: opportunities list */}
              <div className="col-span-1 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Okazje RTM</p>
                {(data.opportunities||[]).map(opp => {
                  const rel = RELEVANCE_CFG[opp.relevance] || RELEVANCE_CFG.niskie
                  const urg = URGENCY_CFG[opp.urgency] || URGENCY_CFG['ten tydzien']
                  return (
                    <button key={opp.id} onClick={() => { setSelected(opp); setSelectedPost(null) }}
                      className="w-full text-left p-3.5 rounded-2xl border transition-all"
                      style={{
                        background: selected?.id===opp.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                        borderColor: selected?.id===opp.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)',
                      }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{CATEGORY_ICONS[opp.category]||'📌'}</span>
                          <span className="text-xs font-semibold text-white leading-tight">{opp.title}</span>
                        </div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{background:rel.bg,color:rel.color,border:`1px solid ${rel.border}`}}>
                          {opp.relevance}
                        </span>
                      </div>
                      <p className="text-[11px]" style={{color:urg.color}}>{urg.label}</p>
                      <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{opp.why}</p>
                    </button>
                  )
                })}

                {/* Today calendar */}
                {data.todayCalendar?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-2">Kalendarz dziś</p>
                    {data.todayCalendar.map((item,i) => {
                      // Try to find matching opportunity (by name match)
                      const matchingOpp = data.opportunities?.find(o => 
                        o.title.toLowerCase().includes(item.name.toLowerCase().slice(0, 15)) ||
                        item.name.toLowerCase().includes(o.title.toLowerCase().slice(0, 15))
                      )
                      const isSelected = matchingOpp && selected?.id === matchingOpp.id
                      
                      return (
                        <button key={i} 
                          onClick={() => {
                            if (matchingOpp) {
                              setSelected(matchingOpp)
                              setSelectedPost(null)
                            } else {
                              // Create synthetic opportunity from calendar item
                              const synthetic: RtmOpportunity = {
                                id: `cal-${i}`,
                                title: item.name,
                                category: item.type,
                                relevance: item.potential === 'wysoki' ? 'wysokie' : item.potential === 'sredni' ? 'srednie' : 'niskie',
                                why: item.idea,
                                risk: 'Brak — sprawdź czy temat pasuje do marki',
                                urgency: 'dzisiaj',
                                posts: [],
                              }
                              setSelected(synthetic)
                              setSelectedPost(null)
                            }
                          }}
                          className="w-full text-left p-3 rounded-xl mb-2 transition-all hover:border-indigo-500/30"
                          style={{
                            background: isSelected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                            border: isSelected ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                          }}>
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <p className="text-xs font-medium text-gray-200">{item.name}</p>
                            <span className="text-[10px] shrink-0" style={{color:item.potential==='wysoki'?'#34d399':item.potential==='sredni'?'#fbbf24':'#6b7280'}}>
                              {item.potential}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 mb-1">{item.idea}</p>
                          {matchingOpp ? (
                            <p className="text-[10px] text-indigo-400">→ Zobacz gotowe posty</p>
                          ) : (
                            <p className="text-[10px] text-gray-500">→ Kliknij aby przygotować posty</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right: selected opportunity detail */}
              <div className="col-span-2">
                {selected ? (
                  <div className="space-y-4">
                    {/* Opportunity header */}
                    <div className="card">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{CATEGORY_ICONS[selected.category]||'📌'}</span>
                            <h2 className="font-bold text-white">{selected.title}</h2>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{...(RELEVANCE_CFG[selected.relevance]||RELEVANCE_CFG.niskie),background:(RELEVANCE_CFG[selected.relevance]||RELEVANCE_CFG.niskie).bg,border:`1px solid ${(RELEVANCE_CFG[selected.relevance]||RELEVANCE_CFG.niskie).border}`}}>
                              {selected.relevance}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{(URGENCY_CFG[selected.urgency]||URGENCY_CFG['ten tydzien']).label}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-gray-600 mb-1">Dlaczego pasuje do Twojej marki</p>
                          <p className="text-xs text-emerald-300">{selected.why}</p>
                        </div>
                        {selected.risk && (
                          <div>
                            <p className="text-[10px] text-gray-600 mb-1">Ryzyko komunikacyjne</p>
                            <p className="text-xs text-amber-400">{selected.risk}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Platform posts */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gotowe posty RTM</p>
                      
                      {(!selected.posts || selected.posts.length === 0) ? (
                        <div className="card text-center py-8">
                          <p className="text-3xl mb-3">📝</p>
                          <p className="text-sm text-white font-medium mb-1">Brak gotowych postów dla tej okazji</p>
                          <p className="text-xs text-gray-500 mb-4">Wygeneruj profesjonalne posty na podstawie tej okazji kalendarzowej</p>
                          <button onClick={() => generatePostsForOpportunity(selected)}
                            disabled={generatingPostsFor === selected.id}
                            className="btn-primary text-sm px-6">
                            {generatingPostsFor === selected.id ? '✦ Generuję posty...' : '✦ Wygeneruj posty dla tej okazji'}
                          </button>
                        </div>
                      ) : (
                        <>
                      <div className="flex gap-2 mb-4">
                        {(selected.posts||[]).map((post,i) => (
                          <button key={i} onClick={() => setSelectedPost(post)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all"
                            style={{
                              background: selectedPost?.platform===post.platform ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                              borderColor: selectedPost?.platform===post.platform ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                            }}>
                            <PlatformIcon platform={post.platform} size={18}/>
                            <span className="text-xs capitalize" style={{color:selectedPost?.platform===post.platform?'#a5b4fc':'#6b7280'}}>{post.platform}</span>
                          </button>
                        ))}
                        {!selectedPost && selected.posts?.[0] && (
                          <button onClick={() => setSelectedPost(selected.posts[0])} className="text-xs text-indigo-400 px-3">
                            Kliknij platformę →
                          </button>
                        )}
                      </div>

                      {selectedPost && (
                        <div className="card space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PlatformIcon platform={selectedPost.platform} size={24}/>
                              <p className="text-sm font-medium text-white capitalize">{selectedPost.platform}</p>
                            </div>
                            <button onClick={() => copy(`${selectedPost.text}\n\n${selectedPost.hashtags.join(' ')}`, 'post')}
                              className="btn-primary text-xs py-2 px-4">
                              {copied==='post' ? '✓ Skopiowano' : '📋 Kopiuj post'}
                            </button>
                          </div>

                          <div className="p-3 rounded-xl"
                            style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)'}}>
                            <p className="text-[10px] text-amber-400 mb-1">🎣 Kąt podejścia</p>
                            <p className="text-xs text-white">{selectedPost.angle}</p>
                          </div>

                          <div>
                            <p className="text-[10px] text-gray-600 mb-2">Hook</p>
                            <p className="text-sm font-medium text-indigo-200 italic">&ldquo;{selectedPost.hook}&rdquo;</p>
                          </div>

                          <div>
                            <p className="text-[10px] text-gray-600 mb-2">Tekst posta</p>
                            <div className="p-4 rounded-xl whitespace-pre-wrap text-sm text-gray-200 leading-relaxed"
                              style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                              {selectedPost.text}
                            </div>
                          </div>

                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[10px] text-gray-600 mb-1.5">Hashtagi</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(selectedPost.hashtags||[]).map((h,i) => (
                                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
                                    style={{background:'rgba(99,102,241,0.12)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button onClick={() => copy((selectedPost.hashtags||[]).join(' '),'hashtags')}
                              className="text-xs text-indigo-400 hover:text-indigo-300">
                              {copied==='hashtags'?'✓':'kopiuj'}
                            </button>
                          </div>

                          {selectedPost.imageIdea && (
                            <div className="p-3 rounded-xl"
                              style={{background:'rgba(168,85,247,0.06)',border:'1px solid rgba(168,85,247,0.15)'}}>
                              <p className="text-[10px] text-purple-400 mb-1">🎨 Pomysł na grafikę</p>
                              <p className="text-xs text-gray-300 mb-3">{selectedPost.imageIdea}</p>
                              <ImageGenerator
                                key={`${selected.id}-${selectedPost.platform}`}
                                initialPrompt={selectedPost.imageIdea}
                                platform={selectedPost.platform}
                                size="md"
                              />
                            </div>
                          )}
                        </div>
                      )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="card text-center py-12">
                    <p className="text-4xl mb-3">👈</p>
                    <p className="text-gray-400">Wybierz okazję RTM z lewej strony</p>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly trends + avoid + tips */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📈 Trendy tygodnia</h3>
                {(data.weeklyTrends||[]).map((t,i) => (
                  <div key={i} className="pb-2.5 mb-2.5 border-b border-white/5 last:border-0">
                    <p className="text-xs font-medium text-gray-200">{t.trend}</p>
                    <p className="text-[10px] text-indigo-400 mt-0.5">{t.platform}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{t.relevance}</p>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3">⚠️ Unikaj dziś</h3>
                {(data.avoidTopics||[]).map((t,i) => (
                  <p key={i} className="text-xs text-gray-500 flex gap-1.5 mb-2"><span className="text-red-400">✕</span>{t}</p>
                ))}
              </div>
              <div className="card">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3">💡 Wskazówki RTM</h3>
                {(data.rtmTips||[]).map((t,i) => (
                  <p key={i} className="text-xs text-gray-400 flex gap-1.5 mb-2"><span className="text-amber-400">{i+1}.</span>{t}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
