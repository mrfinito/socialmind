'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import HistoryDrawer from '@/components/HistoryDrawer'
import { historyLoad, historySave, historyDelete } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import type { Platform } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'

interface Post { day:number; week:number; platform:string; type:string; topic:string; hook:string; text:string; imagePrompt:string; bestTime:string; goal:string }
interface VideoScript { week:number; platform:string; topic:string; hook:string; outline:string[]; duration:string; music:string }
interface KampaniaData {
  campaignName:string; campaignTagline:string; strategy:string; keyMessage:string
  contentPillars:{name:string;description:string;percentage:number}[]
  posts:Post[]
  videoScripts:VideoScript[]
  schedule:{postsPerWeek:number;bestDays:string[];bestTimes:Record<string,string>}
  hashtags:{primary:string[];secondary:string[];campaign:string}
  kpis:{metric:string;target:string;howToMeasure:string}[]
  budget:{organic:string;paid:string;breakdown:string}
}

const GOALS = ['Świadomość marki','Sprzedaż','Zaangażowanie','Ruch na stronę','Leady','Budowanie społeczności']
const DURATIONS = [
  {id:'2weeks',label:'2 tygodnie',posts:'~10 postów'},
  {id:'month',label:'Miesiąc',posts:'~20 postów'},
  {id:'2months',label:'2 miesiące',posts:'~30 postów'},
]
const TYPE_COLOR:Record<string,string> = {
  'edukacja':'bg-blue-500/20 text-blue-300',
  'zaangażowanie':'bg-purple-500/20 text-purple-300',
  'sprzedaż':'bg-emerald-500/20 text-emerald-300',
  'behind-the-scenes':'bg-amber-500/20 text-amber-300',
}

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

export default function KampaniaPage() {
  const { dna, selectedPlatforms: storePlatforms, savePost } = useStore()
  const [brief, setBrief] = useState('')
  const [history, setHistory] = useState<HistoryEntry<KampaniaData>[]>([])
  const projectId = dna?.brandName || 'default'
  useEffect(() => { setHistory(historyLoad<KampaniaData>('kampania', projectId)) }, [projectId])
  const [platforms, setPlatforms] = useState<Platform[]>(storePlatforms.length ? storePlatforms : ['facebook','instagram'])
  const [duration, setDuration] = useState('month')
  const [goals, setGoals] = useState<string[]>(['Świadomość marki'])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [data, setData] = useState<KampaniaData|null>(null)
  const [error, setError] = useState('')
  const [activeWeek, setActiveWeek] = useState(1)
  const [activeTab, setActiveTab] = useState<'calendar'|'posts'|'videos'|'strategy'>('calendar')
  const [copiedPost, setCopiedPost] = useState<number|null>(null)
  const [expandedPost, setExpandedPost] = useState<number|null>(null)

  function togglePlatform(id: Platform) { setPlatforms(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]) }
  function toggleGoal(g: string) { setGoals(p => p.includes(g) ? p.filter(x=>x!==g) : [...p,g]) }

  async function generate() {
    if (!brief.trim()) { setError('Opisz temat/brief kampanii'); return }
    if (!platforms.length) { setError('Wybierz przynajmniej jedną platformę'); return }
    setLoading(true); setError(''); setData(null)
    setProgress('Analizuję brief...')
    try {
      setTimeout(() => setProgress('Buduję strategię i filary contentu...'), 2000)
      setTimeout(() => setProgress('Generuję posty (to może chwilę potrwać)...'), 5000)
      setTimeout(() => setProgress('Tworzę skrypty wideo i harmonogram...'), 10000)
      const res = await fetch('/api/kampania', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ brief, platforms, duration, goals, masterPrompt: dna?.masterPrompt, brandName: dna?.brandName, industry: dna?.industry, tone: dna?.tone })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      setActiveWeek(1)
      const entry = historySave<KampaniaData>('kampania', projectId, {
        title: brief.slice(0, 60),
        subtitle: `${duration} · ${platforms.join(', ')}`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false); setProgress('') }
  }

  function exportCampaign() {
    if (!data) return
    let txt = `KAMPANIA: ${data.campaignName}\n${data.campaignTagline}\n${'═'.repeat(60)}\n\n`
    txt += `STRATEGIA\n${data.strategy}\n\nGŁÓWNY PRZEKAZ\n${data.keyMessage}\n\n`
    txt += `HASHTAG KAMPANII: ${data.hashtags?.campaign}\n\n`
    const weeks = [...new Set((data.posts||[]).map(p=>p.week))].sort()
    weeks.forEach(w => {
      txt += `\n${'─'.repeat(40)}\nTYDZIEŃ ${w}\n${'─'.repeat(40)}\n`
      data.posts.filter(p=>p.week===w).forEach(p => {
        txt += `\nDzień ${p.day} | ${p.platform.toUpperCase()} | ${p.type} | ${p.bestTime}\n`
        txt += `Temat: ${p.topic}\nHook: ${p.hook}\n${p.text}\n`
        txt += `[GRAFIKA]: ${p.imagePrompt}\n`
      })
    })
    if (data.videoScripts?.length) {
      txt += `\n${'═'.repeat(60)}\nSKRYPTY WIDEO\n${'═'.repeat(60)}\n`
      data.videoScripts.forEach((v,i) => {
        txt += `\n${i+1}. ${v.topic} (${v.platform}, ${v.duration})\nHook: ${v.hook}\n`
        v.outline.forEach((s,j) => txt += `  Scena ${j+1}: ${s}\n`)
        txt += `Muzyka: ${v.music}\n`
      })
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}))
    a.download = `kampania_${data.campaignName.replace(/\s/g,'_')}.txt`
    a.click()
  }

  const weeks = data ? [...new Set(data.posts.map(p=>p.week))].sort() : []
  const weekPosts = data ? data.posts.filter(p=>p.week===activeWeek) : []
  const maxWeek = weeks.length

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">🚀 Kampania 360°</h1>
          <p className="text-gray-500 text-sm mt-1">Jeden brief → cały miesiąc contentu: posty, skrypty wideo, harmonogram, hashtagi, KPI</p>
          <div className="mt-3">
            <HistoryDrawer<KampaniaData>
              module="kampania" projectId={projectId} entries={history}
              icon="🚀"
              onLoad={e => { setData(e.data); setBrief(e.title) }}
              onDelete={id => setHistory(prev => prev.filter(e => e.id !== id))}
              formatTitle={e => e.title}
              formatSubtitle={e => e.subtitle || ''}
            />
          </div>
        </div>

        {/* Input */}
        {!data && (
          <div className="card space-y-5">
            <div>
              <label className="label">Brief kampanii</label>
              <textarea className="input resize-y" style={{minHeight:120}}
                placeholder="Opisz temat kampanii np. 'Lato z naszym przedszkolem — chcemy pokazać jak spędzamy wakacje z dziećmi, budujemy zaufanie rodziców i zbieramy zapisy na wrzesień. Target: mamy 28-40 lat w Warszawie.'"
                value={brief} onChange={e=>setBrief(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="label">Platformy</label>
                <div className="space-y-1.5 mt-1">
                  {PLATFORMS.map(p=>(
                    <button key={p.id} onClick={()=>togglePlatform(p.id as Platform)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition-all text-left"
                      style={{background:platforms.includes(p.id as Platform)?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',borderColor:platforms.includes(p.id as Platform)?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.08)'}}>
                      <PlatformIcon platform={p.id} size={22}/>
                      <span className={platforms.includes(p.id as Platform)?'text-indigo-300':'text-gray-500 text-xs'}>{p.name}</span>
                      {platforms.includes(p.id as Platform) && <span className="ml-auto text-indigo-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Czas trwania</label>
                <div className="space-y-2 mt-1">
                  {DURATIONS.map(d=>(
                    <button key={d.id} onClick={()=>setDuration(d.id)}
                      className="w-full px-4 py-3 rounded-xl border text-left transition-all"
                      style={{background:duration===d.id?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.03)',borderColor:duration===d.id?'rgba(99,102,241,0.45)':'rgba(255,255,255,0.08)'}}>
                      <p className={`text-sm font-semibold ${duration===d.id?'text-indigo-300':'text-gray-300'}`}>{d.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{d.posts}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Cele kampanii</label>
                <div className="space-y-1.5 mt-1">
                  {GOALS.map(g=>(
                    <button key={g} onClick={()=>toggleGoal(g)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all text-left"
                      style={{background:goals.includes(g)?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',borderColor:goals.includes(g)?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.08)'}}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${goals.includes(g)?'bg-indigo-500 border-indigo-500 text-white':'border-gray-700'}`}>
                        {goals.includes(g)?'✓':''}
                      </span>
                      <span className={goals.includes(g)?'text-indigo-300':'text-gray-500 text-xs'}>{g}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {dna && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)'}}>
                <span className="text-indigo-400">✦</span>
                <span className="text-indigo-300">Kampania zostanie dopasowana do Brand DNA: <strong>{dna.brandName}</strong> · {dna.industry}</span>
              </div>
            )}
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            <button className="btn-primary flex items-center gap-2 px-8 py-3 text-base" onClick={generate} disabled={loading}>
              {loading ? <><Dots /> {progress || 'Generuję kampanię...'}</> : '🚀 Generuj kampanię 360°'}
            </button>
          </div>
        )}

        {/* Campaign output */}
        {data && (
          <div className="space-y-5">
            {/* Header */}
            <div className="rounded-2xl p-6" style={{background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.08))',border:'1px solid rgba(99,102,241,0.25)'}}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Kampania social media</p>
                  <h2 className="text-2xl font-bold text-white mb-1">{data.campaignName}</h2>
                  <p className="text-indigo-200 text-sm italic mb-3">&ldquo;{data.campaignTagline}&rdquo;</p>
                  <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">{data.strategy}</p>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button onClick={exportCampaign} className="btn-secondary text-sm">⬇ Eksport .txt</button>
                  <button onClick={()=>setData(null)} className="btn-ghost text-sm">← Nowa kampania</button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
                <div className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:'rgba(99,102,241,0.25)',color:'#c4b5fd'}}>
                  {data.hashtags?.campaign}
                </div>
                <span className="text-gray-500 text-xs">·</span>
                <span className="text-gray-400 text-xs">{data.posts?.length || 0} postów</span>
                <span className="text-gray-500 text-xs">·</span>
                <span className="text-gray-400 text-xs">{data.videoScripts?.length || 0} skryptów wideo</span>
                <span className="text-gray-500 text-xs">·</span>
                <div className="flex gap-1">
                  {platforms.map(p => <PlatformIcon key={p} platform={p} size={20}/>)}
                </div>
              </div>
            </div>

            {/* Content pillars */}
            <div className="grid grid-cols-4 gap-3">
              {(data.contentPillars||[]).map((pillar,i)=>(
                <div key={i} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-300">{pillar.name}</p>
                    <span className="text-lg font-bold text-white">{pillar.percentage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full bg-indigo-500" style={{width:`${pillar.percentage}%`}}/>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{pillar.description}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1.5 rounded-2xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              {[
                {id:'calendar',label:'📅 Kalendarz'},
                {id:'posts',label:`✍️ Posty (${data.posts?.length||0})`},
                {id:'videos',label:`🎬 Wideo (${data.videoScripts?.length||0})`},
                {id:'strategy',label:'📊 Strategia'},
              ].map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id as typeof activeTab)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{background:activeTab===t.id?'rgba(99,102,241,0.25)':'transparent',color:activeTab===t.id?'#a5b4fc':'#6b7280'}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* CALENDAR TAB */}
            {activeTab==='calendar' && (
              <div>
                {/* Week selector */}
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={()=>setActiveWeek(w=>Math.max(1,w-1))} disabled={activeWeek===1}
                    className="btn-ghost px-3 py-2 disabled:opacity-30">←</button>
                  {weeks.map(w=>(
                    <button key={w} onClick={()=>setActiveWeek(w)}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{background:activeWeek===w?'rgba(99,102,241,0.25)':'rgba(255,255,255,0.04)',color:activeWeek===w?'#a5b4fc':'#6b7280',border:`1px solid ${activeWeek===w?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.06)'}`}}>
                      Tydzień {w}
                    </button>
                  ))}
                  <button onClick={()=>setActiveWeek(w=>Math.min(maxWeek,w+1))} disabled={activeWeek===maxWeek}
                    className="btn-ghost px-3 py-2 disabled:opacity-30">→</button>
                </div>

                {/* Week grid — 7 columns */}
                <div className="card p-0 overflow-hidden">
                  <div className="grid grid-cols-7" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    {['Pon','Wt','Śr','Czw','Pt','Sob','Nie'].map(d=>(
                      <div key={d} className="text-center py-2.5 text-xs font-medium text-gray-600">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {Array.from({length:7},(_,dayOfWeek)=>{
                      const dayNum = (activeWeek-1)*7 + dayOfWeek + 1
                      const dayPosts = weekPosts.filter(p=>p.day===dayNum)
                      return (
                        <div key={dayOfWeek} className="min-h-[120px] p-2"
                          style={{borderRight:'1px solid rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <span className="text-xs text-gray-700 block mb-1.5">Dzień {dayNum}</span>
                          {dayPosts.map((post,i)=>(
                            <div key={i}
                              onClick={()=>setExpandedPost(expandedPost===data.posts.indexOf(post)?null:data.posts.indexOf(post))}
                              className="mb-1.5 p-2 rounded-lg cursor-pointer transition-all hover:opacity-80"
                              style={{background:'rgba(99,102,241,0.18)',border:'1px solid rgba(99,102,241,0.3)'}}>
                              <div className="flex items-center gap-1 mb-1">
                                <PlatformIcon platform={post.platform} size={14}/>
                                <span className="text-[9px] text-gray-500">{post.bestTime}</span>
                              </div>
                              <p className="text-[10px] text-indigo-200 leading-tight line-clamp-2">{post.topic}</p>
                              <span className={`text-[8px] px-1 py-0.5 rounded mt-1 inline-block ${TYPE_COLOR[post.type]||'bg-gray-500/20 text-gray-400'}`}>
                                {post.type}
                              </span>
                            </div>
                          ))}
                          {dayPosts.length===0 && (
                            <div className="h-8 rounded-lg border border-dashed border-white/5"/>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Expanded post detail */}
                {expandedPost !== null && data.posts[expandedPost] && (
                  <div className="card mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={data.posts[expandedPost].platform} size={28}/>
                        <div>
                          <p className="text-sm font-semibold text-white">{data.posts[expandedPost].topic}</p>
                          <p className="text-xs text-gray-500">Dzień {data.posts[expandedPost].day} · {data.posts[expandedPost].bestTime} · {data.posts[expandedPost].type}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>{navigator.clipboard.writeText(data.posts[expandedPost!].text);setCopiedPost(expandedPost);setTimeout(()=>setCopiedPost(null),1500)}}
                          className="btn-secondary text-xs py-1.5">{copiedPost===expandedPost?'✓ Skopiowano':'Kopiuj tekst'}</button>
                        <button onClick={()=>setExpandedPost(null)} className="btn-ghost text-xs">✕</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1.5">Tekst posta</p>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{data.posts[expandedPost].text}</p>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-gray-600 mb-1">Hook</p>
                          <p className="text-xs text-indigo-300 italic">&ldquo;{data.posts[expandedPost].hook}&rdquo;</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-600 mb-1">Cel posta</p>
                          <p className="text-xs text-gray-400">{data.posts[expandedPost].goal}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-600 mb-1">Prompt grafiki</p>
                          <div className="relative p-2.5 rounded-lg" style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.06)'}}>
                            <p className="text-[11px] font-mono text-gray-500 leading-relaxed pr-10">{data.posts[expandedPost].imagePrompt}</p>
                            <button onClick={()=>navigator.clipboard.writeText(data.posts[expandedPost!].imagePrompt)}
                              className="absolute top-2 right-2 text-[10px] text-gray-600 hover:text-gray-400 border border-white/8 rounded px-1.5 py-0.5">kopiuj</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* POSTS TAB */}
            {activeTab==='posts' && (
              <div className="space-y-3">
                {(data.posts||[]).map((post,i)=>(
                  <div key={i} className="card p-0 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/2 transition-all"
                      onClick={()=>setExpandedPost(expandedPost===i?null:i)}>
                      <span className="text-xs font-mono text-gray-700 w-8">D{post.day}</span>
                      <PlatformIcon platform={post.platform} size={24}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{post.topic}</p>
                        <p className="text-xs text-gray-600">{post.bestTime} · {post.goal}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-lg ${TYPE_COLOR[post.type]||'bg-gray-500/20 text-gray-400'}`}>{post.type}</span>
                      <span className="text-gray-600 text-sm">{expandedPost===i?'▲':'▼'}</span>
                    </div>
                    {expandedPost===i && (
                      <div className="px-5 pb-4 pt-2 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-gray-600 mb-1.5 flex items-center justify-between">
                              Tekst posta
                              <button onClick={()=>{navigator.clipboard.writeText(post.text);setCopiedPost(i);setTimeout(()=>setCopiedPost(null),1500)}}
                                className="text-indigo-400 hover:text-indigo-300">{copiedPost===i?'✓':'kopiuj'}</button>
                            </p>
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{post.text}</p>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] text-gray-600 mb-1">Hook</p>
                              <p className="text-xs text-indigo-300 italic">&ldquo;{post.hook}&rdquo;</p>
                            </div>
                            <div className="relative p-2.5 rounded-lg" style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.06)'}}>
                              <p className="text-[11px] font-mono text-gray-500 leading-relaxed pr-10">{post.imagePrompt}</p>
                              <button onClick={()=>navigator.clipboard.writeText(post.imagePrompt)}
                                className="absolute top-2 right-2 text-[10px] text-gray-600 hover:text-gray-400 border border-white/8 rounded px-1.5 py-0.5">kopiuj</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* VIDEOS TAB */}
            {activeTab==='videos' && (
              <div className="space-y-4">
                {(data.videoScripts||[]).length===0
                  ? <div className="card text-center py-10 text-gray-600">Brak skryptów wideo dla tej kampanii</div>
                  : (data.videoScripts||[]).map((v,i)=>(
                    <div key={i} className="card">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <PlatformIcon platform={v.platform} size={32}/>
                          <div>
                            <p className="font-semibold text-white">{v.topic}</p>
                            <p className="text-xs text-gray-500">Tydzień {v.week} · {v.duration}</p>
                          </div>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full" style={{background:'rgba(245,158,11,0.15)',color:'#fbbf24',border:'1px solid rgba(245,158,11,0.25)'}}>
                          🎬 {v.duration}
                        </span>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="p-3 rounded-xl" style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)'}}>
                          <p className="text-[10px] text-amber-400 mb-1">HOOK (3s)</p>
                          <p className="text-sm font-medium text-white">&ldquo;{v.hook}&rdquo;</p>
                        </div>
                        {(v.outline||[]).map((scene,j)=>(
                          <div key={j} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{j+1}</span>
                            <p className="text-sm text-gray-400">{scene}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600">🎵 {v.music}</p>
                    </div>
                  ))
                }
              </div>
            )}

            {/* STRATEGY TAB */}
            {activeTab==='strategy' && (
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-3">📅 Harmonogram</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Postów / tydzień</span>
                        <span className="text-white font-semibold">{data.schedule?.postsPerWeek}</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1.5">Najlepsze dni</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {(data.schedule?.bestDays||[]).map(d=>(
                            <span key={d} className="text-xs px-2.5 py-1 rounded-full tag tag-active">{d}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1.5">Najlepsze godziny</p>
                        {Object.entries(data.schedule?.bestTimes||{}).map(([p,t])=>(
                          <div key={p} className="flex items-center gap-2 py-1">
                            <PlatformIcon platform={p} size={18}/>
                            <span className="text-xs text-gray-400 capitalize">{p}</span>
                            <span className="ml-auto text-xs text-white font-mono">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-3"># Hashtagi</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1.5">Kampanijny</p>
                        <span className="text-sm font-bold px-3 py-1.5 rounded-full" style={{background:'rgba(99,102,241,0.2)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.3)'}}>
                          {data.hashtags?.campaign}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1.5">Główne</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(data.hashtags?.primary||[]).map(h=>(
                            <span key={h} className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(99,102,241,0.12)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>{h}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1.5">Uzupełniające</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(data.hashtags?.secondary||[]).map(h=>(
                            <span key={h} className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.05)',color:'#9ca3af',border:'1px solid rgba(255,255,255,0.08)'}}>{h}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={()=>navigator.clipboard.writeText([data.hashtags?.campaign,...(data.hashtags?.primary||[]),...(data.hashtags?.secondary||[])].join(' '))}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Kopiuj wszystkie →</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-3">🎯 KPI</h3>
                    <div className="space-y-3">
                      {(data.kpis||[]).map((kpi,i)=>(
                        <div key={i} className="p-3 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                          <div className="flex justify-between mb-1">
                            <p className="text-xs font-medium text-gray-300">{kpi.metric}</p>
                            <p className="text-xs font-bold text-indigo-300">{kpi.target}</p>
                          </div>
                          <p className="text-[11px] text-gray-600">{kpi.howToMeasure}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-3">💰 Budżet</h3>
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1">Organiczny</p>
                        <p className="text-xs text-gray-400">{data.budget?.organic}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1">Płatny</p>
                        <p className="text-xs text-gray-400">{data.budget?.paid}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1">Podział</p>
                        <p className="text-xs text-gray-400">{data.budget?.breakdown}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
