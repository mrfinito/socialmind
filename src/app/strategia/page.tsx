'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { PLATFORMS } from '@/lib/types'
import type { Platform } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

const GOALS = ['Świadomość marki','Sprzedaż / leady','Zaangażowanie społeczności','Ruch na stronę','Pozycjonowanie jako ekspert','Budowanie lojalności']
const BUDGETS = ['Do 1000 zł/mies.','1000-3000 zł/mies.','3000-10000 zł/mies.','Powyżej 10000 zł/mies.','Tylko organicznie']
const DURATIONS = ['1 miesiąc','3 miesiące','6 miesięcy','12 miesięcy']

interface StrategyData {
  executiveSummary: string
  brandPosition: { currentState:string; desiredState:string; gap:string; uniqueVoice:string }
  audienceInsight: { primarySegment:string; painPoints:string[]; motivations:string[]; contentConsumption:string; decisionFactors:string[] }
  competitiveAnalysis: { marketGaps:string[]; differentiators:string[]; competitorWeaknesses:string }
  contentStrategy: { pillars:{name:string;description:string;percentage:number;examples:string[]}[]; toneGuidelines:string[]; doList:string[]; dontList:string[] }
  platformStrategy: { platform:string; role:string; frequency:string; bestFormats:string[]; bestTimes:string; kpi:string; contentMix:string }[]
  contentCalendar: { weeklyRhythm:string; monthlyThemes:string[]; keyDates:string[]; campaignIdeas:{name:string;concept:string;timing:string}[] }
  kpis: { metric:string; target:string; timeline:string; howToMeasure:string }[]
  actionPlan: { week:string; actions:string[] }[]
  budget: { organic:string; paid:string; tools:string[] }
  hashtags: { brand:string[]; industry:string[]; campaign:string }
}

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

export default function StrategiaPage() {
  const { dna, selectedPlatforms: storePlatforms, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'

  const [competitors, setCompetitors] = useState('')
  const [targetAudience, setTargetAudience] = useState(dna?.persona || '')
  const [goals, setGoals] = useState<string[]>(['Świadomość marki'])
  const [budget, setBudget] = useState(BUDGETS[1])
  const [duration, setDuration] = useState('3 miesiące')
  const [platforms, setPlatforms] = useState<Platform[]>(storePlatforms.length ? storePlatforms : ['facebook','instagram'])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<StrategyData|null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview'|'content'|'platforms'|'calendar'|'action'>('overview')
  const [history, setHistory] = useState<HistoryEntry<StrategyData>[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setHistory(historyLoad<StrategyData>('strategia', projectId))
  }, [projectId])

  function togglePlatform(id: Platform) { setPlatforms(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]) }
  function toggleGoal(g: string) { setGoals(p => p.includes(g) ? p.filter(x=>x!==g) : [...p,g]) }

  async function generate() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/strategia', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ dna, competitors, targetAudience, goals, budget, duration, platforms })
      })
      const j = await res.json()
      console.log('Strategia API response ok:', res.ok, 'has data:', !!j.data, 'error:', j.error)
      if (!res.ok) throw new Error(j.error || 'Blad serwera')
      if (!j.data) throw new Error('Blad parsowania - brak danych')
      setData(j.data)
      const entry = historySave<StrategyData>('strategia', projectId, {
        title: `Strategia — ${dna?.brandName || 'Marka'}`,
        subtitle: `${duration} · ${goals[0]}`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 10))
      setActiveTab('overview')
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function exportStrategy() {
    if (!data) return
    let txt = `STRATEGIA KOMUNIKACJI — ${dna?.brandName || 'Marka'}\n${'═'.repeat(60)}\n\n`
    txt += `PODSUMOWANIE\n${data.executiveSummary}\n\n`
    txt += `POZYCJA MARKI\nObecna: ${data.brandPosition?.currentState}\nDocelowa: ${data.brandPosition?.desiredState}\nUnikalny głos: ${data.brandPosition?.uniqueVoice}\n\n`
    txt += `FILARY CONTENTU\n${(data.contentStrategy?.pillars||[]).map(p=>`${p.name} (${p.percentage}%): ${p.description}`).join('\n')}\n\n`
    txt += `PLAN DZIAŁAŃ\n${(data.actionPlan||[]).map(a=>`${a.week}:\n${a.actions.map(x=>`  · ${x}`).join('\n')}`).join('\n\n')}\n`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}))
    a.download = `strategia_${dna?.brandName||'marka'}.txt`
    a.click()
  }

  const TABS = [
    {id:'overview',label:'📊 Przegląd'},
    {id:'content',label:'✦ Content'},
    {id:'platforms',label:'📱 Platformy'},
    {id:'calendar',label:'📅 Kalendarz'},
    {id:'action',label:'🎯 Plan działań'},
  ]

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">🧭 Strategia komunikacji</h1>
            <p className="text-gray-500 text-sm mt-1">Research branży + analiza konkurencji + trendy = kompleksowa strategia social media</p>
          </div>
          <div className="flex gap-2">
            {history.length > 0 && (
              <div className="relative group">
                <button className="btn-secondary text-sm flex items-center gap-1.5">
                  🕐 Historia ({history.length}) <span className="text-xs">▼</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-72 rounded-xl overflow-hidden shadow-xl z-50 hidden group-hover:block"
                  style={{background:'#1a1f2e',border:'1px solid rgba(255,255,255,0.1)'}}>
                  {history.map(h => (
                    <button key={h.id} onClick={() => setData(h.data)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-all border-b border-white/5 last:border-0">
                      <p className="text-xs font-medium text-gray-200">{h.title}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{h.subtitle} · {new Date(h.createdAt).toLocaleDateString('pl')}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {data && <button onClick={() => setData(null)} className="btn-ghost text-sm">← Nowa strategia</button>}
          </div>
        </div>

        {/* Input form */}
        {!data && (
          <div className="card space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Główni konkurenci</label>
                <textarea className="input resize-none" style={{minHeight:80}}
                  placeholder="np. Agencja XYZ, Brand ABC, Przedszkole Montessori..."
                  value={competitors} onChange={e=>setCompetitors(e.target.value)}/>
              </div>
              <div>
                <label className="label">Grupa docelowa</label>
                <textarea className="input resize-none" style={{minHeight:80}}
                  placeholder="Kim są Twoi klienci? Wiek, potrzeby, zachowania..."
                  value={targetAudience} onChange={e=>setTargetAudience(e.target.value)}/>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Cele strategiczne</label>
                <div className="space-y-1.5 mt-1">
                  {GOALS.map(g => (
                    <button key={g} onClick={() => toggleGoal(g)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-all"
                      style={{
                        background: goals.includes(g) ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        borderColor: goals.includes(g) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)',
                        color: goals.includes(g) ? '#a5b4fc' : '#6b7280',
                      }}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[9px] shrink-0 ${goals.includes(g)?'bg-indigo-500 border-indigo-500 text-white':'border-gray-700'}`}>
                        {goals.includes(g)?'✓':''}
                      </span>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Budżet miesięczny</label>
                  <div className="space-y-1.5 mt-1">
                    {BUDGETS.map(b => (
                      <button key={b} onClick={() => setBudget(b)}
                        className="w-full text-left px-3 py-2 rounded-xl border text-xs transition-all"
                        style={{background:budget===b?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.03)',borderColor:budget===b?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.07)',color:budget===b?'#a5b4fc':'#6b7280'}}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Horyzont strategii</label>
                  <div className="space-y-1.5 mt-1">
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className="w-full text-left px-3 py-2 rounded-xl border text-xs transition-all"
                        style={{background:duration===d?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.03)',borderColor:duration===d?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.07)',color:duration===d?'#a5b4fc':'#6b7280'}}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Platformy</label>
                <div className="space-y-1.5 mt-1">
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => togglePlatform(p.id as Platform)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                      style={{background:platforms.includes(p.id as Platform)?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',borderColor:platforms.includes(p.id as Platform)?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.08)'}}>
                      <PlatformIcon platform={p.id} size={20}/>
                      <span className={platforms.includes(p.id as Platform)?'text-indigo-300':'text-gray-500 text-xs'}>{p.name}</span>
                      {platforms.includes(p.id as Platform) && <span className="ml-auto text-indigo-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {dna && (
              <div className="flex items-center gap-2 text-xs text-indigo-400/80 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-3 py-2">
                <span>✦</span> Strategia będzie zbudowana na Brand DNA: <strong>{dna.brandName}</strong> · {dna.industry}
              </div>
            )}
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            <button className="btn-primary flex items-center gap-2 px-8 py-3 text-base" onClick={generate} disabled={loading}>
              {loading ? <><Dots/> Buduję strategię...</> : '🧭 Generuj strategię komunikacji'}
            </button>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-5">
            {/* Header */}
            <div className="rounded-2xl p-6" style={{background:'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(168,85,247,0.06))',border:'1px solid rgba(99,102,241,0.2)'}}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Strategia komunikacji</p>
                  <h2 className="text-xl font-bold text-white">{dna?.brandName || 'Marka'}</h2>
                  <p className="text-gray-500 text-xs mt-0.5">{duration} · {goals.join(', ')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportStrategy} className="btn-secondary text-sm">⬇ Eksport</button>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{data.executiveSummary}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-medium transition-all"
                  style={{background:activeTab===t.id?'rgba(99,102,241,0.25)':'transparent',color:activeTab===t.id?'#a5b4fc':'#6b7280'}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {activeTab==='overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-4">📍 Pozycja marki</h3>
                    <div className="space-y-3">
                      <div><p className="text-[10px] text-gray-600 mb-1">Obecna sytuacja</p><p className="text-xs text-gray-400">{data.brandPosition?.currentState}</p></div>
                      <div><p className="text-[10px] text-gray-600 mb-1">Cel za {duration}</p><p className="text-xs text-emerald-300">{data.brandPosition?.desiredState}</p></div>
                      <div><p className="text-[10px] text-gray-600 mb-1">Co trzeba zrobić</p><p className="text-xs text-gray-400">{data.brandPosition?.gap}</p></div>
                      <div className="p-3 rounded-xl" style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.15)'}}>
                        <p className="text-[10px] text-indigo-400 mb-1">Unikalny głos marki</p>
                        <p className="text-xs text-indigo-200">{data.brandPosition?.uniqueVoice}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-4">👥 Insight o odbiorcach</h3>
                    <div className="space-y-3">
                      <div><p className="text-[10px] text-gray-600 mb-1">Główny segment</p><p className="text-xs font-medium text-white">{data.audienceInsight?.primarySegment}</p></div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1.5">Bóle i potrzeby</p>
                        {(data.audienceInsight?.painPoints||[]).map((p,i) => <p key={i} className="text-xs text-gray-400 flex gap-1.5 mb-1"><span className="text-red-400">−</span>{p}</p>)}
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1.5">Motywacje</p>
                        {(data.audienceInsight?.motivations||[]).map((m,i) => <p key={i} className="text-xs text-gray-400 flex gap-1.5 mb-1"><span className="text-emerald-400">+</span>{m}</p>)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-4">⚡ Analiza konkurencyjna</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-600 mb-2">Luki rynkowe</p>
                      {(data.competitiveAnalysis?.marketGaps||[]).map((g,i) => <p key={i} className="text-xs text-indigo-300 flex gap-1.5 mb-1.5"><span>→</span>{g}</p>)}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 mb-2">Nasze wyróżniki</p>
                      {(data.competitiveAnalysis?.differentiators||[]).map((d,i) => <p key={i} className="text-xs text-emerald-400 flex gap-1.5 mb-1.5"><span>✓</span>{d}</p>)}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 mb-2">Słabości konkurencji</p>
                      <p className="text-xs text-gray-400">{data.competitiveAnalysis?.competitorWeaknesses}</p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-4">🎯 KPI</h3>
                  <div className="space-y-2">
                    {(data.kpis||[]).map((kpi,i) => (
                      <div key={i} className="flex items-center gap-4 py-2.5 border-b border-white/5 last:border-0">
                        <p className="text-xs font-medium text-gray-300 flex-1">{kpi.metric}</p>
                        <p className="text-xs font-bold text-indigo-300 w-24 text-right">{kpi.target}</p>
                        <p className="text-xs text-gray-600 w-24 text-right">{kpi.timeline}</p>
                        <p className="text-xs text-gray-600 flex-1">{kpi.howToMeasure}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CONTENT */}
            {activeTab==='content' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {(data.contentStrategy?.pillars||[]).map((p,i) => (
                    <div key={i} className="card">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <span className="text-lg font-bold text-indigo-400">{p.percentage}%</span>
                      </div>
                      <div className="h-1.5 rounded-full mb-3" style={{background:'rgba(255,255,255,0.06)'}}>
                        <div className="h-full rounded-full bg-indigo-500" style={{width:`${p.percentage}%`}}/>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{p.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {(p.examples||[]).map((ex,j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{background:'rgba(99,102,241,0.1)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-3">✅ Co robić</h3>
                    {(data.contentStrategy?.doList||[]).map((d,i) => <p key={i} className="text-xs text-emerald-400 flex gap-1.5 mb-2"><span>✓</span>{d}</p>)}
                    <div className="pt-3 border-t border-white/6 mt-2">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">Zasady tonu</h4>
                      {(data.contentStrategy?.toneGuidelines||[]).map((t,i) => <p key={i} className="text-xs text-gray-400 flex gap-1.5 mb-1.5"><span className="text-indigo-400">·</span>{t}</p>)}
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-3">❌ Czego nie robić</h3>
                    {(data.contentStrategy?.dontList||[]).map((d,i) => <p key={i} className="text-xs text-red-400 flex gap-1.5 mb-2"><span>✕</span>{d}</p>)}
                    <div className="pt-3 border-t border-white/6 mt-2">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">Hashtagi</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {[...(data.hashtags?.brand||[]),...(data.hashtags?.industry||[])].map((h,i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{background:'rgba(255,255,255,0.05)',color:'#9ca3af',border:'1px solid rgba(255,255,255,0.08)'}}>
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PLATFORMS */}
            {activeTab==='platforms' && (
              <div className="space-y-4">
                {(data.platformStrategy||[]).map((p,i) => (
                  <div key={i} className="card">
                    <div className="flex items-start gap-4">
                      <PlatformIcon platform={p.platform} size={32}/>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-white capitalize">{p.platform}</p>
                          <span className="text-xs text-gray-600">{p.frequency}</span>
                          <span className="text-xs text-indigo-400 ml-auto">{p.bestTimes}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{p.role}</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div><p className="text-[10px] text-gray-600 mb-1">Formaty</p>{(p.bestFormats||[]).map((f,j) => <p key={j} className="text-xs text-gray-400">· {f}</p>)}</div>
                          <div><p className="text-[10px] text-gray-600 mb-1">KPI</p><p className="text-xs text-indigo-300">{p.kpi}</p></div>
                          <div><p className="text-[10px] text-gray-600 mb-1">Mix contentu</p><p className="text-xs text-gray-400">{p.contentMix}</p></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CALENDAR */}
            {activeTab==='calendar' && (
              <div className="space-y-4">
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-3">📅 Rytm tygodniowy</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{data.contentCalendar?.weeklyRhythm}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-3">🗓 Tematy miesięczne</h3>
                    {(data.contentCalendar?.monthlyThemes||[]).map((t,i) => (
                      <div key={i} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                        <p className="text-xs text-gray-300">{t}</p>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-3">🎯 Pomysły na kampanie</h3>
                    {(data.contentCalendar?.campaignIdeas||[]).map((c,i) => (
                      <div key={i} className="mb-3 pb-3 border-b border-white/5 last:border-0">
                        <p className="text-xs font-semibold text-white">{c.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{c.concept}</p>
                        <p className="text-[10px] text-indigo-400 mt-1">⏱ {c.timing}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ACTION PLAN */}
            {activeTab==='action' && (
              <div className="space-y-3">
                {(data.actionPlan||[]).map((phase,i) => (
                  <div key={i} className="card">
                    <h3 className="text-sm font-semibold text-white mb-3">{phase.week}</h3>
                    <div className="space-y-2">
                      {(phase.actions||[]).map((action,j) => (
                        <div key={j} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] text-indigo-400 shrink-0 mt-0.5">{j+1}</div>
                          <p className="text-sm text-gray-300">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-3">💰 Budżet i narzędzia</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] text-gray-600 mb-1">Organiczny</p><p className="text-xs text-gray-400">{data.budget?.organic}</p></div>
                    <div><p className="text-[10px] text-gray-600 mb-1">Płatny</p><p className="text-xs text-gray-400">{data.budget?.paid}</p></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/6">
                    <p className="text-[10px] text-gray-600 mb-2">Rekomendowane narzędzia</p>
                    <div className="flex flex-wrap gap-2">
                      {(data.budget?.tools||[]).map((t,i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                          style={{background:'rgba(255,255,255,0.05)',color:'#9ca3af',border:'1px solid rgba(255,255,255,0.08)'}}>
                          {t}
                        </span>
                      ))}
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
