'use client'
import { useState, useRef, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import ImageGenerator from '@/components/ImageGenerator'
import type { HistoryEntry } from '@/lib/history'

interface BriefResult {
  briefAnalysis: {
    businessProblem: string
    targetAudience: string
    objectives: string[]
    constraints: string
    successCriteria: string
  }
  communicationStrategy: {
    insight: string
    positioning: string
    promise: string
    rtb: string[]
    messageHierarchy: { primary: string; secondary: string[] }
    toneOfVoice: string
  }
  bigIdea: {
    name: string
    tagline: string
    concept: string
    executionalIdea: string
    whyItWorks: string[]
    campaignNarrative: string
  }
  atl: {
    tvSpot: { title: string; duration: string; synopsis: string; keyScenes: string[]; voiceover: string; endline: string }
    radioSpot: { title: string; duration: string; script: string }
    ooh: { concept: string; headlines: string[]; visualDescription: string; placements: string }
  }
  digital: {
    campaignSite: { concept: string; structure: string[]; interactiveElements: string[] }
    displayAds: { concept: string; formats: string[]; cta: string }
    videoAds: { platform: string; format: string; concept: string; script: string }[]
    influencerStrategy: { approach: string; tiers: string[]; contentTypes: string[] }
  }
  social: {
    strategicApproach: string
    facebook: { approach: string; contentTypes: string[]; samplePosts: { type: string; text: string; visualIdea: string }[] }
    instagram: { approach: string; contentTypes: string[]; samplePosts: { type: string; concept: string; caption: string; visualIdea: string }[] }
    tiktok: { approach: string; contentIdeas: string[]; challenges: string }
    linkedin: { approach: string; contentTypes: string[] }
  }
  activations: {
    experiential: { name: string; description: string; objective: string; scale: string }[]
    guerrilla: { name: string; description: string; rationale: string }[]
    partnerships: { partner: string; concept: string; value: string }[]
    pr: { angles: string[]; events: string }
  }
  execution: {
    phases: { phase: string; objectives: string; channels: string[]; kpi: string }[]
    budgetSplit: Record<string, string>
    risks: { risk: string; mitigation: string }[]
    nextSteps: string[]
  }
}

const TABS = [
  { id: 'analysis', label: 'Analiza briefu', icon: '🔍' },
  { id: 'strategy', label: 'Strategia', icon: '🧭' },
  { id: 'idea', label: 'Big Idea', icon: '✨' },
  { id: 'atl', label: 'ATL', icon: '📺' },
  { id: 'digital', label: 'Digital', icon: '💻' },
  { id: 'social', label: 'Social', icon: '📱' },
  { id: 'activations', label: 'Aktywacje', icon: '🎪' },
  { id: 'execution', label: 'Execution', icon: '🎯' },
]

export default function WlasnyBriefPage() {
  const { activeProject } = useStore()
  const projectId = activeProject?.id || 'default'
  
  const [mode, setMode] = useState<'upload' | 'paste'>('upload')
  const [briefText, setBriefText] = useState('')
  const [projectName, setProjectName] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [streamProgress, setStreamProgress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<BriefResult | null>(null)
  const [activeTab, setActiveTab] = useState('analysis')
  const [history, setHistory] = useState<HistoryEntry<BriefResult>[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    const h = historyLoad<BriefResult>('wlasny-brief', projectId)
    setHistory(h)
    if (h.length > 0 && !data) setData(h[0].data)
  }, [projectId])

  async function handleFile(file: File) {
    setFileLoading(true)
    setError('')
    setFileName(file.name)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/extract-text', { method: 'POST', body: fd })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setBriefText(j.text)
      if (!projectName) setProjectName(file.name.replace(/\.[^.]+$/, ''))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
      setFileName('')
    } finally {
      setFileLoading(false)
    }
  }

  async function generate() {
    if (!briefText.trim() || briefText.length < 50) {
      setError('Brief jest zbyt krótki - minimum 50 znaków')
      return
    }
    setLoading(true)
    setError('')
    setStreamProgress('')
    setData(null)

    try {
      const res = await fetch('/api/wlasny-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefText, projectName, additionalContext }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error)
      }
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('Brak streamu')
      
      let buffer = ''
      let received = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.chunk) {
              received += parsed.chunk.length
              setStreamProgress(`Otrzymano ${(received/1024).toFixed(1)} KB...`)
            }
            if (parsed.done && parsed.data) {
              setData(parsed.data)
              setActiveTab('analysis')
              const entry = historySave<BriefResult>('wlasny-brief', projectId, {
                title: projectName || 'Brief kampanii',
                subtitle: parsed.data.bigIdea?.name || 'Opracowanie',
                data: parsed.data,
              })
              setHistory(prev => [entry, ...prev].slice(0, 10))
            }
            if (parsed.error) throw new Error(parsed.error)
          } catch {}
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setLoading(false)
      setStreamProgress('')
    }
  }

  function reset() {
    setData(null)
    setBriefText('')
    setProjectName('')
    setAdditionalContext('')
    setFileName('')
    setError('')
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">📂 Własny brief</h1>
          <p className="text-gray-500 text-sm mt-1">
            Wgraj brief kampanii (PDF/DOCX/TXT) lub wpisz ręcznie. AI stworzy strategię komunikacji, big ideę, skrypty ATL, kampanię digital, social i aktywacje.
          </p>
        </div>

        {!data && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setMode('upload')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: mode === 'upload' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    border: mode === 'upload' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: mode === 'upload' ? '#a5b4fc' : '#9ca3af',
                  }}>
                  📎 Wgraj plik
                </button>
                <button onClick={() => setMode('paste')}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: mode === 'paste' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    border: mode === 'paste' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: mode === 'paste' ? '#a5b4fc' : '#9ca3af',
                  }}>
                  ✍️ Wpisz ręcznie
                </button>
              </div>

              {mode === 'upload' && (
                <div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  <div onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all hover:border-indigo-500/50"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    {fileLoading ? (
                      <p className="text-sm text-gray-400">Przetwarzanie pliku...</p>
                    ) : fileName ? (
                      <div>
                        <p className="text-3xl mb-3">✅</p>
                        <p className="text-white font-medium">{fileName}</p>
                        <p className="text-xs text-gray-500 mt-1">{(briefText.length/1000).toFixed(1)}k znaków wczytanych</p>
                        <p className="text-xs text-indigo-400 mt-3">Kliknij żeby zmienić plik</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-3xl mb-3">📎</p>
                        <p className="text-white font-medium mb-1">Przeciągnij plik lub kliknij żeby wybrać</p>
                        <p className="text-xs text-gray-500">PDF, DOCX, TXT · max 10MB</p>
                      </div>
                    )}
                  </div>
                  {fileName && briefText && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">Podgląd treści (możesz edytować):</p>
                      <textarea value={briefText} onChange={e => setBriefText(e.target.value)}
                        rows={8} className="input w-full text-xs font-mono" />
                    </div>
                  )}
                </div>
              )}

              {mode === 'paste' && (
                <textarea value={briefText} onChange={e => setBriefText(e.target.value)}
                  rows={14} placeholder="Wklej tutaj treść briefu kampanii..."
                  className="input w-full resize-none" />
              )}
            </div>

            {(briefText.length >= 50) && (
              <div className="card space-y-4">
                <div>
                  <label className="label">Nazwa projektu/kampanii (opcjonalnie)</label>
                  <input className="input" value={projectName} onChange={e => setProjectName(e.target.value)}
                    placeholder="np. Kampania wiosenna 2026" />
                </div>
                <div>
                  <label className="label">Dodatkowy kontekst (opcjonalnie)</label>
                  <textarea className="input" rows={3} value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                    placeholder="Czego brakuje w briefie? Specjalne wymagania? Inspiracje?" />
                </div>
              </div>
            )}

            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}

            <button onClick={generate} disabled={loading || briefText.length < 50}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? `✦ Tworzę opracowanie... ${streamProgress}` : '✦ Stwórz strategię i koncept kreatywny'}
            </button>
          </div>
        )}

        {data && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-indigo-400 font-medium mb-1">{projectName || 'Opracowanie kampanii'}</p>
                <h2 className="text-2xl font-bold text-white">{data.bigIdea?.name}</h2>
                {data.bigIdea?.tagline && <p className="text-base italic text-gray-400 mt-1">&ldquo;{data.bigIdea.tagline}&rdquo;</p>}
              </div>
              <button onClick={reset} className="btn-ghost text-sm">🔄 Nowy brief</button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  style={{
                    background: activeTab === t.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                    border: activeTab === t.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                    color: activeTab === t.id ? '#a5b4fc' : '#9ca3af',
                  }}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {activeTab === 'analysis' && data.briefAnalysis && (
                <div className="card space-y-4">
                  <div>
                    <h3 className="label">Problem biznesowy</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{data.briefAnalysis.businessProblem}</p>
                  </div>
                  <div>
                    <h3 className="label">Grupa docelowa</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{data.briefAnalysis.targetAudience}</p>
                  </div>
                  <div>
                    <h3 className="label">Cele kampanii</h3>
                    <ul className="space-y-1">
                      {data.briefAnalysis.objectives?.map((o,i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-indigo-400">{i+1}.</span>{o}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><h3 className="label">Ograniczenia</h3><p className="text-sm text-gray-400">{data.briefAnalysis.constraints}</p></div>
                    <div><h3 className="label">Kryteria sukcesu</h3><p className="text-sm text-gray-400">{data.briefAnalysis.successCriteria}</p></div>
                  </div>
                </div>
              )}

              {activeTab === 'strategy' && data.communicationStrategy && (
                <div className="card space-y-4">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">💡 Insight strategiczny</h3>
                    <p className="text-base text-white leading-relaxed italic">&ldquo;{data.communicationStrategy.insight}&rdquo;</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><h3 className="label">Pozycjonowanie</h3><p className="text-sm text-gray-300">{data.communicationStrategy.positioning}</p></div>
                    <div><h3 className="label">Obietnica</h3><p className="text-sm text-gray-300">{data.communicationStrategy.promise}</p></div>
                  </div>
                  <div>
                    <h3 className="label">Reasons to believe</h3>
                    <ul className="space-y-1">
                      {data.communicationStrategy.rtb?.map((r,i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-emerald-400">✓</span>{r}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="label">Hierarchia komunikatu</h3>
                    <p className="text-base font-semibold text-white mb-2">{data.communicationStrategy.messageHierarchy?.primary}</p>
                    <ul className="space-y-1">
                      {data.communicationStrategy.messageHierarchy?.secondary?.map((s,i) => <li key={i} className="text-xs text-gray-400">→ {s}</li>)}
                    </ul>
                  </div>
                  <div><h3 className="label">Tone of voice</h3><p className="text-sm text-gray-300">{data.communicationStrategy.toneOfVoice}</p></div>
                </div>
              )}

              {activeTab === 'idea' && data.bigIdea && (
                <div className="space-y-4">
                  <div className="card text-center py-10" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))' }}>
                    <p className="text-xs text-indigo-300 uppercase tracking-widest mb-3">✨ Big Idea</p>
                    <h2 className="text-3xl font-bold text-white mb-3">{data.bigIdea.name}</h2>
                    <p className="text-xl italic text-indigo-200">&ldquo;{data.bigIdea.tagline}&rdquo;</p>
                  </div>
                  <div className="card">
                    <h3 className="label">Koncept</h3>
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">{data.bigIdea.concept}</p>
                    <h3 className="label">Egzekucja</h3>
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">{data.bigIdea.executionalIdea}</p>
                    <h3 className="label">Dlaczego to działa</h3>
                    <ul className="space-y-1 mb-4">
                      {data.bigIdea.whyItWorks?.map((w,i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-emerald-400">✓</span>{w}</li>)}
                    </ul>
                    <h3 className="label">Narracja kampanii</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{data.bigIdea.campaignNarrative}</p>
                  </div>
                </div>
              )}

              {activeTab === 'atl' && data.atl && (
                <div className="space-y-4">
                  {data.atl.tvSpot && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">📺 Spot TV — {data.atl.tvSpot.title} ({data.atl.tvSpot.duration})</h3>
                      <p className="text-sm text-gray-300 leading-relaxed mb-4">{data.atl.tvSpot.synopsis}</p>
                      <h4 className="label">Kluczowe sceny</h4>
                      <ul className="space-y-1 mb-4">
                        {data.atl.tvSpot.keyScenes?.map((s,i) => <li key={i} className="text-xs text-gray-400 leading-relaxed">{s}</li>)}
                      </ul>
                      <div className="p-3 rounded-lg bg-white/5 mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-1">Voiceover</p>
                        <p className="text-sm text-gray-200 italic leading-relaxed">{data.atl.tvSpot.voiceover}</p>
                      </div>
                      <div className="text-sm text-indigo-300 italic">{data.atl.tvSpot.endline}</div>
                    </div>
                  )}
                  {data.atl.radioSpot && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">📻 Spot radiowy — {data.atl.radioSpot.title} ({data.atl.radioSpot.duration})</h3>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-white/5 p-3 rounded-lg">{data.atl.radioSpot.script}</pre>
                    </div>
                  )}
                  {data.atl.ooh && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">🛣️ OOH (outdoor)</h3>
                      <p className="text-sm text-gray-300 mb-3">{data.atl.ooh.concept}</p>
                      <h4 className="label">Headlines</h4>
                      <ul className="space-y-1 mb-3">
                        {data.atl.ooh.headlines?.map((h,i) => <li key={i} className="text-base font-bold text-white">&ldquo;{h}&rdquo;</li>)}
                      </ul>
                      <p className="text-xs text-gray-400 mb-2"><span className="text-gray-500">Wizual:</span> {data.atl.ooh.visualDescription}</p>
                      <p className="text-xs text-gray-400 mb-3"><span className="text-gray-500">Lokalizacje:</span> {data.atl.ooh.placements}</p>
                      <ImageGenerator initialPrompt={data.atl.ooh.visualDescription} platform="facebook" size="md" />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'digital' && data.digital && (
                <div className="space-y-4">
                  {data.digital.campaignSite && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">🌐 Strona kampanijna</h3>
                      <p className="text-sm text-gray-300 mb-3">{data.digital.campaignSite.concept}</p>
                      <h4 className="label">Struktura</h4>
                      <ul className="space-y-1 mb-3">
                        {data.digital.campaignSite.structure?.map((s,i) => <li key={i} className="text-xs text-gray-400">→ {s}</li>)}
                      </ul>
                      <h4 className="label">Elementy interaktywne</h4>
                      <ul className="space-y-1">
                        {data.digital.campaignSite.interactiveElements?.map((e,i) => <li key={i} className="text-xs text-gray-400">⚡ {e}</li>)}
                      </ul>
                    </div>
                  )}
                  {data.digital.videoAds && data.digital.videoAds.length > 0 && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">🎬 Reklamy video</h3>
                      <div className="space-y-3">
                        {data.digital.videoAds.map((v,i) => (
                          <div key={i} className="p-3 rounded-lg bg-white/5">
                            <p className="text-xs text-indigo-400 font-medium mb-1">{v.platform} · {v.format}</p>
                            <p className="text-sm text-gray-200 mb-2">{v.concept}</p>
                            <p className="text-xs text-gray-400 italic">{v.script}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.digital.influencerStrategy && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">⭐ Strategia influencerska</h3>
                      <p className="text-sm text-gray-300 mb-3">{data.digital.influencerStrategy.approach}</p>
                      <h4 className="label">Tiery</h4>
                      <ul className="space-y-1 mb-3">
                        {data.digital.influencerStrategy.tiers?.map((t,i) => <li key={i} className="text-xs text-gray-400">→ {t}</li>)}
                      </ul>
                    </div>
                  )}
                  {data.digital.displayAds && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">🎨 Display Ads</h3>
                      <p className="text-sm text-gray-300 mb-2">{data.digital.displayAds.concept}</p>
                      <ul className="space-y-1 mb-2">
                        {data.digital.displayAds.formats?.map((f,i) => <li key={i} className="text-xs text-gray-400">→ {f}</li>)}
                      </ul>
                      <p className="text-sm text-indigo-300 italic">CTA: {data.digital.displayAds.cta}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'social' && data.social && (
                <div className="space-y-4">
                  <div className="card">
                    <p className="text-sm text-gray-300 leading-relaxed italic">{data.social.strategicApproach}</p>
                  </div>
                  {data.social.facebook && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-2">📘 Facebook</h3>
                      <p className="text-sm text-gray-400 mb-3">{data.social.facebook.approach}</p>
                      {data.social.facebook.samplePosts?.map((p,i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-1">{p.type}</p>
                          <p className="text-sm text-gray-200 mb-2">{p.text}</p>
                          <p className="text-xs text-gray-500 mb-3">📷 {p.visualIdea}</p>
                          <ImageGenerator key={`fb-${i}`} initialPrompt={p.visualIdea} platform="facebook" size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                  {data.social.instagram && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-2">📷 Instagram</h3>
                      <p className="text-sm text-gray-400 mb-3">{data.social.instagram.approach}</p>
                      {data.social.instagram.samplePosts?.map((p,i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-1">{p.type}</p>
                          <p className="text-sm text-gray-300 italic mb-1">{p.concept}</p>
                          <p className="text-sm text-gray-200 mb-2">{p.caption}</p>
                          <p className="text-xs text-gray-500 mb-3">📷 {p.visualIdea}</p>
                          <ImageGenerator key={`ig-${i}`} initialPrompt={p.visualIdea} platform="instagram" size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                  {data.social.tiktok && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-2">🎵 TikTok</h3>
                      <p className="text-sm text-gray-400 mb-3">{data.social.tiktok.approach}</p>
                      <ul className="space-y-1 mb-3">
                        {data.social.tiktok.contentIdeas?.map((c,i) => <li key={i} className="text-sm text-gray-300">→ {c}</li>)}
                      </ul>
                      {data.social.tiktok.challenges && <p className="text-sm text-indigo-300 italic">🔥 Challenge: {data.social.tiktok.challenges}</p>}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activations' && data.activations && (
                <div className="space-y-4">
                  {data.activations.experiential && data.activations.experiential.length > 0 && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">🎪 Aktywacje doświadczeniowe</h3>
                      {data.activations.experiential.map((a,i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 mb-2">
                          <p className="text-sm font-semibold text-white mb-1">{a.name}</p>
                          <p className="text-xs text-gray-400 mb-2">{a.description}</p>
                          <div className="flex gap-4 text-[10px] text-gray-500">
                            <span>🎯 {a.objective}</span>
                            <span>📊 {a.scale}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.activations.guerrilla && data.activations.guerrilla.length > 0 && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">⚡ Guerrilla / Niestandardowe</h3>
                      {data.activations.guerrilla.map((g,i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 mb-2">
                          <p className="text-sm font-semibold text-white mb-1">{g.name}</p>
                          <p className="text-xs text-gray-400 mb-1">{g.description}</p>
                          <p className="text-xs text-emerald-400 italic">💡 {g.rationale}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.activations.partnerships && data.activations.partnerships.length > 0 && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">🤝 Partnerstwa</h3>
                      {data.activations.partnerships.map((p,i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 mb-2">
                          <p className="text-sm font-semibold text-white mb-1">{p.partner}</p>
                          <p className="text-xs text-gray-400 mb-1">{p.concept}</p>
                          <p className="text-xs text-indigo-400">🎁 {p.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.activations.pr && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">📰 PR</h3>
                      <h4 className="label">Angles</h4>
                      <ul className="space-y-1 mb-3">
                        {data.activations.pr.angles?.map((a,i) => <li key={i} className="text-sm text-gray-300">→ {a}</li>)}
                      </ul>
                      {data.activations.pr.events && <p className="text-sm text-gray-400">{data.activations.pr.events}</p>}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'execution' && data.execution && (
                <div className="space-y-4">
                  <div className="card">
                    <h3 className="text-base font-semibold text-white mb-3">📅 Fazy kampanii</h3>
                    <div className="space-y-3">
                      {data.execution.phases?.map((p,i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5">
                          <p className="text-sm font-semibold text-indigo-300 mb-2">{p.phase}</p>
                          <p className="text-sm text-gray-300 mb-2">{p.objectives}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {p.channels?.map((c,j) => (
                              <span key={j} className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(99,102,241,0.1)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.2)'}}>{c}</span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">🎯 {p.kpi}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {data.execution.budgetSplit && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">💰 Podział budżetu</h3>
                      {Object.entries(data.execution.budgetSplit).map(([k,v]) => (
                        <div key={k} className="py-2 border-b border-white/5 last:border-0">
                          <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{k}</p>
                          <p className="text-sm text-gray-300">{v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.execution.risks && data.execution.risks.length > 0 && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">⚠️ Ryzyka i mitygacja</h3>
                      {data.execution.risks.map((r,i) => (
                        <div key={i} className="py-2 border-b border-white/5 last:border-0">
                          <p className="text-sm text-amber-300 mb-1">⚠️ {r.risk}</p>
                          <p className="text-xs text-gray-400">→ {r.mitigation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.execution.nextSteps && (
                    <div className="card">
                      <h3 className="text-base font-semibold text-white mb-3">▶️ Następne kroki</h3>
                      <ul className="space-y-2">
                        {data.execution.nextSteps.map((s,i) => (
                          <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-indigo-400 font-semibold">{i+1}.</span>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {history.length > 1 && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <h3 className="label mb-3">📚 Historia opracowań</h3>
                <div className="space-y-2">
                  {history.slice(1).map((h,i) => (
                    <button key={i} onClick={() => { setData(h.data); setActiveTab('analysis') }}
                      className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                      <p className="text-sm text-white font-medium">{h.title}</p>
                      <p className="text-xs text-gray-500">{h.subtitle} · {new Date(h.createdAt).toLocaleDateString('pl')}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
