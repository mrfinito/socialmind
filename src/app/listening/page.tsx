'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import HistoryDrawer from '@/components/HistoryDrawer'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'
import { useStore } from '@/lib/store'
import PlatformIcon from '@/components/PlatformIcon'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Summary { totalMentions:number; sentimentScore:number; sentimentLabel:string; trend:string; trendPercent:number; alertsCount:number; period:string }
interface Mention { id:string; platform:string; author:string; content:string; sentiment:string; reach:number; engagement:number; time:string; isAlert:boolean; alertReason:string; suggestedResponse:string; subject?:'brand'|'competitor'|'industry'; competitorName?:string; context?:string; tags?:string[]; url?:string }
interface TopTopic { topic:string; mentions:number; sentiment:string; description:string }
interface CompetitorInsight { name:string; sentimentScore:number; mentions:number; trend:string; topTopic:string; opportunity:string }
interface Alert { id:string; type:string; severity:string; title:string; description:string; recommendation:string; timeframe:string }
interface Opportunity { type:string; title:string; description:string; action:string; priority:string }
interface SourceItem { source:string; count:number; percentage:number }
interface ListeningData {
  summary:Summary; sentimentBreakdown:{positive:number;neutral:number;negative:number}
  mentions:Mention[]; topTopics:TopTopic[]; competitorInsights:CompetitorInsight[]
  alerts:Alert[]; opportunities:Opportunity[]; weeklyTrend:number[]; sourceBreakdown:SourceItem[]
}

// ─── Constants ───────────────────────────────────────────────────────────────
const SENTIMENT_CONFIG = {
  positive: { color:'#34d399', bg:'rgba(52,211,153,0.12)', border:'rgba(52,211,153,0.25)', label:'Pozytywna' },
  neutral:  { color:'#9ca3af', bg:'rgba(156,163,175,0.12)', border:'rgba(156,163,175,0.25)', label:'Neutralna' },
  negative: { color:'#f87171', bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.25)', label:'Negatywna' },
}
const SEVERITY_CONFIG = {
  high:   { color:'#f87171', bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.3)', label:'Wysoki' },
  medium: { color:'#fbbf24', bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.3)',  label:'Średni' },
  low:    { color:'#9ca3af', bg:'rgba(156,163,175,0.1)',  border:'rgba(156,163,175,0.2)', label:'Niski' },
}
const ALERT_ICONS:Record<string,string> = { negative_spike:'📉', viral_post:'🔥', competitor_attack:'⚔️', review:'⭐', crisis:'🚨' }
const OPP_ICONS:Record<string,string> = { trend_to_ride:'🏄', content_gap:'🎯', competitor_weakness:'⚡', positive_amplify:'📢' }
const SOURCE_PLATFORM:Record<string,string> = { 'Facebook':'facebook','Instagram':'instagram','X (Twitter)':'x','LinkedIn':'linkedin','TikTok':'tiktok','Pinterest':'pinterest' }

function Dots() {
  return <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span>
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const cfg = SENTIMENT_CONFIG[sentiment as keyof typeof SENTIMENT_CONFIG] || SENTIMENT_CONFIG.neutral
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}>
      {cfg.label}
    </span>
  )
}

function ScoreRing({ score, size=64 }: { score:number; size?:number }) {
  const color = score >= 70 ? '#34d399' : score >= 45 ? '#fbbf24' : '#f87171'
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative" style={{width:size,height:size}}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{transition:'stroke-dasharray 1s ease'}}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white leading-none">{score}</span>
        <span className="text-[9px] text-gray-600">/100</span>
      </div>
    </div>
  )
}


// ─── Mention Detail Drawer ────────────────────────────────────────────────────
function MentionDrawer({ mention, brandName, onClose, onCopyResponse, copied, mentionUrls, setMentionUrls, getSmartLinks }: {
  mention: Mention
  brandName: string
  onClose: () => void
  onCopyResponse: (id: string, text: string) => void
  copied: string | null
  mentionUrls: Record<string,string>
  setMentionUrls: (fn: (prev: Record<string,string>) => Record<string,string>) => void
  getSmartLinks: (m: Mention) => {label:string; url:string; icon:string}[]
}) {
  const cfg = SENTIMENT_CONFIG[mention.sentiment as keyof typeof SENTIMENT_CONFIG] || SENTIMENT_CONFIG.neutral
  const plt = SOURCE_PLATFORM[mention.platform]
  const subject = mention.subject || (mention.content.toLowerCase().includes(brandName.toLowerCase()) ? 'brand' : 'industry')
  const SUBJECT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    brand:      { label: 'Dotyczy Twojej marki', color: '#a5b4fc', bg: 'rgba(99,102,241,0.15)' },
    competitor: { label: 'Dotyczy konkurencji',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    industry:   { label: 'Temat branżowy',        color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  }
  const subjectCfg = SUBJECT_LABELS[subject] || SUBJECT_LABELS.brand

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="flex-1 bg-black/50"/>
      {/* Drawer */}
      <div className="w-full max-w-lg bg-[#131720] border-l border-white/8 h-full overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 sticky top-0 bg-[#131720] z-10">
          <div className="flex items-center gap-2">
            {plt && <PlatformIcon platform={plt} size={24}/>}
            <div>
              <p className="text-sm font-semibold text-white">{mention.author}</p>
              <p className="text-xs text-gray-500">{mention.platform} · {mention.time}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-all">✕</button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Subject tag */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{background:subjectCfg.bg,color:subjectCfg.color,border:`1px solid ${subjectCfg.color}30`}}>
              {subjectCfg.label}
            </span>
            <SentimentBadge sentiment={mention.sentiment}/>
            {mention.isAlert && (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{background:'rgba(248,113,113,0.15)',color:'#f87171',border:'1px solid rgba(248,113,113,0.3)'}}>
                🚨 Alert
              </span>
            )}
          </div>

          {/* Content */}
          <div className="rounded-2xl p-5" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <p className="text-sm text-gray-200 leading-relaxed text-base">&ldquo;{mention.content}&rdquo;</p>
          </div>

          {/* Alert reason */}
          {mention.isAlert && mention.alertReason && (
            <div className="flex items-start gap-3 p-4 rounded-xl"
              style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)'}}>
              <span className="text-red-400 shrink-0 mt-0.5">🚨</span>
              <div>
                <p className="text-xs font-semibold text-red-300 mb-0.5">Powód alertu</p>
                <p className="text-xs text-gray-400">{mention.alertReason}</p>
              </div>
            </div>
          )}

          {/* Context */}
          {mention.context && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kontekst</p>
              <p className="text-sm text-gray-400 leading-relaxed">{mention.context}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Zasięg', value: mention.reach.toLocaleString(), icon: '👁' },
              { label: 'Zaangażowanie', value: mention.engagement.toString(), icon: '❤️' },
              { label: 'Sentyment', value: cfg.label, icon: mention.sentiment === 'positive' ? '😊' : mention.sentiment === 'negative' ? '😟' : '😐' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="text-xl mb-1">{s.icon}</p>
                <p className="text-sm font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tags */}
          {mention.tags && mention.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tagi</p>
              <div className="flex flex-wrap gap-2">
                {mention.tags.map((tag, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                    style={{background:'rgba(99,102,241,0.12)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* URL + Smart links */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Link do wzmianki</p>
            <div className="space-y-2.5">
              {/* Manual URL input */}
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-xs py-2"
                  placeholder="Wklej URL prawdziwej wzmianki..."
                  value={mentionUrls[mention.id] || mention.url || ''}
                  onChange={e => setMentionUrls(prev => ({...prev, [mention.id]: e.target.value}))}
                />
                {(mentionUrls[mention.id] || mention.url) && (
                  <a
                    href={mentionUrls[mention.id] || mention.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs px-3 py-2 flex items-center gap-1 shrink-0">
                    Otwórz ↗
                  </a>
                )}
              </div>
              {/* Smart search links */}
              <div>
                <p className="text-[10px] text-gray-600 mb-1.5">Szukaj wzmianki automatycznie:</p>
                <div className="flex flex-wrap gap-1.5">
                  {getSmartLinks(mention).map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#9ca3af'}}>
                      <span>{link.icon}</span> {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sentiment analysis */}
          <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Analiza AI</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Sentyment ogólny</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: mention.sentiment === 'positive' ? '80%' : mention.sentiment === 'negative' ? '20%' : '50%',
                      background: cfg.color
                    }}/>
                  </div>
                  <span className="text-xs font-semibold" style={{color:cfg.color}}>{cfg.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Priorytet odpowiedzi</span>
                <span className="text-xs font-semibold" style={{color: mention.isAlert ? '#f87171' : mention.sentiment === 'negative' ? '#fbbf24' : '#34d399'}}>
                  {mention.isAlert ? 'Wysoki — odpowiedz teraz' : mention.sentiment === 'negative' ? 'Średni — odpowiedz dziś' : 'Niski — opcjonalnie'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Dotyczy</span>
                <span className="text-xs font-semibold" style={{color:subjectCfg.color}}>{subjectCfg.label}</span>
              </div>
            </div>
          </div>

          {/* Suggested response */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sugerowana odpowiedź AI</p>
            <div className="rounded-xl p-4" style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)'}}>
              <p className="text-sm text-indigo-100 leading-relaxed italic">&ldquo;{mention.suggestedResponse}&rdquo;</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-[#131720] border-t border-white/6 px-6 py-4 flex gap-3">
          <button
            onClick={() => onCopyResponse(mention.id, mention.suggestedResponse)}
            className="flex-1 btn-primary flex items-center justify-center gap-2">
            {copied === mention.id ? '✓ Skopiowano odpowiedź' : '📋 Kopiuj sugerowaną odpowiedź'}
          </button>
          <button onClick={onClose} className="btn-secondary px-4">Zamknij</button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ListeningPage() {
  const { dna } = useStore()

  // Setup state
  const [brandName, setBrandName] = useState(dna?.brandName || '')
  const [keywordsInput, setKeywordsInput] = useState(dna?.keywords?.split(' ').slice(0,3).join(', ') || '')
  const [competitorsInput, setCompetitorsInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ListeningData|null>(null)
  const [error, setError] = useState('')

  // View state
  const [activeTab, setActiveTab] = useState<'overview'|'mentions'|'alerts'|'competitors'|'opportunities'>('overview')
  const [history, setHistory] = useState<HistoryEntry<ListeningData>[]>([])
  const projectId = dna?.brandName || 'default'
  useEffect(() => { setHistory(historyLoad<ListeningData>('listening', projectId)) }, [projectId])
  const [mentionFilter, setMentionFilter] = useState<'all'|'positive'|'neutral'|'negative'>('all')
  const [expandedMention, setExpandedMention] = useState<string|null>(null)
  const [selectedMention, setSelectedMention] = useState<Mention|null>(null)
  const [copiedResponse, setCopiedResponse] = useState<string|null>(null)
  const [mentionUrls, setMentionUrls] = useState<Record<string,string>>({})

  async function scan() {
    if (!brandName.trim()) { setError('Wpisz nazwę marki'); return }
    setLoading(true); setError('')
    const keywords = keywordsInput.split(',').map(k=>k.trim()).filter(Boolean)
    const competitors = competitorsInput.split(',').map(c=>c.trim()).filter(Boolean)
    try {
      const res = await fetch('/api/listening', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ brandName, keywords, competitors, industry: dna?.industry, masterPrompt: dna?.masterPrompt })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setData(j.data)
      setActiveTab('overview')
      const entry = historySave<ListeningData>('listening', projectId, {
        title: brandName,
        subtitle: `${j.data.summary?.totalMentions || 0} wzmianek · ${j.data.summary?.sentimentLabel || ''}`,
        data: j.data,
      })
      setHistory(prev => [entry, ...prev].slice(0, 20))
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Błąd') }
    finally { setLoading(false) }
  }

  function copyResponse(mentionId: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopiedResponse(mentionId)
    setTimeout(() => setCopiedResponse(null), 1500)
  }

  function getSmartLinks(m: Mention) {
    const q = encodeURIComponent(`"${m.content.slice(0, 60)}"`)
    const authorQ = encodeURIComponent(m.author)
    const plt = m.platform.toLowerCase()
    const links: {label:string; url:string; icon:string}[] = [
      { label: 'Google', url: `https://www.google.com/search?q=${q}`, icon: '🔍' },
    ]
    if (plt.includes('facebook')) links.push({ label: 'Facebook', url: `https://www.facebook.com/search/top?q=${authorQ}`, icon: '📘' })
    if (plt.includes('instagram')) links.push({ label: 'Instagram', url: `https://www.instagram.com/${m.author.replace('@','')}`, icon: '📷' })
    if (plt.includes('x') || plt.includes('twitter')) links.push({ label: 'X/Twitter', url: `https://twitter.com/search?q=${q}`, icon: '✖' })
    if (plt.includes('linkedin')) links.push({ label: 'LinkedIn', url: `https://www.linkedin.com/search/results/content/?keywords=${q}`, icon: '💼' })
    if (plt.includes('google')) links.push({ label: 'Google Maps', url: `https://www.google.com/maps/search/${encodeURIComponent(m.author)}`, icon: '⭐' })
    if (plt.includes('tiktok')) links.push({ label: 'TikTok', url: `https://www.tiktok.com/@${m.author.replace('@','')}`, icon: '🎵' })
    return links
  }

  const filteredMentions = data?.mentions.filter(m =>
    mentionFilter === 'all' || m.sentiment === mentionFilter
  ) || []

  const maxTrend = data ? Math.max(...(data.weeklyTrend || [1])) : 1

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <span>📡</span> Social Listening
            </h1>
            <p className="text-gray-500 text-sm mt-1">Monitoring wzmianek, analiza sentymentu, alerty i sugestie odpowiedzi</p>
          </div>
          {data && (
            <button onClick={() => { setData(null); setActiveTab('overview') }} className="btn-secondary text-sm">
              ← Nowe skanowanie
            </button>
          )}
        </div>

        {/* Setup form */}
        {!data && (
          <div className="card space-y-5 max-w-2xl">
            <div>
              <label className="label">Nazwa marki do monitorowania</label>
              <input className="input" placeholder="np. Kids&Co, Restauracja Primo..."
                value={brandName} onChange={e=>setBrandName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Dodatkowe słowa kluczowe <span className="text-gray-600 normal-case font-normal">(opcjonalnie, oddziel przecinkiem)</span></label>
              <input className="input" placeholder="np. przedszkole warszawa, edukacja montessori, rekrutacja 2026"
                value={keywordsInput} onChange={e=>setKeywordsInput(e.target.value)} />
            </div>
            <div>
              <label className="label">Konkurenci do porównania <span className="text-gray-600 normal-case font-normal">(opcjonalnie)</span></label>
              <input className="input" placeholder="np. Przedszkole XYZ, Akademia ABC"
                value={competitorsInput} onChange={e=>setCompetitorsInput(e.target.value)} />
            </div>
            {dna && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)'}}>
                <span className="text-indigo-400">✦</span>
                <span className="text-indigo-300">Monitoring dopasowany do branży: <strong>{dna.industry}</strong></span>
              </div>
            )}
            <div className="rounded-xl px-4 py-3 text-xs text-amber-400/80 leading-relaxed"
              style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)'}}>
              ⚠️ Social Listening działa na symulacji AI opartej na wiedzy o rynku i branży. Nie jest to live scraping platform — zastępuje drogie narzędzia takie jak Brandwatch w fazie planowania strategii.
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            <button className="btn-primary flex items-center gap-2 px-8 py-3" onClick={scan} disabled={loading}>
              {loading ? <><Dots /> Skanuję wzmianki...</> : '📡 Uruchom Social Listening'}
            </button>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-5">
            {/* Alert banner */}
            {data.alerts.some(a => a.severity === 'high') && (
              <div className="rounded-2xl p-4 flex items-start gap-3 animate-pulse"
                style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.3)'}}>
                <span className="text-xl shrink-0">🚨</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-300">Alert wysokiego priorytetu</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {data.alerts.find(a=>a.severity==='high')?.title} — {data.alerts.find(a=>a.severity==='high')?.description}
                  </p>
                </div>
                <button onClick={()=>setActiveTab('alerts')}
                  className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                  style={{background:'rgba(248,113,113,0.2)',color:'#f87171',border:'1px solid rgba(248,113,113,0.3)'}}>
                  Zobacz →
                </button>
              </div>
            )}

            {/* Top metrics */}
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Wzmianki', value: data.summary.totalMentions, sub: data.summary.period, icon: '💬' },
                { label: 'Alerty', value: data.summary.alertsCount, sub: 'wymagają uwagi', icon: '🔔', alert: data.summary.alertsCount > 0 },
                { label: 'Trend', value: `+${data.summary.trendPercent}%`, sub: data.summary.trend, icon: data.summary.trend==='rosnący'?'↑':'→' },
                { label: 'Pozytywne', value: `${data.sentimentBreakdown.positive}%`, sub: 'sentyment', icon: '😊' },
                { label: 'Negatywne', value: `${data.sentimentBreakdown.negative}%`, sub: 'sentyment', icon: '😟', negative: true },
              ].map((m,i) => (
                <div key={i} className="card p-4"
                  style={{borderColor: m.alert ? 'rgba(248,113,113,0.3)' : m.negative && data.sentimentBreakdown.negative > 20 ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)'}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{m.label}</span>
                    <span className="text-base">{m.icon}</span>
                  </div>
                  <p className={`text-2xl font-bold ${m.alert ? 'text-red-400' : 'text-white'}`}>{m.value}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Sentiment score + weekly trend */}
            <div className="grid grid-cols-3 gap-5">
              <div className="card flex flex-col items-center justify-center py-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Wynik sentymentu</p>
                <ScoreRing score={data.summary.sentimentScore} size={80}/>
                <p className="text-sm font-semibold mt-3" style={{color: data.summary.sentimentScore >= 70 ? '#34d399' : data.summary.sentimentScore >= 45 ? '#fbbf24' : '#f87171'}}>
                  {data.summary.sentimentLabel}
                </p>
                <div className="flex gap-3 mt-4">
                  {Object.entries(data.sentimentBreakdown).map(([key,val]) => {
                    const cfg = SENTIMENT_CONFIG[key as keyof typeof SENTIMENT_CONFIG]
                    return (
                      <div key={key} className="text-center">
                        <p className="text-sm font-bold" style={{color:cfg.color}}>{val}%</p>
                        <p className="text-[10px] text-gray-600">{cfg.label}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="card col-span-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Aktywność 7 dni</p>
                <div className="flex items-end gap-2 h-24 mb-3">
                  {(data.weeklyTrend||[]).map((v,i) => {
                    const days = ['Pon','Wt','Śr','Czw','Pt','Sob','Nie']
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t-sm transition-all"
                          style={{height:`${Math.max(8,(v/maxTrend)*100)}%`,background:'rgba(99,102,241,0.6)'}}/>
                        <span className="text-[9px] text-gray-700">{days[i]}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/6">
                  {(data.sourceBreakdown||[]).slice(0,3).map((s,i) => (
                    <div key={i} className="flex items-center gap-2">
                      {SOURCE_PLATFORM[s.source] ? (
                        <PlatformIcon platform={SOURCE_PLATFORM[s.source]} size={18}/>
                      ) : <span className="w-4.5 h-4.5 text-sm">🌐</span>}
                      <div>
                        <p className="text-[10px] text-gray-400">{s.source}</p>
                        <p className="text-[10px] text-gray-600">{s.count} ({s.percentage}%)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1.5 rounded-2xl"
              style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              {[
                { id:'overview',     label:'📊 Przegląd' },
                { id:'mentions',     label:`💬 Wzmianki (${data.mentions?.length||0})` },
                { id:'alerts',       label:`🔔 Alerty (${data.alerts?.length||0})`, urgent: data.alerts?.some(a=>a.severity==='high') },
                { id:'competitors',  label:`⚔️ Konkurencja (${data.competitorInsights?.length||0})` },
                { id:'opportunities',label:`💡 Szanse (${data.opportunities?.length||0})` },
              ].map(t => (
                <button key={t.id} onClick={()=>setActiveTab(t.id as typeof activeTab)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative"
                  style={{
                    background: activeTab===t.id ? 'rgba(99,102,241,0.25)' : 'transparent',
                    color: activeTab===t.id ? '#a5b4fc' : '#6b7280',
                  }}>
                  {t.label}
                  {t.urgent && activeTab!==t.id && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-400 rounded-full"/>
                  )}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab==='overview' && (
              <div className="grid grid-cols-2 gap-5">
                {/* Top topics */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-4">🔥 Najpopularniejsze tematy</h3>
                  <div className="space-y-3">
                    {(data.topTopics||[]).map((t,i) => {
                      const cfg = SENTIMENT_CONFIG[t.sentiment as keyof typeof SENTIMENT_CONFIG] || SENTIMENT_CONFIG.neutral
                      const maxMentions = Math.max(...(data.topTopics||[]).map(x=>x.mentions),1)
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{t.topic}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}>
                                {t.mentions}
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden mb-1"
                            style={{background:'rgba(255,255,255,0.06)'}}>
                            <div className="h-full rounded-full transition-all"
                              style={{width:`${(t.mentions/maxMentions)*100}%`,background:cfg.color}}/>
                          </div>
                          <p className="text-[11px] text-gray-600">{t.description}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Source breakdown */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-4">📊 Źródła wzmianek</h3>
                  <div className="space-y-3">
                    {(data.sourceBreakdown||[]).map((s,i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {SOURCE_PLATFORM[s.source]
                              ? <PlatformIcon platform={SOURCE_PLATFORM[s.source]} size={20}/>
                              : <span className="text-base">🌐</span>}
                            <span className="text-xs text-gray-300">{s.source}</span>
                          </div>
                          <span className="text-xs text-gray-500">{s.count} ({s.percentage}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden"
                          style={{background:'rgba(255,255,255,0.06)'}}>
                          <div className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{width:`${s.percentage}%`}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent mentions preview */}
                <div className="card col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Ostatnie wzmianki</h3>
                    <button onClick={()=>setActiveTab('mentions')} className="text-xs text-indigo-400 hover:text-indigo-300">
                      Zobacz wszystkie →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(data.mentions||[]).slice(0,3).map(m => (
                      <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl transition-all group"
                        style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                          style={{background:'rgba(99,102,241,0.3)'}}>
                          {m.author.slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-300">{m.author}</span>
                            {SOURCE_PLATFORM[m.platform] ? <PlatformIcon platform={SOURCE_PLATFORM[m.platform]||m.platform} size={14}/> : null}
                            <span className="text-[10px] text-gray-600">{m.time}</span>
                            <SentimentBadge sentiment={m.sentiment}/>
                            <button onClick={()=>setSelectedMention(m)}
                              className="ml-auto text-[10px] text-indigo-400 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-all px-2 py-0.5 rounded border border-indigo-500/20">
                              Szczegóły →
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{m.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── MENTIONS TAB ── */}
            {activeTab==='mentions' && (
              <div>
                {/* Filter */}
                <div className="flex gap-2 mb-4">
                  {(['all','positive','neutral','negative'] as const).map(f => (
                    <button key={f} onClick={()=>setMentionFilter(f)}
                      className="text-xs px-4 py-2 rounded-xl border transition-all"
                      style={{
                        background: mentionFilter===f ? (f==='all'?'rgba(99,102,241,0.2)':SENTIMENT_CONFIG[f]?.bg||'rgba(99,102,241,0.2)') : 'rgba(255,255,255,0.03)',
                        borderColor: mentionFilter===f ? (f==='all'?'rgba(99,102,241,0.4)':SENTIMENT_CONFIG[f]?.border||'rgba(99,102,241,0.4)') : 'rgba(255,255,255,0.08)',
                        color: mentionFilter===f ? (f==='all'?'#a5b4fc':SENTIMENT_CONFIG[f]?.color||'#a5b4fc') : '#6b7280',
                      }}>
                      {f==='all' ? 'Wszystkie' : SENTIMENT_CONFIG[f]?.label} ({f==='all'?data.mentions?.length:(data.mentions||[]).filter(m=>m.sentiment===f).length})
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredMentions.map(m => {
                    const cfg = SENTIMENT_CONFIG[m.sentiment as keyof typeof SENTIMENT_CONFIG] || SENTIMENT_CONFIG.neutral
                    const isExpanded = expandedMention === m.id
                    const plt = SOURCE_PLATFORM[m.platform]
                    return (
                      <div key={m.id} className="card p-0 overflow-hidden transition-all"
                        style={{borderColor: m.isAlert ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.06)'}}>
                        {m.isAlert && (
                          <div className="px-4 py-2 text-xs font-semibold text-red-300 flex items-center gap-2"
                            style={{background:'rgba(248,113,113,0.08)',borderBottom:'1px solid rgba(248,113,113,0.15)'}}>
                            🚨 {m.alertReason}
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{background:`linear-gradient(135deg,${cfg.color}60,${cfg.color}30)`}}>
                              {m.author.replace('@','').slice(0,2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className="text-sm font-semibold text-white">{m.author}</span>
                                {plt && <PlatformIcon platform={plt} size={16}/>}
                                {!plt && <span className="text-xs text-gray-500">{m.platform}</span>}
                                <span className="text-[10px] text-gray-600">{m.time}</span>
                                <SentimentBadge sentiment={m.sentiment}/>
                                <span className="text-[10px] text-gray-600 ml-auto">
                                  👁 {m.reach.toLocaleString()} · ❤️ {m.engagement}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 leading-relaxed">{m.content}</p>
                            </div>
                          </div>

                          {/* Actions row */}
                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); setExpandedMention(isExpanded?null:m.id) }}
                              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                              <span>✦</span> Sugerowana odpowiedź
                              <span className="text-gray-600">{isExpanded?'▲':'▼'}</span>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setSelectedMention(m) }}
                              className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:bg-indigo-500/20"
                              style={{color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.25)'}}>
                              Zobacz szczegóły →
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="mt-2 flex items-start gap-2">
                              <p className="flex-1 text-xs text-gray-300 leading-relaxed italic p-3 rounded-xl"
                                style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)'}}>
                                &ldquo;{m.suggestedResponse}&rdquo;
                              </p>
                              <button onClick={e=>{ e.stopPropagation(); copyResponse(m.id, m.suggestedResponse) }}
                                className="text-xs px-3 py-1.5 rounded-lg shrink-0 transition-all"
                                style={{background:'rgba(99,102,241,0.15)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.25)'}}>
                                {copiedResponse===m.id ? '✓' : 'Kopiuj'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── ALERTS TAB ── */}
            {activeTab==='alerts' && (
              <div className="space-y-4">
                {(data.alerts||[]).length === 0
                  ? <div className="card text-center py-12 text-gray-600">Brak alertów — świetna robota! 🎉</div>
                  : (data.alerts||[]).sort((a,b) => {
                    const order = {high:0,medium:1,low:2}
                    return (order[a.severity as keyof typeof order]||2) - (order[b.severity as keyof typeof order]||2)
                  }).map(alert => {
                    const cfg = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low
                    return (
                      <div key={alert.id} className="card"
                        style={{borderColor:cfg.border,background:`${cfg.bg}`}}>
                        <div className="flex items-start gap-4">
                          <div className="text-2xl shrink-0 mt-0.5">
                            {ALERT_ICONS[alert.type] || '⚠️'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-white">{alert.title}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}>
                                {cfg.label}
                              </span>
                              <span className="text-[10px] text-gray-600 ml-auto">⏱ {alert.timeframe}</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-3">{alert.description}</p>
                            <div className="flex items-start gap-2 p-3 rounded-xl"
                              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                              <span className="text-indigo-400 shrink-0 mt-0.5">→</span>
                              <p className="text-xs text-gray-300">{alert.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            )}

            {/* ── COMPETITORS TAB ── */}
            {activeTab==='competitors' && (
              <div>
                {(data.competitorInsights||[]).length === 0
                  ? (
                    <div className="card text-center py-12">
                      <p className="text-gray-600 text-sm">Nie podano konkurentów do porównania.</p>
                      <button onClick={()=>{setData(null)}} className="btn-secondary text-sm mt-4">
                        Wróć i dodaj konkurentów
                      </button>
                    </div>
                  )
                  : (
                    <div className="grid grid-cols-2 gap-5">
                      {/* Our score */}
                      <div className="card flex items-center gap-5 col-span-2"
                        style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)'}}>
                        <ScoreRing score={data.summary.sentimentScore} size={72}/>
                        <div>
                          <p className="text-xs text-indigo-400 mb-0.5">Twoja marka — {brandName}</p>
                          <p className="text-xl font-bold text-white">Wynik sentymentu: {data.summary.sentimentScore}/100</p>
                          <p className="text-xs text-gray-500 mt-0.5">{data.summary.totalMentions} wzmianek · {data.summary.sentimentLabel}</p>
                        </div>
                      </div>

                      {(data.competitorInsights||[]).map((comp,i) => {
                        const diff = data.summary.sentimentScore - comp.sentimentScore
                        const isWinning = diff > 0
                        return (
                          <div key={i} className="card">
                            <div className="flex items-start gap-4 mb-4">
                              <ScoreRing score={comp.sentimentScore} size={60}/>
                              <div className="flex-1">
                                <p className="font-bold text-white">{comp.name}</p>
                                <p className="text-xs text-gray-500">{comp.mentions} wzmianek · {comp.trend}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-sm font-bold ${isWinning?'text-emerald-400':'text-red-400'}`}>
                                    {isWinning ? '+' : ''}{diff} pkt
                                  </span>
                                  <span className="text-xs text-gray-600">{isWinning ? 'jesteś lepszy' : 'są lepsi'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2.5">
                              <div>
                                <p className="text-[10px] text-gray-600 mb-1">Główny temat dyskusji</p>
                                <p className="text-xs text-gray-300">{comp.topTopic}</p>
                              </div>
                              <div className="p-3 rounded-xl"
                                style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.15)'}}>
                                <p className="text-[10px] text-emerald-400 mb-1">💡 Szansa dla Ciebie</p>
                                <p className="text-xs text-gray-300">{comp.opportunity}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              </div>
            )}

            {/* ── OPPORTUNITIES TAB ── */}
            {activeTab==='opportunities' && (
              <div className="space-y-4">
                {(data.opportunities||[]).map((opp,i) => {
                  const priorityColor = opp.priority==='wysoki' ? {bg:'rgba(248,113,113,0.1)',border:'rgba(248,113,113,0.25)',color:'#f87171'} :
                    opp.priority==='średni' ? {bg:'rgba(251,191,36,0.1)',border:'rgba(251,191,36,0.25)',color:'#fbbf24'} :
                    {bg:'rgba(156,163,175,0.1)',border:'rgba(156,163,175,0.2)',color:'#9ca3af'}
                  return (
                    <div key={i} className="card">
                      <div className="flex items-start gap-4">
                        <span className="text-2xl shrink-0">{OPP_ICONS[opp.type]||'💡'}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-sm font-bold text-white">{opp.title}</p>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{background:priorityColor.bg,color:priorityColor.color,border:`1px solid ${priorityColor.border}`}}>
                              {opp.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">{opp.description}</p>
                          <div className="flex items-center gap-2 p-3 rounded-xl"
                            style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)'}}>
                            <span className="text-indigo-400">→</span>
                            <p className="text-xs text-indigo-200 font-medium">{opp.action}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mention Detail Drawer */}
      {selectedMention && (
        <MentionDrawer
          mention={selectedMention}
          brandName={brandName}
          onClose={() => setSelectedMention(null)}
          onCopyResponse={copyResponse}
          copied={copiedResponse}
          mentionUrls={mentionUrls}
          setMentionUrls={setMentionUrls}
          getSmartLinks={getSmartLinks}
        />
      )}
    </AppShell>
  )
}
