'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'

interface PerformanceBrief {
  executiveSummary?: {
    objective?: string
    totalBudget?: string
    duration?: string
    topKPI?: string
    expectedResults?: string
    summary?: string
  }
  objectives?: {
    primary?: { metric?: string; target?: string; rationale?: string }
    secondary?: Array<{ metric?: string; target?: string; rationale?: string }>
    vanityMetrics?: string[]
    northStarMetric?: string
  }
  audiences?: Array<{
    platform?: string
    type?: string
    name?: string
    demographics?: string
    interests?: string[]
    behaviors?: string[]
    size?: string
    priority?: string
    budgetShare?: string
  }>
  funnel?: {
    tofu?: FunnelStage
    mofu?: FunnelStage
    bofu?: FunnelStage
  }
  budgetSplit?: {
    byPlatform?: Array<{ platform?: string; amount?: string; percent?: number; rationale?: string }>
    byFunnelStage?: Array<{ stage?: string; amount?: string; percent?: number }>
    byWeek?: Array<{ week?: number; amount?: string; focus?: string }>
    reserveBudget?: string
  }
  creativeStrategy?: {
    totalAdsNeeded?: number
    perPlatform?: Array<{ platform?: string; tofu?: string[]; mofu?: string[]; bofu?: string[] }>
    creativePillars?: string[]
    abTestPlan?: Array<{
      testName?: string
      hypothesis?: string
      duration?: string
      successCriteria?: string
      winnerScaleStrategy?: string
    }>
  }
  landingPageRequirements?: {
    criticalElements?: string[]
    conversionRateTarget?: string
    trackingChecklist?: string[]
    redFlags?: string[]
  }
  tracking?: {
    pixels?: string[]
    events?: Array<{ name?: string; trigger?: string }>
    utmConvention?: string
    attribution?: string
    serverSide?: string
    reporting?: string
  }
  optimizationPlan?: {
    week1?: WeekPlan
    week2?: WeekPlan
    week3to4?: WeekPlan
    ongoing?: { weekly?: string[]; monthly?: string[] }
  }
  reporting?: {
    frequency?: string
    stakeholders?: string[]
    kpisToTrack?: string[]
    dashboardTools?: string
    alertsToSet?: string[]
  }
  risks?: Array<{ risk?: string; impact?: string; mitigation?: string }>
  successCriteria?: {
    minimumViableSuccess?: string
    targetSuccess?: string
    stretchGoal?: string
  }
}

interface FunnelStage {
  label?: string
  objective?: string
  audiences?: string[]
  creativeType?: string
  kpi?: string
  budgetShare?: string
  duration?: string
}

interface WeekPlan {
  focus?: string
  actions?: string[]
  redFlags?: string[]
}

const OBJECTIVES = [
  { id: 'lead-gen', label: '🎯 Lead Generation', desc: 'Formularze, MQL, B2B contacts' },
  { id: 'ecommerce', label: '🛒 E-commerce', desc: 'Sprzedaż, ROAS, transakcje' },
  { id: 'awareness', label: '📢 Brand Awareness', desc: 'Zasięg, video views, engagement' },
  { id: 'app-installs', label: '📱 App Installs', desc: 'Instalacje, rejestracje' },
  { id: 'traffic', label: '🌐 Traffic', desc: 'Kliki, time on site, scroll depth' },
] as const

const PLATFORMS = [
  { id: 'meta', label: 'Meta Ads', icon: '📘', desc: 'Facebook + Instagram' },
  { id: 'google', label: 'Google Ads', icon: '🔍', desc: 'Search + Display + YouTube' },
  { id: 'tiktok', label: 'TikTok Ads', icon: '🎵', desc: 'Video + Spark Ads' },
  { id: 'linkedin', label: 'LinkedIn Ads', icon: '💼', desc: 'B2B, professionals' },
] as const

export default function PerformancePage() {
  const { dna, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'

  const [objective, setObjective] = useState<string>('lead-gen')
  const [platforms, setPlatforms] = useState<string[]>(['meta'])
  const [budgetTotal, setBudgetTotal] = useState(20000)
  const [budgetCurrency] = useState('PLN')
  const [duration, setDuration] = useState(4)
  const [targetKPI, setTargetKPI] = useState('')
  const [productService, setProductService] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [geoTargeting, setGeoTargeting] = useState('Polska')
  const [landingPageUrl, setLandingPageUrl] = useState('')
  const [competitors, setCompetitors] = useState('')
  const [existingAssets, setExistingAssets] = useState('')
  const [constraints, setConstraints] = useState('')

  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState<PerformanceBrief | null>(null)
  const [resultReady, setResultReady] = useState(false)
  const resultRef = useRef<PerformanceBrief | null>(null)
  const [history, setHistory] = useState<HistoryEntry<PerformanceBrief>[]>([])

  useEffect(() => {
    setHistory(historyLoad<PerformanceBrief>('performance', projectId))
  }, [projectId])

  function togglePlatform(id: string) {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  async function generate() {
    if (!productService.trim() || !targetAudience.trim() || platforms.length === 0) {
      setError('Wypełnij produkt/usługę, grupę docelową i wybierz min. 1 platformę')
      return
    }
    setLoading(true)
    setError('')
    setStreamText('')
    setData(null)
    setResultReady(false)
    resultRef.current = null

    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective, platforms, budgetTotal, budgetCurrency, duration, targetKPI,
          productService, targetAudience, geoTargeting, landingPageUrl, competitors,
          existingAssets, constraints, dna,
        }),
      })

      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Błąd serwera')
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
          let parsed: { chunk?: string; done?: boolean; data?: PerformanceBrief; error?: string } | null = null
          try { parsed = JSON.parse(jsonStr) } catch { continue }
          if (!parsed) continue
          if (parsed.chunk) setStreamText(prev => (prev + parsed!.chunk).slice(-300))
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.done && parsed.data) {
            resultRef.current = parsed.data
            setStreamText('')
            setResultReady(true)
            try {
              const entry = historySave<PerformanceBrief>('performance', projectId, {
                title: `${productService.slice(0, 50)} · ${budgetTotal} ${budgetCurrency}`,
                subtitle: `${platforms.join(' + ')} · ${duration} tyg. · ${objective}`,
                data: parsed.data,
              })
              setHistory(prev => [entry, ...prev].slice(0, 20))
            } catch {}
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setLoading(false)
      setStreamText('')
    }
  }

  function showResult() {
    if (resultRef.current) {
      setData(resultRef.current)
      setResultReady(false)
    }
  }

  function reset() {
    setData(null)
    setError('')
    setProductService('')
    setTargetAudience('')
    setLandingPageUrl('')
    setCompetitors('')
    setExistingAssets('')
    setConstraints('')
    setTargetKPI('')
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">⚡ Generator briefu performance</h1>
            <p className="text-gray-500 text-sm mt-1">
              Kompletny brief kampanii performance — cele, audiences, budżet, lejek, optymalizacja.
            </p>
          </div>
          {data && <button onClick={reset} className="btn-ghost text-sm">+ Nowy brief</button>}
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              📚 Ostatnie briefy ({history.length})
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {history.slice(0, 6).map(h => (
                <button key={h.id}
                  onClick={() => { setData(h.data); resultRef.current = h.data }}
                  className="text-left p-3 rounded-xl transition-all hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-semibold text-white mb-1 line-clamp-2">{h.title}</p>
                  {h.subtitle && <p className="text-[11px] text-indigo-400 mb-1">{h.subtitle}</p>}
                  <p className="text-[10px] text-gray-600">
                    {new Date(h.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-5">
            {/* Objective */}
            <div className="card">
              <label className="label">🎯 Cel kampanii *</label>
              <div className="grid grid-cols-3 gap-2">
                {OBJECTIVES.map(o => {
                  const isActive = objective === o.id
                  return (
                    <button key={o.id} type="button" onClick={() => setObjective(o.id)}
                      className="text-left p-3 rounded-lg transition-all"
                      style={{
                        background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      }}>
                      <p className="text-sm font-medium" style={{ color: isActive ? '#a5b4fc' : '#e5e7eb' }}>{o.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{o.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Platforms */}
            <div className="card">
              <label className="label">📡 Platformy * <span className="text-gray-500">(min. 1)</span></label>
              <div className="grid grid-cols-4 gap-2">
                {PLATFORMS.map(p => {
                  const isActive = platforms.includes(p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                      className="text-left p-3 rounded-lg transition-all"
                      style={{
                        background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{p.icon}</span>
                        <span className="text-sm font-medium" style={{ color: isActive ? '#a5b4fc' : '#e5e7eb' }}>{p.label}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{p.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Budget + duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <label className="label">💰 Budżet całkowity</label>
                <div className="flex items-center gap-2">
                  <input type="number" className="input flex-1" min={500} step={500}
                    value={budgetTotal} onChange={e => setBudgetTotal(parseInt(e.target.value) || 0)} />
                  <span className="text-gray-500 text-sm">{budgetCurrency}</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  ~{Math.round(budgetTotal / duration / 7)} {budgetCurrency}/dzień
                </p>
              </div>
              <div className="card">
                <label className="label">📅 Czas trwania (tygodnie)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={26} value={duration}
                    onChange={e => setDuration(parseInt(e.target.value))} className="flex-1" />
                  <span className="text-base font-semibold text-white w-16">{duration} tyg.</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  ~{Math.round(duration / 4.33)} miesiąc{duration / 4.33 >= 2 ? 'e' : ''}
                </p>
              </div>
            </div>

            {/* Product/service */}
            <div className="card">
              <label className="label">📦 Produkt / usługa *</label>
              <textarea className="input" rows={2} value={productService}
                onChange={e => setProductService(e.target.value)}
                placeholder="np. Kurs online programowania w Pythonie dla początkujących, cena 1499 zł, 12 tygodni" />
            </div>

            {/* Target audience */}
            <div className="card">
              <label className="label">👥 Grupa docelowa *</label>
              <textarea className="input" rows={3} value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                placeholder="np. Osoby 25-40 lat zmieniające branżę na IT, pracownicy korpo myślący o rebrandingu zawodowym, miasta >100k mieszkańców, średnie+ dochody" />
            </div>

            {/* KPI + GEO */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <label className="label">🎯 Target KPI</label>
                <input className="input" value={targetKPI} onChange={e => setTargetKPI(e.target.value)}
                  placeholder="np. CPL <80zł, ROAS 4.0, CPA <120zł" />
              </div>
              <div className="card">
                <label className="label">🌍 Geo targeting</label>
                <input className="input" value={geoTargeting} onChange={e => setGeoTargeting(e.target.value)}
                  placeholder="Polska, EU, miasta >100k" />
              </div>
            </div>

            {/* Optional fields */}
            <details className="card">
              <summary className="cursor-pointer text-sm font-medium text-gray-300 select-none">
                ➕ Dodatkowe informacje (opcjonalnie)
              </summary>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="label">🔗 Landing page URL</label>
                  <input className="input" value={landingPageUrl} onChange={e => setLandingPageUrl(e.target.value)}
                    placeholder="https://twoja-strona.pl/oferta" />
                </div>
                <div>
                  <label className="label">⚔️ Główni konkurenci</label>
                  <textarea className="input" rows={2} value={competitors} onChange={e => setCompetitors(e.target.value)}
                    placeholder="np. Brand X (lider rynku), Brand Y (najtaniej)" />
                </div>
                <div>
                  <label className="label">🎨 Istniejące assety / kreacje</label>
                  <textarea className="input" rows={2} value={existingAssets} onChange={e => setExistingAssets(e.target.value)}
                    placeholder="np. 5 video 30s z poprzedniej kampanii, banki zdjęć produktowych, testimoniale od klientów" />
                </div>
                <div>
                  <label className="label">⚠️ Ograniczenia / wytyczne</label>
                  <textarea className="input" rows={2} value={constraints} onChange={e => setConstraints(e.target.value)}
                    placeholder="np. Brak budżetu na produkcję wideo, sezonowość Q4, ograniczenia compliance" />
                </div>
              </div>
            </details>

            {error && (
              <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>
            )}

            {loading && streamText && (
              <div className="p-3 rounded-xl text-xs font-mono text-indigo-300/60 overflow-hidden"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-[10px] text-indigo-400 mb-1">Tworzenie briefu w toku...</p>
                <p className="truncate">{streamText}</p>
              </div>
            )}

            {resultReady && (
              <div className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span className="text-2xl">✅</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Brief performance gotowy!</p>
                  <p className="text-xs text-gray-500">{platforms.length} platform · {duration} tygodni · {budgetTotal} {budgetCurrency}</p>
                </div>
                <button onClick={showResult} className="btn-primary px-6">Pokaż brief →</button>
              </div>
            )}

            <button onClick={generate} disabled={loading || !productService || !targetAudience || platforms.length === 0}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '⚡ Tworzę brief...' : '⚡ Wygeneruj brief performance'}
            </button>
          </div>
        )}

        {data && <BriefDisplay brief={data} />}
      </div>
    </AppShell>
  )
}

// === Display component ===
function BriefDisplay({ brief }: { brief: PerformanceBrief }) {
  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // could add toast, but for now just rely on browser default
    }).catch(() => {})
  }

  function copyFullBrief() {
    const sections: string[] = []
    if (brief.executiveSummary) {
      sections.push('=== EXECUTIVE SUMMARY ===')
      sections.push(`Cel: ${brief.executiveSummary.objective || ''}`)
      sections.push(`Budżet: ${brief.executiveSummary.totalBudget || ''}`)
      sections.push(`Czas: ${brief.executiveSummary.duration || ''}`)
      sections.push(`Top KPI: ${brief.executiveSummary.topKPI || ''}`)
      sections.push(`Oczekiwania: ${brief.executiveSummary.expectedResults || ''}`)
      sections.push(`\n${brief.executiveSummary.summary || ''}`)
    }
    if (brief.objectives?.primary) {
      sections.push('\n=== KPI ===')
      sections.push(`Primary: ${brief.objectives.primary.metric} = ${brief.objectives.primary.target}`)
    }
    copy(sections.join('\n'))
    alert('✓ Skopiowane do schowka')
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.20)' }}>
        <div>
          <p className="text-sm font-semibold text-white">📋 Brief performance</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{brief.executiveSummary?.objective}</p>
        </div>
        <button onClick={copyFullBrief}
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.30)', color: '#a5b4fc' }}>
          📋 Kopiuj cały brief
        </button>
      </div>

      {/* Executive summary */}
      {brief.executiveSummary && (
        <Section title="📊 Executive summary" color="indigo">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Stat label="Budżet" value={brief.executiveSummary.totalBudget || '-'} />
            <Stat label="Czas" value={brief.executiveSummary.duration || '-'} />
            <Stat label="Top KPI" value={brief.executiveSummary.topKPI || '-'} />
            <Stat label="Oczekiwane" value={brief.executiveSummary.expectedResults || '-'} small />
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{brief.executiveSummary.summary}</p>
        </Section>
      )}

      {/* Objectives */}
      {brief.objectives && (
        <Section title="🎯 Cele i KPI" color="emerald">
          {brief.objectives.primary && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">PRIMARY KPI</p>
              <p className="text-base font-semibold text-white">
                {brief.objectives.primary.metric} <span className="text-emerald-400">= {brief.objectives.primary.target}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{brief.objectives.primary.rationale}</p>
            </div>
          )}
          {brief.objectives.secondary && brief.objectives.secondary.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Secondary KPIs</p>
              {brief.objectives.secondary.map((s, i) => (
                <div key={i} className="text-xs flex items-baseline gap-2">
                  <span className="font-medium text-white">{s.metric}</span>
                  <span className="text-emerald-400">= {s.target}</span>
                  <span className="text-gray-500">— {s.rationale}</span>
                </div>
              ))}
            </div>
          )}
          {brief.objectives.northStarMetric && (
            <p className="text-xs text-gray-300 mt-3">
              <span className="text-yellow-400">⭐ North Star:</span> {brief.objectives.northStarMetric}
            </p>
          )}
        </Section>
      )}

      {/* Audiences */}
      {brief.audiences && brief.audiences.length > 0 && (
        <Section title="👥 Audiences" color="purple">
          <div className="space-y-3">
            {brief.audiences.map((a, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-semibold text-white">{a.name}</p>
                    <p className="text-[10px] text-purple-400 mt-0.5">{a.platform} · {a.type}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {a.priority && <span className={`text-[10px] px-2 py-0.5 rounded ${
                      a.priority === 'high' ? 'bg-red-500/15 text-red-300' :
                      a.priority === 'medium' ? 'bg-yellow-500/15 text-yellow-300' :
                      'bg-gray-500/15 text-gray-400'
                    }`}>{a.priority}</span>}
                    {a.budgetShare && <span className="text-[10px] text-gray-400">{a.budgetShare}</span>}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-2">{a.demographics}</p>
                {a.size && <p className="text-[10px] text-gray-500 mb-2">📊 {a.size}</p>}
                {a.interests && a.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {a.interests.map((int, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">{int}</span>
                    ))}
                  </div>
                )}
                {a.behaviors && a.behaviors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {a.behaviors.map((b, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">{b}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Funnel */}
      {brief.funnel && (
        <Section title="🌪️ Lejek konwersji" color="orange">
          <div className="grid grid-cols-3 gap-3">
            {(['tofu', 'mofu', 'bofu'] as const).map(stage => {
              const s = brief.funnel?.[stage]
              if (!s) return null
              const colors = stage === 'tofu' ? '#fb923c' : stage === 'mofu' ? '#fbbf24' : '#10b981'
              return (
                <div key={stage} className="p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors}40` }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: colors }}>
                    {s.label || stage.toUpperCase()}
                  </p>
                  <p className="text-xs text-white mb-2">{s.objective}</p>
                  {s.audiences && (
                    <p className="text-[10px] text-gray-400 mb-1">👥 {s.audiences.join(' · ')}</p>
                  )}
                  {s.creativeType && (
                    <p className="text-[10px] text-gray-400 mb-1">🎨 {s.creativeType}</p>
                  )}
                  {s.kpi && (
                    <p className="text-[10px] text-gray-400 mb-1">📊 {s.kpi}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {s.budgetShare && <span className="text-[10px] font-semibold" style={{ color: colors }}>{s.budgetShare}</span>}
                    {s.duration && <span className="text-[10px] text-gray-500">{s.duration}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Budget split */}
      {brief.budgetSplit && (
        <Section title="💰 Podział budżetu" color="emerald">
          {brief.budgetSplit.byPlatform && brief.budgetSplit.byPlatform.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">Per platforma</p>
              <div className="space-y-2">
                {brief.budgetSplit.byPlatform.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{b.platform}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{b.rationale}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{b.amount}</p>
                      <p className="text-[10px] text-emerald-400">{b.percent}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {brief.budgetSplit.byWeek && brief.budgetSplit.byWeek.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">Tydzień po tygodniu</p>
              <div className="grid grid-cols-2 gap-2">
                {brief.budgetSplit.byWeek.map((w, i) => (
                  <div key={i} className="p-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-white">Tydzień {w.week}</span>
                      <span className="text-xs text-emerald-400">{w.amount}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{w.focus}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {brief.budgetSplit.reserveBudget && (
            <p className="text-xs text-gray-400 mt-3">
              💡 <span className="text-yellow-400">Rezerwa:</span> {brief.budgetSplit.reserveBudget}
            </p>
          )}
        </Section>
      )}

      {/* Creative strategy */}
      {brief.creativeStrategy && (
        <Section title="🎨 Strategia kreacji" color="purple">
          <div className="flex items-center gap-3 mb-4 text-xs">
            {brief.creativeStrategy.totalAdsNeeded && (
              <span className="px-2 py-1 rounded-lg bg-purple-500/15 text-purple-300">
                Łącznie reklam: <strong>{brief.creativeStrategy.totalAdsNeeded}</strong>
              </span>
            )}
          </div>
          {brief.creativeStrategy.creativePillars && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-purple-400 mb-2">Filary kreatywne</p>
              <div className="flex flex-wrap gap-2">
                {brief.creativeStrategy.creativePillars.map((p, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-200">{p}</span>
                ))}
              </div>
            </div>
          )}
          {brief.creativeStrategy.perPlatform && brief.creativeStrategy.perPlatform.length > 0 && (
            <div className="space-y-3 mb-4">
              {brief.creativeStrategy.perPlatform.map((pp, i) => (
                <div key={i} className="p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-sm font-semibold text-white mb-2">{pp.platform}</p>
                  <div className="grid grid-cols-3 gap-3 text-[11px]">
                    <FunnelCreativeBox label="TOFU" items={pp.tofu} color="#fb923c" />
                    <FunnelCreativeBox label="MOFU" items={pp.mofu} color="#fbbf24" />
                    <FunnelCreativeBox label="BOFU" items={pp.bofu} color="#10b981" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {brief.creativeStrategy.abTestPlan && brief.creativeStrategy.abTestPlan.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-purple-400 mb-2">Plan testów A/B</p>
              <div className="space-y-2">
                {brief.creativeStrategy.abTestPlan.map((t, i) => (
                  <div key={i} className="p-3 rounded-lg"
                    style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.20)' }}>
                    <p className="text-xs font-semibold text-white mb-1">🧪 {t.testName}</p>
                    <p className="text-[11px] text-gray-400 mb-1"><strong>Hipoteza:</strong> {t.hypothesis}</p>
                    <p className="text-[11px] text-gray-400 mb-1"><strong>Czas:</strong> {t.duration}</p>
                    <p className="text-[11px] text-gray-400 mb-1"><strong>Sukces:</strong> {t.successCriteria}</p>
                    {t.winnerScaleStrategy && <p className="text-[11px] text-emerald-400 mt-1">→ {t.winnerScaleStrategy}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Landing page */}
      {brief.landingPageRequirements && (
        <Section title="🎯 Landing Page Requirements" color="indigo">
          {brief.landingPageRequirements.criticalElements && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-2">Krytyczne elementy</p>
              <ul className="space-y-1">
                {brief.landingPageRequirements.criticalElements.map((e, i) => (
                  <li key={i} className="text-xs text-gray-300 flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {brief.landingPageRequirements.conversionRateTarget && (
            <p className="text-xs text-gray-300 mb-2">
              <span className="text-emerald-400">📊 Target CR:</span> {brief.landingPageRequirements.conversionRateTarget}
            </p>
          )}
          {brief.landingPageRequirements.trackingChecklist && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-2">Tracking checklist</p>
              <div className="flex flex-wrap gap-1.5">
                {brief.landingPageRequirements.trackingChecklist.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">✓ {t}</span>
                ))}
              </div>
            </div>
          )}
          {brief.landingPageRequirements.redFlags && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-red-400 mb-2">⚠️ Czego unikać</p>
              <ul className="space-y-1">
                {brief.landingPageRequirements.redFlags.map((r, i) => (
                  <li key={i} className="text-xs text-red-300 flex gap-2">
                    <span>✗</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* Tracking */}
      {brief.tracking && (
        <Section title="📡 Tracking & atrybucja" color="indigo">
          {brief.tracking.pixels && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-2">Pixele do podpięcia</p>
              <div className="flex flex-wrap gap-1.5">
                {brief.tracking.pixels.map((p, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded bg-indigo-500/10 text-indigo-300">{p}</span>
                ))}
              </div>
            </div>
          )}
          {brief.tracking.events && brief.tracking.events.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-2">Events</p>
              <div className="space-y-1">
                {brief.tracking.events.map((e, i) => (
                  <div key={i} className="text-xs flex items-baseline gap-3">
                    <code className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[10px]">{e.name}</code>
                    <span className="text-gray-400">→ {e.trigger}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {brief.tracking.utmConvention && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-2">UTM convention</p>
              <code className="text-[10px] block p-2 rounded bg-black/30 text-indigo-200 font-mono">
                {brief.tracking.utmConvention}
              </code>
            </div>
          )}
          {brief.tracking.attribution && (
            <p className="text-xs text-gray-400">
              <span className="text-indigo-400">🎯 Attribution:</span> {brief.tracking.attribution}
            </p>
          )}
          {brief.tracking.serverSide && (
            <p className="text-xs text-gray-400 mt-1">
              <span className="text-indigo-400">⚙️ Server side:</span> {brief.tracking.serverSide}
            </p>
          )}
        </Section>
      )}

      {/* Optimization plan */}
      {brief.optimizationPlan && (
        <Section title="📈 Plan optymalizacji" color="yellow">
          <div className="space-y-3">
            {brief.optimizationPlan.week1 && <WeekBlock label="Tydzień 1 - Learning" plan={brief.optimizationPlan.week1} />}
            {brief.optimizationPlan.week2 && <WeekBlock label="Tydzień 2 - Pierwsza optymalizacja" plan={brief.optimizationPlan.week2} />}
            {brief.optimizationPlan.week3to4 && <WeekBlock label="Tydzień 3-4 - Skalowanie" plan={brief.optimizationPlan.week3to4} />}
            {brief.optimizationPlan.ongoing && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.20)' }}>
                <p className="text-xs font-semibold text-indigo-300 mb-2">🔄 Ongoing maintenance</p>
                {brief.optimizationPlan.ongoing.weekly && (
                  <div className="mb-2">
                    <p className="text-[10px] text-gray-500 mb-1">Co tydzień:</p>
                    <ul className="space-y-0.5 ml-3">
                      {brief.optimizationPlan.ongoing.weekly.map((w, i) => (
                        <li key={i} className="text-[11px] text-gray-300">• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {brief.optimizationPlan.ongoing.monthly && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Co miesiąc:</p>
                    <ul className="space-y-0.5 ml-3">
                      {brief.optimizationPlan.ongoing.monthly.map((m, i) => (
                        <li key={i} className="text-[11px] text-gray-300">• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Reporting */}
      {brief.reporting && (
        <Section title="📊 Raportowanie" color="emerald">
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            {brief.reporting.frequency && (
              <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] text-gray-500">Częstotliwość</p>
                <p className="text-white">{brief.reporting.frequency}</p>
              </div>
            )}
            {brief.reporting.dashboardTools && (
              <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] text-gray-500">Narzędzia</p>
                <p className="text-white">{brief.reporting.dashboardTools}</p>
              </div>
            )}
          </div>
          {brief.reporting.kpisToTrack && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">KPIs do śledzenia</p>
              <ul className="space-y-1">
                {brief.reporting.kpisToTrack.map((k, i) => (
                  <li key={i} className="text-xs text-gray-300 flex gap-2">
                    <span className="text-emerald-400">▸</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {brief.reporting.alertsToSet && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-yellow-400 mb-2">🚨 Alerty</p>
              <div className="flex flex-wrap gap-1.5">
                {brief.reporting.alertsToSet.map((a, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-300">{a}</span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Risks */}
      {brief.risks && brief.risks.length > 0 && (
        <Section title="⚠️ Ryzyka i mitigation" color="red">
          <div className="space-y-2">
            {brief.risks.map((r, i) => (
              <div key={i} className="p-3 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-xs font-semibold text-white flex-1">{r.risk}</p>
                  {r.impact && <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${
                    r.impact === 'high' ? 'bg-red-500/15 text-red-300' :
                    r.impact === 'medium' ? 'bg-yellow-500/15 text-yellow-300' :
                    'bg-gray-500/15 text-gray-400'
                  }`}>{r.impact}</span>}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  <span className="text-emerald-400">→ Mitigation:</span> {r.mitigation}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Success criteria */}
      {brief.successCriteria && (
        <Section title="🏆 Kryteria sukcesu" color="emerald">
          <div className="grid grid-cols-3 gap-3">
            {brief.successCriteria.minimumViableSuccess && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <p className="text-[10px] uppercase tracking-wider text-yellow-400 mb-1">Minimum (OK)</p>
                <p className="text-xs text-gray-300">{brief.successCriteria.minimumViableSuccess}</p>
              </div>
            )}
            {brief.successCriteria.targetSuccess && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Target (Sukces)</p>
                <p className="text-xs text-gray-300">{brief.successCriteria.targetSuccess}</p>
              </div>
            )}
            {brief.successCriteria.stretchGoal && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.25)' }}>
                <p className="text-[10px] uppercase tracking-wider text-purple-400 mb-1">Stretch (Best case)</p>
                <p className="text-xs text-gray-300">{brief.successCriteria.stretchGoal}</p>
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    indigo: '#6366f1', purple: '#a855f7', emerald: '#10b981',
    orange: '#fb923c', yellow: '#fbbf24', red: '#ef4444',
  }
  const c = colors[color] || colors.indigo
  return (
    <div className="card" style={{ borderLeft: `3px solid ${c}` }}>
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      <p className={`font-semibold text-white ${small ? 'text-xs' : 'text-sm'}`}>{value}</p>
    </div>
  )
}

function FunnelCreativeBox({ label, items, color }: { label: string; items?: string[]; color: string }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color }}>{label}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-[11px] text-gray-300">• {item}</li>
        ))}
      </ul>
    </div>
  )
}

function WeekBlock({ label, plan }: { label: string; plan: WeekPlan }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.20)' }}>
      <p className="text-xs font-semibold text-yellow-300 mb-2">{label}</p>
      {plan.focus && <p className="text-xs text-gray-300 mb-2 italic">{plan.focus}</p>}
      {plan.actions && plan.actions.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] text-gray-500 mb-1">Akcje:</p>
          <ul className="space-y-0.5 ml-3">
            {plan.actions.map((a, i) => (
              <li key={i} className="text-[11px] text-gray-300">▸ {a}</li>
            ))}
          </ul>
        </div>
      )}
      {plan.redFlags && plan.redFlags.length > 0 && (
        <div>
          <p className="text-[10px] text-red-400 mb-1">⚠️ Red flags:</p>
          <ul className="space-y-0.5 ml-3">
            {plan.redFlags.map((r, i) => (
              <li key={i} className="text-[11px] text-red-300">{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
