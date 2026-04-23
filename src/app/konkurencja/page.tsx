'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import PlatformIcon from '@/components/PlatformIcon'
import { useStore } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────
interface SocialProfileInput { platform: string; url: string }
interface SocialProfile {
  platform: string; estimatedUrl: string; followers: string
  postsPerWeek: number; avgEngagement: string; contentFocus: string
  lastActive: string; strength: string; weakness: string
}
interface CompData {
  socialProfiles?: SocialProfile[]
  competitorProfile: { estimatedNiche: string; estimatedTone: string; estimatedStrengths: string[]; estimatedWeaknesses: string[]; contentMix: Record<string,number>; overallSocialScore?: number }
  gaps: { gap: string; description: string; opportunity: string }[]
  differentiators: { area: string; theyDo: string; weShouldDo: string }[]
  contentInsights: { insight: string; action: string }[]
  recommendations: { priority: string; title: string; description: string; timeframe: string }[]
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }
  summary: string
}
interface SavedCompetitor {
  id: string
  name: string
  url: string
  socialProfiles: SocialProfileInput[]
  data: CompData
  analyzedAt: string
  projectId: string
}

// ─── Constants ────────────────────────────────────────────────
const PRIORITY_STYLE: Record<string,string> = {
  wysoki: 'bg-red-500/15 text-red-300 border-red-500/25',
  sredni: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  niski: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
}
const SWOT_CONFIG = [
  { key: 'strengths',    label: 'Nasze mocne strony', color: 'text-emerald-400', bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.2)' },
  { key: 'weaknesses',   label: 'Nasze słabe strony', color: 'text-red-400',     bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.2)' },
  { key: 'opportunities',label: 'Szanse',             color: 'text-blue-400',    bg: 'rgba(59,130,246,0.06)',  border: 'rgba(59,130,246,0.2)' },
  { key: 'threats',      label: 'Zagrożenia',         color: 'text-orange-400',  bg: 'rgba(251,146,60,0.06)',  border: 'rgba(251,146,60,0.2)' },
]
const SOCIAL_PLATFORMS = [
  { id: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/...' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { id: 'linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/company/...' },
  { id: 'x',        label: 'X/Twitter', placeholder: 'https://x.com/...' },
  { id: 'tiktok',   label: 'TikTok',    placeholder: 'https://tiktok.com/@...' },
  { id: 'youtube',  label: 'YouTube',   placeholder: 'https://youtube.com/@...' },
]
const PLT_MAP: Record<string,string> = { facebook:'facebook',instagram:'instagram',linkedin:'linkedin',x:'x',tiktok:'tiktok',pinterest:'pinterest',youtube:'youtube' }

function Dots() { return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span> }

function loadSaved(projectId: string): SavedCompetitor[] {
  try { return JSON.parse(localStorage.getItem(`competitors_${projectId}`) || '[]') } catch { return [] }
}
function saveToDB(projectId: string, competitors: SavedCompetitor[]) {
  try { localStorage.setItem(`competitors_${projectId}`, JSON.stringify(competitors.slice(0,20))) } catch {}
}

// ─── Page ─────────────────────────────────────────────────────
export default function KonkurencjaPage() {
  const { dna, selectedPlatforms, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'

  // Form state
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [competitorName, setCompetitorName] = useState('')
  const [socialInputs, setSocialInputs] = useState<SocialProfileInput[]>([])
  const [showSocials, setShowSocials] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Results
  const [data, setData] = useState<CompData|null>(null)
  const [currentName, setCurrentName] = useState('')

  // Saved competitors
  const [saved, setSaved] = useState<SavedCompetitor[]>([])
  const [activeTab, setActiveTab] = useState<'new'|'saved'>('new')
  const [selectedSaved, setSelectedSaved] = useState<SavedCompetitor|null>(null)

  useEffect(() => {
    setSaved(loadSaved(projectId))
  }, [projectId])

  function setSocialUrl(platform: string, url: string) {
    setSocialInputs(prev => {
      const existing = prev.find(p => p.platform === platform)
      if (existing) return prev.map(p => p.platform === platform ? { ...p, url } : p)
      return url ? [...prev, { platform, url }] : prev
    })
  }

  async function analyze() {
    if (!competitorUrl && !competitorName) { setError('Podaj URL lub nazwę konkurenta'); return }
    setLoading(true); setError('')
    const name = competitorName || competitorUrl
    setCurrentName(name)
    try {
      const res = await fetch('/api/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorUrl,
          competitorName,
          socialProfiles: socialInputs.filter(s => s.url),
          ourDNA: dna,
          platforms: selectedPlatforms || []
        })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)

      // Auto-save
      const newEntry: SavedCompetitor = {
        id: Date.now().toString(),
        name,
        url: competitorUrl,
        socialProfiles: socialInputs.filter(s => s.url),
        data: j.data,
        analyzedAt: new Date().toISOString(),
        projectId,
      }
      const updated = [newEntry, ...saved.filter(s => s.name !== name)].slice(0, 20)
      setSaved(updated)
      saveToDB(projectId, updated)
    } catch(e: unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function loadSavedEntry(entry: SavedCompetitor) {
    setData(entry.data)
    setCurrentName(entry.name)
    setCompetitorName(entry.name)
    setCompetitorUrl(entry.url)
    setSocialInputs(entry.socialProfiles || [])
    setSelectedSaved(entry)
    setActiveTab('new')
  }

  function deleteEntry(id: string) {
    const updated = saved.filter(s => s.id !== id)
    setSaved(updated)
    saveToDB(projectId, updated)
    if (selectedSaved?.id === id) setSelectedSaved(null)
  }

  const displayData = data
  const mix = displayData?.competitorProfile?.contentMix || {}
  const mixTotal = Object.values(mix).reduce((a,b) => a+b, 0) || 100

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">🔍 Analiza konkurencji</h1>
            <p className="text-gray-500 text-sm mt-1">Zbadaj strategię konkurenta i znajdź luki które możesz wykorzystać</p>
          </div>
          {saved.length > 0 && (
            <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
              {[{id:'new',label:'Nowa analiza'},{id:'saved',label:`Zapisani (${saved.length})`}].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as 'new'|'saved')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{background:activeTab===t.id?'rgba(99,102,241,0.25)':'transparent',color:activeTab===t.id?'#a5b4fc':'#6b7280'}}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── SAVED COMPETITORS TAB ── */}
        {activeTab === 'saved' && (
          <div className="space-y-3">
            {saved.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-600">Brak zapisanych analiz</p>
              </div>
            ) : saved.map(entry => (
              <div key={entry.id} className="card flex items-center gap-4 cursor-pointer hover:border-indigo-500/30 transition-all"
                onClick={() => loadSavedEntry(entry)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.25)'}}>
                  🔍
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{entry.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {entry.url && <p className="text-xs text-gray-600 truncate">{entry.url}</p>}
                    {entry.socialProfiles?.length > 0 && (
                      <div className="flex gap-1">
                        {entry.socialProfiles.map(sp => (
                          <PlatformIcon key={sp.platform} platform={sp.platform} size={14}/>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-600">
                    {new Date(entry.analyzedAt).toLocaleDateString('pl', {day:'numeric',month:'short',year:'numeric'})}
                  </p>
                  {entry.data.competitorProfile?.overallSocialScore && (
                    <p className="text-xs font-semibold mt-0.5" style={{
                      color: entry.data.competitorProfile.overallSocialScore >= 70 ? '#34d399' : entry.data.competitorProfile.overallSocialScore >= 45 ? '#fbbf24' : '#f87171'
                    }}>
                      Score: {entry.data.competitorProfile.overallSocialScore}/100
                    </p>
                  )}
                </div>
                <button onClick={e => { e.stopPropagation(); deleteEntry(entry.id) }}
                  className="text-gray-700 hover:text-red-400 transition-colors text-sm px-2 shrink-0">🗑</button>
              </div>
            ))}
          </div>
        )}

        {/* ── NEW ANALYSIS TAB ── */}
        {activeTab === 'new' && (
          <>
            <div className="card mb-6 space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nazwa konkurenta</label>
                  <input className="input" placeholder="np. Agencja XYZ, Brand ABC..."
                    value={competitorName} onChange={e => setCompetitorName(e.target.value)} />
                </div>
                <div>
                  <label className="label">URL strony (opcjonalnie)</label>
                  <input className="input" type="url" placeholder="https://konkurent.pl"
                    value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)} />
                </div>
              </div>

              {/* Social profiles toggle */}
              <div>
                <button onClick={() => setShowSocials(v => !v)}
                  className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  <span className="w-4 h-4 rounded border border-indigo-500/40 flex items-center justify-center"
                    style={{background: showSocials ? 'rgba(99,102,241,0.3)' : 'transparent'}}>
                    {showSocials ? '✓' : ''}
                  </span>
                  Dodaj profile social media konkurenta (opcjonalnie — zwiększa dokładność analizy)
                </button>

                {showSocials && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {SOCIAL_PLATFORMS.map(plt => {
                      const current = socialInputs.find(s => s.platform === plt.id)?.url || ''
                      return (
                        <div key={plt.id} className="flex items-center gap-2">
                          <PlatformIcon platform={plt.id} size={22}/>
                          <input
                            className="input flex-1 text-xs py-2"
                            placeholder={plt.placeholder}
                            value={current}
                            onChange={e => setSocialUrl(plt.id, e.target.value)}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {dna && (
                <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2">
                  <span>✦</span> Analiza uwzględni Twoje Brand DNA: <strong>{dna?.brandName || dna?.industry}</strong>
                </div>
              )}
              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
              <button className="btn-primary flex items-center gap-2 px-6 py-3" onClick={analyze} disabled={loading}>
                {loading ? <><Dots /> Analizuję konkurenta...</> : '🔍 Analizuj konkurenta'}
              </button>
            </div>

            {/* Results */}
            {displayData && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">{currentName}</h2>
                    {selectedSaved && (
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.25)'}}>
                        Załadowano z historii
                      </span>
                    )}
                  </div>
                  <button onClick={() => { setData(null); setSelectedSaved(null) }} className="btn-ghost text-sm">
                    ← Nowa analiza
                  </button>
                </div>

                {/* Summary */}
                <div className="rounded-2xl p-5 border border-indigo-500/20"
                  style={{background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.05))'}}>
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">Podsumowanie strategiczne</p>
                  <p className="text-gray-200 text-sm leading-relaxed">{displayData.summary}</p>
                </div>

                {/* Profile + Mix */}
                <div className="grid grid-cols-3 gap-5">
                  <div className="card col-span-2">
                    <h2 className="text-sm font-semibold text-white mb-4">Profil konkurenta</h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1">Szacowana nisza</p>
                        <p className="text-sm text-gray-200">{displayData.competitorProfile?.estimatedNiche}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1">Ton komunikacji</p>
                        <p className="text-sm text-gray-200">{displayData.competitorProfile?.estimatedTone}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-gray-600 mb-2">Mocne strony</p>
                        <ul className="space-y-1">
                          {(displayData.competitorProfile?.estimatedStrengths||[]).map((s,i) => (
                            <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                              <span className="text-emerald-400 shrink-0">+</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-2">Słabe strony</p>
                        <ul className="space-y-1">
                          {(displayData.competitorProfile?.estimatedWeaknesses||[]).map((w,i) => (
                            <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                              <span className="text-red-400 shrink-0">−</span>{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <h2 className="text-sm font-semibold text-white mb-4">Mix treści</h2>
                    <div className="space-y-3">
                      {Object.entries(mix).map(([type, val]) => (
                        <div key={type}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400 capitalize">{type}</span>
                            <span className="text-gray-500">{val}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                            <div className="h-full rounded-full bg-indigo-500" style={{width:`${(val/mixTotal)*100}%`}} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Social Profiles */}
                {displayData.socialProfiles && displayData.socialProfiles.length > 0 && (
                  <div className="card">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-sm font-semibold text-white">Profile social media konkurenta</h3>
                      <span className="text-xs text-gray-600">⚠️ Dane szacunkowe — zweryfikuj ręcznie</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {displayData.socialProfiles.map((profile, i) => {
                        const activityColor = profile.lastActive === 'aktywny' ? '#34d399' : profile.lastActive === 'sporadyczny' ? '#fbbf24' : '#6b7280'
                        const plt = PLT_MAP[profile.platform?.toLowerCase()]
                        const realUrl = socialInputs.find(s => s.platform === profile.platform?.toLowerCase())?.url
                        return (
                          <div key={i} className="rounded-2xl p-4 space-y-3"
                            style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {plt && <PlatformIcon platform={plt} size={24}/>}
                                <span className="text-sm font-semibold text-white capitalize">{profile.platform}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {realUrl && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                                    style={{background:'rgba(52,211,153,0.15)',color:'#34d399',border:'1px solid rgba(52,211,153,0.25)'}}>
                                    ✓ zweryfikowany
                                  </span>
                                )}
                                <div className="w-1.5 h-1.5 rounded-full" style={{background:activityColor}}/>
                                <span className="text-[10px]" style={{color:activityColor}}>{profile.lastActive}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                {label:'Obserwujący', value: profile.followers},
                                {label:'Posty/tydz.', value: String(profile.postsPerWeek)},
                                {label:'Eng. rate', value: profile.avgEngagement},
                              ].map(stat => (
                                <div key={stat.label} className="text-center p-2 rounded-xl"
                                  style={{background:'rgba(255,255,255,0.04)'}}>
                                  <p className="text-sm font-bold text-white">{stat.value}</p>
                                  <p className="text-[9px] text-gray-600 mt-0.5">{stat.label}</p>
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-600 mb-1">Główny content</p>
                              <p className="text-xs text-gray-400 leading-relaxed">{profile.contentFocus}</p>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-1.5">
                                <span className="text-emerald-400 text-xs shrink-0 mt-0.5">✓</span>
                                <p className="text-[11px] text-gray-400">{profile.strength}</p>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <span className="text-red-400 text-xs shrink-0 mt-0.5">✗</span>
                                <p className="text-[11px] text-gray-400">{profile.weakness}</p>
                              </div>
                            </div>
                            <a href={realUrl || profile.estimatedUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] transition-colors"
                              style={{color: realUrl ? '#34d399' : '#818cf8'}}>
                              <span>↗</span>
                              <span className="truncate">{(realUrl || profile.estimatedUrl).replace('https://','')}</span>
                              {!realUrl && <span className="text-gray-700">(szacunkowy)</span>}
                            </a>
                          </div>
                        )
                      })}
                    </div>
                    {displayData.competitorProfile.overallSocialScore && (
                      <div className="mt-4 pt-4 border-t border-white/6 flex items-center gap-4">
                        <p className="text-xs text-gray-500">Ogólna ocena social media:</p>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                            <div className="h-full rounded-full transition-all"
                              style={{width:`${displayData.competitorProfile.overallSocialScore}%`,background:displayData.competitorProfile.overallSocialScore>=70?'#34d399':displayData.competitorProfile.overallSocialScore>=45?'#fbbf24':'#f87171'}}/>
                          </div>
                          <span className="text-sm font-bold text-white">{displayData.competitorProfile.overallSocialScore}/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Gaps */}
                <div className="card">
                  <h2 className="text-sm font-semibold text-white mb-4">🎯 Luki w strategii konkurenta</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {(displayData.gaps||[]).map((g,i) => (
                      <div key={i} className="p-3 rounded-xl space-y-2"
                        style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                        <p className="text-sm font-semibold text-white">{g.gap}</p>
                        <p className="text-xs text-gray-500">{g.description}</p>
                        <div className="pt-1.5 border-t border-white/5">
                          <p className="text-[10px] text-indigo-400 mb-0.5">Twoja szansa:</p>
                          <p className="text-xs text-indigo-300">{g.opportunity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Differentiators */}
                <div className="card">
                  <h2 className="text-sm font-semibold text-white mb-4">⚡ Wyróżniki — Ty vs Konkurent</h2>
                  <div className="space-y-3">
                    {(displayData.differentiators||[]).map((d,i) => (
                      <div key={i} className="grid grid-cols-3 gap-3 p-3 rounded-xl"
                        style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                        <div>
                          <p className="text-[10px] text-gray-600 mb-1">Obszar</p>
                          <p className="text-xs font-semibold text-white">{d.area}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-600 mb-1">Konkurent robi</p>
                          <p className="text-xs text-gray-500">{d.theyDo}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-600 mb-1">Ty powinieneś</p>
                          <p className="text-xs text-indigo-300">{d.weShouldDo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SWOT */}
                <div className="grid grid-cols-2 gap-3">
                  {SWOT_CONFIG.map(({key, label, color, bg, border}) => (
                    <div key={key} className="rounded-2xl p-4" style={{background:bg,border:`1px solid ${border}`}}>
                      <p className={`text-xs font-semibold ${color} uppercase tracking-wide mb-3`}>{label}</p>
                      <ul className="space-y-1.5">
                        {((displayData.swot as Record<string,string[]>)[key]||[]).map((item,i) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                            <span className={`${color} shrink-0 mt-0.5`}>·</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                <div className="card">
                  <h2 className="text-sm font-semibold text-white mb-4">📋 Rekomendacje</h2>
                  <div className="space-y-3">
                    {(displayData.recommendations||[]).map((r,i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                        style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border shrink-0 mt-0.5 ${PRIORITY_STYLE[r.priority]||PRIORITY_STYLE.niski}`}>
                          {r.priority}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{r.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">{r.timeframe}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
