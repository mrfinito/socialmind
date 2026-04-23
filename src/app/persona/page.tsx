'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import HistoryDrawer from '@/components/HistoryDrawer'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'
import { useStore } from '@/lib/store'

interface Persona {
  id:string; name:string; age:number; gender:string; location:string; occupation:string
  income:string; education:string; familyStatus:string; photo:string; quote:string
  personality:{traits:string[];values:string[];lifestyle:string}
  goals:{primary:string;secondary:string[];dreamOutcome:string}
  painPoints:{primary:string;daily:string[];fears:string[]}
  digitalBehavior:{platforms:string[];timeOnline:string;contentType:string;influencers:string;buyingBehavior:string}
  relationshipWithBrand:{awareness:string;trigger:string;objections:string[];loyaltyDrivers:string[]}
  communicationStyle:{language:string;triggers:string[];avoids:string[];bestHook:string}
  contentIdeas:{topic:string;format:string;reason:string}[]
}

interface PersonaData {
  personas:Persona[]
  audienceInsights:{commonTraits:string[];segmentStrategy:string;priorityPersona:string;priorityReason:string;messagingFramework:string}
  contentStrategy:{tone:string;formats:string[];topics:string[];avoid:string[]}
}

const AVATAR_COLORS = ['#6366f1','#a855f7','#ec4899','#f59e0b','#10b981']
const PLATFORM_LABELS:Record<string,string> = {facebook:'FB',instagram:'IG',linkedin:'LI',tiktok:'TT',x:'X',youtube:'YT',pinterest:'PIN'}

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

function Avatar({name,color,size=56}:{name:string;color:string;size?:number}) {
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{width:size,height:size,background:`linear-gradient(135deg,${color},${color}99)`,fontSize:size*0.3,boxShadow:`0 4px 14px ${color}40`}}>
      {initials}
    </div>
  )
}

export default function PersonaPage() {
  const { dna } = useStore()
  const [product, setProduct] = useState(dna?.usp || '')
  const [targetDesc, setTargetDesc] = useState(dna?.persona || '')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryEntry<PersonaData>[]>([])
  const projectId = dna?.brandName || 'default'
  useEffect(() => { setHistory(historyLoad<PersonaData>('persona', projectId)) }, [projectId])
  const [data, setData] = useState<PersonaData|null>(null)
  const [error, setError] = useState('')
  const [activePersona, setActivePersona] = useState(0)
  const [activeSection, setActiveSection] = useState<'profile'|'digital'|'communication'|'content'>('profile')
  const [copied, setCopied] = useState<string|null>(null)

  async function generate() {
    if (!product.trim() && !targetDesc.trim()) { setError('Opisz produkt lub grupę docelową'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/persona', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ industry: dna?.industry, product, targetDesc, masterPrompt: dna?.masterPrompt, brandName: dna?.brandName })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      setActivePersona(0)
      const entry = historySave<PersonaData>('persona', projectId, {
        title: product.slice(0, 50) || targetDesc.slice(0, 50) || 'Persona',
        subtitle: `${j.data?.personas?.length || 3} persony`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function copyHook(hook: string) {
    navigator.clipboard.writeText(hook)
    setCopied(hook); setTimeout(()=>setCopied(null),1500)
  }

  function exportPersonas() {
    if (!data) return
    let txt = `PERSONY KLIENTÓW\n${'═'.repeat(50)}\n\n`
    data.personas.forEach((p,i) => {
      txt += `PERSONA ${i+1}: ${p.name}\n${p.age} lat · ${p.occupation} · ${p.location}\n`
      txt += `"${p.quote}"\n\n`
      txt += `CELE: ${p.goals.primary}\nWYMARZONE ŻYCIE: ${p.goals.dreamOutcome}\n\n`
      txt += `GŁÓWNY BÓL: ${p.painPoints.primary}\nOBAWY: ${p.painPoints.fears.join(', ')}\n\n`
      txt += `PLATFORMY: ${p.digitalBehavior.platforms.join(', ')}\n`
      txt += `ONLINE: ${p.digitalBehavior.timeOnline}\n\n`
      txt += `NAJLEPSZY HOOK: "${p.communicationStyle.bestHook}"\n`
      txt += `TRIGERY: ${p.communicationStyle.triggers.join(', ')}\n\n`
      txt += `${'─'.repeat(40)}\n\n`
    })
    txt += `STRATEGIA KOMUNIKACJI\nTon: ${data.contentStrategy.tone}\n`
    txt += `Formaty: ${data.contentStrategy.formats.join(', ')}\n`
    txt += `Tematy: ${data.contentStrategy.topics.join(', ')}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}))
    a.download = `persony_${dna?.brandName||'marka'}.txt`
    a.click()
  }

  const persona = data?.personas[activePersona]
  const isPriority = data?.audienceInsights.priorityPersona === persona?.id

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">👤 Persona Builder</h1>
          <p className="text-gray-500 text-sm mt-1">Głęboka analiza grupy docelowej — 3 szczegółowe persony z psychologią, zachowaniami i strategią komunikacji</p>
          <div className="mt-3">
            <HistoryDrawer<PersonaData>
              module="persona" projectId={projectId} entries={history}
              icon="👤"
              onLoad={e => { setData(e.data); setActivePersona(0) }}
              onDelete={id => setHistory(prev => prev.filter(e => e.id !== id))}
              formatTitle={e => e.title}
              formatSubtitle={e => e.subtitle || ''}
            />
          </div>
        </div>

        {!data && (
          <div className="card space-y-5">
            <div>
              <label className="label">Produkt / usługa</label>
              <textarea className="input resize-none" style={{minHeight:80}}
                placeholder="Co oferujesz? np. 'Przedszkole montessori w Warszawie dla dzieci 2.5-6 lat. Stawiamy na samodzielność, kreatywność i indywidualne podejście.'"
                value={product} onChange={e=>setProduct(e.target.value)} />
            </div>
            <div>
              <label className="label">Opis grupy docelowej (opcjonalnie)</label>
              <textarea className="input resize-none" style={{minHeight:70}}
                placeholder="np. 'Świadome mamy i tatusiowie w wieku 28-40 lat, wyższe wykształcenie, średnie-wyższe dochody, zależy im na jakości edukacji'"
                value={targetDesc} onChange={e=>setTargetDesc(e.target.value)} />
            </div>
            {dna && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)'}}>
                <span className="text-indigo-400">✦</span>
                <span className="text-indigo-300">Persony będą dopasowane do Brand DNA: <strong>{dna.brandName}</strong> · {dna.industry}</span>
              </div>
            )}
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            <button className="btn-primary flex items-center gap-2 px-8 py-3" onClick={generate} disabled={loading}>
              {loading ? <><Dots /> Buduję persony...</> : '👤 Generuj 3 persony'}
            </button>
          </div>
        )}

        {data && persona && (
          <div className="space-y-5">
            {/* Persona selector */}
            <div className="flex items-center gap-3">
              {data.personas.map((p,i)=>{
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
                const isActive = activePersona===i
                const isPrio = data.audienceInsights.priorityPersona===p.id
                return (
                  <button key={i} onClick={()=>{setActivePersona(i);setActiveSection('profile')}}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all flex-1"
                    style={{background:isActive?`${color}15`:'rgba(255,255,255,0.03)',borderColor:isActive?`${color}50`:'rgba(255,255,255,0.08)'}}>
                    <Avatar name={p.name} color={color} size={40}/>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-semibold truncate ${isActive?'text-white':'text-gray-400'}`}>{p.name}</p>
                        {isPrio && <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{background:'rgba(251,191,36,0.2)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.3)'}}>⭐ główna</span>}
                      </div>
                      <p className="text-xs text-gray-600">{p.age} lat · {p.occupation.split(' ')[0]}</p>
                    </div>
                  </button>
                )
              })}
              <button onClick={exportPersonas} className="btn-secondary text-sm shrink-0">⬇ Eksport</button>
            </div>

            {/* Quote */}
            <div className="rounded-2xl p-5" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="flex items-start gap-4">
                <Avatar name={persona.name} color={AVATAR_COLORS[activePersona % AVATAR_COLORS.length]} size={56}/>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-bold text-white">{persona.name}</h2>
                    {isPriority && <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{background:'rgba(251,191,36,0.15)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.25)'}}>⭐ Priorytetowa persona</span>}
                  </div>
                  <p className="text-gray-400 text-sm">{persona.age} lat · {persona.gender} · {persona.occupation} · {persona.location}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{persona.income} · {persona.education} · {persona.familyStatus}</p>
                  <blockquote className="mt-3 text-indigo-200 italic text-sm border-l-2 border-indigo-500 pl-3">&ldquo;{persona.quote}&rdquo;</blockquote>
                </div>
              </div>
            </div>

            {/* Section tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              {[
                {id:'profile',label:'👤 Profil'},
                {id:'digital',label:'📱 Digital'},
                {id:'communication',label:'💬 Komunikacja'},
                {id:'content',label:'✦ Content'},
              ].map(s=>(
                <button key={s.id} onClick={()=>setActiveSection(s.id as typeof activeSection)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{background:activeSection===s.id?'rgba(99,102,241,0.25)':'transparent',color:activeSection===s.id?'#a5b4fc':'#6b7280'}}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* PROFILE */}
            {activeSection==='profile' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="card">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Osobowość</h3>
                  <div className="space-y-2">
                    {persona.personality.traits.map((t,i)=>(
                      <span key={i} className="inline-block text-xs px-2.5 py-1 rounded-full mr-1.5 mb-1" style={{background:'rgba(99,102,241,0.12)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>{t}</span>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-gray-600 mb-1.5">Wartości</p>
                    {persona.personality.values.map((v,i)=>(
                      <p key={i} className="text-xs text-gray-400 flex items-start gap-1.5 mb-1"><span className="text-indigo-400">·</span>{v}</p>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-gray-600 mb-1">Styl życia</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{persona.personality.lifestyle}</p>
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">Cele i marzenia</h3>
                  <div className="mb-3">
                    <p className="text-[10px] text-gray-600 mb-1">Główny cel</p>
                    <p className="text-sm font-medium text-white">{persona.goals.primary}</p>
                  </div>
                  <div className="mb-3">
                    <p className="text-[10px] text-gray-600 mb-1.5">Pozostałe cele</p>
                    {persona.goals.secondary.map((g,i)=>(
                      <p key={i} className="text-xs text-gray-400 flex items-start gap-1.5 mb-1"><span className="text-emerald-400">→</span>{g}</p>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-[10px] text-gray-600 mb-1">Wymarzone życie za 5 lat</p>
                    <p className="text-xs text-emerald-300 italic leading-relaxed">{persona.goals.dreamOutcome}</p>
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3">Bóle i obawy</h3>
                  <div className="mb-3 p-3 rounded-xl" style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)'}}>
                    <p className="text-[10px] text-red-400 mb-1">Największy ból</p>
                    <p className="text-sm font-medium text-white">{persona.painPoints.primary}</p>
                  </div>
                  <div className="mb-3">
                    <p className="text-[10px] text-gray-600 mb-1.5">Codzienne wyzwania</p>
                    {persona.painPoints.daily.map((d,i)=>(
                      <p key={i} className="text-xs text-gray-400 flex items-start gap-1.5 mb-1"><span className="text-red-400">−</span>{d}</p>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-[10px] text-gray-600 mb-1.5">Obawy</p>
                    {persona.painPoints.fears.map((f,i)=>(
                      <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5 mb-1"><span className="text-orange-400">⚠</span>{f}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DIGITAL */}
            {activeSection==='digital' && (
              <div className="grid grid-cols-2 gap-5">
                <div className="card space-y-4">
                  <h3 className="text-sm font-semibold text-white">Zachowanie online</h3>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-2">Aktywne platformy</p>
                    <div className="flex gap-2 flex-wrap">
                      {persona.digitalBehavior.platforms.map(p=>(
                        <span key={p} className="text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.25)'}}>
                          {PLATFORM_LABELS[p.toLowerCase()] || p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div><p className="text-[10px] text-gray-600 mb-1">Czas online</p><p className="text-sm text-gray-300">{persona.digitalBehavior.timeOnline}</p></div>
                  <div><p className="text-[10px] text-gray-600 mb-1">Konsumowany content</p><p className="text-sm text-gray-300 leading-relaxed">{persona.digitalBehavior.contentType}</p></div>
                  <div><p className="text-[10px] text-gray-600 mb-1">Obserwuje / ufa</p><p className="text-sm text-gray-300 leading-relaxed">{persona.digitalBehavior.influencers}</p></div>
                  <div><p className="text-[10px] text-gray-600 mb-1">Zachowania zakupowe online</p><p className="text-sm text-gray-300 leading-relaxed">{persona.digitalBehavior.buyingBehavior}</p></div>
                </div>
                <div className="card space-y-4">
                  <h3 className="text-sm font-semibold text-white">Relacja z marką</h3>
                  <div><p className="text-[10px] text-gray-600 mb-1">Jak dowiedziała się o marce</p><p className="text-sm text-gray-300">{persona.relationshipWithBrand.awareness}</p></div>
                  <div><p className="text-[10px] text-gray-600 mb-1">Co skłoniło do kontaktu</p><p className="text-sm text-gray-300">{persona.relationshipWithBrand.trigger}</p></div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1.5">Obiekcje</p>
                    {persona.relationshipWithBrand.objections.map((o,i)=>(
                      <div key={i} className="text-xs text-amber-300 flex items-start gap-1.5 mb-1.5 p-2 rounded-lg" style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)'}}>
                        <span>⚡</span>{o}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1.5">Co zatrzymuje jako klienta</p>
                    {persona.relationshipWithBrand.loyaltyDrivers.map((l,i)=>(
                      <p key={i} className="text-xs text-emerald-400 flex items-start gap-1.5 mb-1"><span>✓</span>{l}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* COMMUNICATION */}
            {activeSection==='communication' && (
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-4">Styl komunikacji</h3>
                    <div><p className="text-[10px] text-gray-600 mb-1">Język</p><p className="text-sm text-gray-300">{persona.communicationStyle.language}</p></div>
                    <div className="mt-3">
                      <p className="text-[10px] text-gray-600 mb-1.5">Czego unika w komunikacji marek</p>
                      {persona.communicationStyle.avoids.map((a,i)=>(
                        <p key={i} className="text-xs text-red-400 flex items-start gap-1.5 mb-1"><span>✕</span>{a}</p>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Słowa-klucze / Triggery</h3>
                    <div className="flex flex-wrap gap-2">
                      {persona.communicationStyle.triggers.map((t,i)=>(
                        <span key={i} className="text-xs px-3 py-1.5 rounded-full" style={{background:'rgba(16,185,129,0.12)',color:'#6ee7b7',border:'1px solid rgba(16,185,129,0.25)'}}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-4">Najlepszy hook dla tej persony</h3>
                  <div className="p-5 rounded-2xl mb-4" style={{background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.08))',border:'1px solid rgba(99,102,241,0.25)'}}>
                    <p className="text-xs text-indigo-400 mb-2">Hook który ją zatrzyma na scrollowaniu:</p>
                    <p className="text-lg font-semibold text-white leading-relaxed">&ldquo;{persona.communicationStyle.bestHook}&rdquo;</p>
                  </div>
                  <button onClick={()=>copyHook(persona.communicationStyle.bestHook)}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {copied===persona.communicationStyle.bestHook ? '✓ Skopiowano' : '📋 Kopiuj hook'}
                  </button>
                  <div className="mt-4 pt-4 border-t border-white/6">
                    <p className="text-[10px] text-gray-600 mb-2">Dlaczego ten hook działa?</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Adresuje główny ból (&ldquo;{persona.painPoints.primary.slice(0,50)}...&rdquo;) w języku który persona rozumie i któremu ufa.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CONTENT IDEAS */}
            {activeSection==='content' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {persona.contentIdeas.map((idea,i)=>(
                    <div key={i} className="card hover:border-indigo-500/30 transition-all cursor-default">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs px-2 py-1 rounded-full" style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.25)'}}>{idea.format}</span>
                      </div>
                      <p className="text-sm font-semibold text-white mb-2">{idea.topic}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{idea.reason}</p>
                    </div>
                  ))}
                </div>

                {/* Audience insights */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-4">Strategia contentu dla całej grupy</h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <p className="text-[10px] text-gray-600 mb-2">Rekomendowany ton</p>
                      <p className="text-sm text-indigo-300 font-medium">{data.contentStrategy.tone}</p>
                      <div className="mt-3">
                        <p className="text-[10px] text-gray-600 mb-1.5">Najlepsze formaty</p>
                        <div className="flex flex-wrap gap-1.5">
                          {data.contentStrategy.formats.map(f=>(
                            <span key={f} className="tag tag-active text-xs">{f}</span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-[10px] text-gray-600 mb-1.5">Czego unikać</p>
                        {data.contentStrategy.avoid.map((a,i)=>(
                          <p key={i} className="text-xs text-red-400 flex gap-1.5 mb-1"><span>✕</span>{a}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 mb-2">Tematy które rezonują</p>
                      {data.contentStrategy.topics.map((t,i)=>(
                        <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/4 last:border-0">
                          <span className="text-indigo-400 text-xs">→</span>
                          <p className="text-xs text-gray-300">{t}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Messaging framework */}
                <div className="rounded-2xl p-5" style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)'}}>
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">Framework komunikacji</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{data.audienceInsights.messagingFramework}</p>
                </div>
              </div>
            )}

            {/* Priority info */}
            {isPriority && (
              <div className="rounded-2xl p-4 flex items-start gap-3" style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)'}}>
                <span className="text-xl shrink-0">⭐</span>
                <div>
                  <p className="text-sm font-semibold text-amber-300">To jest Twoja priorytetowa persona</p>
                  <p className="text-xs text-gray-400 mt-0.5">{data.audienceInsights.priorityReason}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
