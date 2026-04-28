'use client'
import { useState, useRef } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'

interface Visual {
  title: string
  purpose: string
  description: string
  imagePrompt: string
  format: string
  platform: string
  // Generated state
  generatedImage?: string
  generating?: boolean
  imageError?: string
}

interface EventConcept {
  name: string
  tagline: string
  summary: string
  rationale: string
  keyMessages: string[]
  atmosphere: string
  uniqueElements: string[]
}

interface EventData {
  concept: EventConcept
  visuals: Visual[]
  executionNotes: string[]
}

const EVENT_TYPES = [
  { id: 'conference', label: 'Konferencja / kongres', icon: '🎤' },
  { id: 'launch',     label: 'Premiera produktu',     icon: '🚀' },
  { id: 'festival',   label: 'Festiwal / koncert',    icon: '🎵' },
  { id: 'open_day',   label: 'Open day / dzień otwarty', icon: '🚪' },
  { id: 'fair',       label: 'Targi / wystawa',       icon: '🏛️' },
  { id: 'contest',    label: 'Konkurs / promocja',    icon: '🎁' },
  { id: 'webinar',    label: 'Webinar online',        icon: '💻' },
  { id: 'workshop',   label: 'Workshop / szkolenie',  icon: '🛠️' },
  { id: 'charity',    label: 'Charytatywny',          icon: '💝' },
  { id: 'other',      label: 'Inne',                  icon: '✨' },
]

export default function EventyPage() {
  const { dna } = useStore()

  // Form
  const [eventType, setEventType] = useState<string>('conference')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [audience, setAudience] = useState('')
  const [goals, setGoals] = useState('')
  const [briefText, setBriefText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generation state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [streamProgress, setStreamProgress] = useState('')
  const [data, setData] = useState<EventData | null>(null)

  async function handleFile(file: File) {
    setFileLoading(true)
    setError('')
    setFileName(file.name)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/extract-text', { method: 'POST', body: fd })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error || 'Nie udało się odczytać pliku')
      setBriefText(prev => {
        if (prev.trim()) return prev + '\n\n' + j.text
        return j.text
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd przy odczycie pliku')
      setFileName('')
    } finally {
      setFileLoading(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  async function generate() {
    if (!briefText.trim() || briefText.trim().length < 20) {
      setError('Brief musi mieć co najmniej 20 znaków - opisz event lub wgraj plik z briefem.')
      return
    }
    setLoading(true)
    setError('')
    setStreamProgress('')
    setData(null)

    try {
      const res = await fetch('/api/eventy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType, eventName, eventDate, eventLocation,
          audience, goals, brief: briefText,
          sourceFile: fileName || undefined,
          dna: dna || undefined,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        try {
          const errJson = JSON.parse(errText)
          throw new Error(errJson.error || `HTTP ${res.status}`)
        } catch {
          throw new Error(errText.slice(0, 200) || `HTTP ${res.status}`)
        }
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Brak streamu')
      const decoder = new TextDecoder()
      let buffer = ''
      let lastProgressUpdate = Date.now()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6)
          let parsedLine: { chunk?: string; done?: boolean; data?: EventData; error?: string } | null = null
          try { parsedLine = JSON.parse(jsonStr) } catch { continue }
          if (!parsedLine) continue

          if (parsedLine.error) {
            throw new Error(parsedLine.error)
          }
          if (parsedLine.chunk) {
            // Throttle UI updates
            if (Date.now() - lastProgressUpdate > 200) {
              setStreamProgress(prev => prev + parsedLine!.chunk)
              lastProgressUpdate = Date.now()
            }
          }
          if (parsedLine.done && parsedLine.data) {
            setData(parsedLine.data)
            setStreamProgress('')
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd generowania')
    } finally {
      setLoading(false)
    }
  }

  async function generateImage(visualIdx: number) {
    if (!data) return
    const visual = data.visuals[visualIdx]
    if (!visual) return

    setData(prev => prev ? {
      ...prev,
      visuals: prev.visuals.map((v, i) => i === visualIdx ? { ...v, generating: true, imageError: undefined } : v),
    } : prev)

    try {
      // Map format string to platform key (which generate-image uses for aspect ratio)
      const fmt = (visual.format || '').toLowerCase()
      let platform = 'instagram'  // default 1:1
      if (fmt.includes('9:16') || fmt.includes('story') || fmt.includes('tiktok') || fmt.includes('reel')) platform = 'tiktok'
      else if (fmt.includes('16:9') || fmt.includes('banner') || fmt.includes('cover') || fmt.includes('billboard')) platform = 'facebook'
      else if (fmt.includes('2:3') || fmt.includes('pin')) platform = 'pinterest'

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: visual.imagePrompt,
          platform,
          provider: 'gemini',
        }),
      })
      const j = await res.json()
      if (!j.ok || !j.url) throw new Error(j.error || 'Nie udało się wygenerować grafiki')

      setData(prev => prev ? {
        ...prev,
        visuals: prev.visuals.map((v, i) => i === visualIdx ? { ...v, generatedImage: j.url, generating: false } : v),
      } : prev)
    } catch (e) {
      setData(prev => prev ? {
        ...prev,
        visuals: prev.visuals.map((v, i) => i === visualIdx ? { ...v, generating: false, imageError: e instanceof Error ? e.message : 'Błąd' } : v),
      } : prev)
    }
  }

  function downloadImage(image: string, title: string) {
    const a = document.createElement('a')
    a.href = image
    a.download = `event-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  function reset() {
    setData(null)
    setStreamProgress('')
    setError('')
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              🎪 Eventy
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold"
                style={{ background:'rgba(168,85,247,0.2)', color:'#c084fc' }}>NEW</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Wgraj brief eventu lub opisz pomysł — AI przygotuje koncept kreatywny + propozycje grafik
            </p>
          </div>
          {data && (
            <button onClick={reset} className="btn-ghost text-sm shrink-0">← Nowy event</button>
          )}
        </div>

        {!data && (
          <div className="space-y-5">
            {/* Event type */}
            <div className="card">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Typ wydarzenia
              </p>
              <div className="grid grid-cols-5 gap-2">
                {EVENT_TYPES.map(t => (
                  <button key={t.id} onClick={() => setEventType(t.id)}
                    className="px-3 py-3 rounded-xl text-xs transition-all flex flex-col items-center gap-1.5"
                    style={{
                      background: eventType === t.id ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${eventType === t.id ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      color: eventType === t.id ? '#c084fc' : '#9ca3af',
                    }}>
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-center leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick details (optional) */}
            <div className="card">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Szczegóły wydarzenia <span className="text-gray-700 normal-case">(opcjonalne)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nazwa eventu</label>
                  <input type="text" className="input"
                    placeholder="np. Tech Summit 2026"
                    value={eventName} onChange={e => setEventName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Data</label>
                  <input type="text" className="input"
                    placeholder="np. 15-17 października 2026"
                    value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Lokalizacja</label>
                  <input type="text" className="input"
                    placeholder="np. EXPO XXI, Warszawa"
                    value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
                </div>
                <div>
                  <label className="label">Grupa docelowa</label>
                  <input type="text" className="input"
                    placeholder="np. CTO i tech leaderzy z firm 50+ os."
                    value={audience} onChange={e => setAudience(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">Cele biznesowe</label>
                  <input type="text" className="input"
                    placeholder="np. 500 uczestników, 30 leadów B2B, brand awareness w branży"
                    value={goals} onChange={e => setGoals(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Brief area */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Brief eventu
                </p>
                <span className="text-xs text-gray-700">{briefText.length} znaków</span>
              </div>

              {/* File upload */}
              <div
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                className="rounded-xl px-4 py-3 mb-3 cursor-pointer transition-all hover:border-purple-500/50"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.15)',
                }}
                onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={onFileChange}/>
                {fileLoading ? (
                  <p className="text-sm text-gray-400 text-center">📄 Czytam plik...</p>
                ) : fileName ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📎</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{fileName}</p>
                      <p className="text-[11px] text-emerald-400">✓ Treść wczytana — możesz edytować poniżej</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setFileName(''); setBriefText('') }}
                      className="text-xs text-gray-500 hover:text-gray-300">✕ Usuń</button>
                  </div>
                ) : (
                  <div className="text-center py-1">
                    <p className="text-sm text-gray-400">📄 Przeciągnij plik tutaj lub kliknij aby wybrać</p>
                    <p className="text-[11px] text-gray-600 mt-1">PDF · DOCX · TXT — opcjonalne</p>
                  </div>
                )}
              </div>

              <textarea
                className="input w-full"
                rows={8}
                placeholder="Opisz event swoimi słowami albo edytuj treść wgranego pliku.&#10;&#10;Im więcej szczegółów (cele, target, charakter, budżet) — tym lepszy będzie koncept.&#10;&#10;Możesz też zostawić puste i tylko wgrać plik z briefem."
                value={briefText} onChange={e => setBriefText(e.target.value)} />
              <p className="text-[11px] text-gray-700 mt-2">
                Min. 20 znaków · Im bogatszy brief, tym bardziej szczegółowa propozycja
              </p>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#fca5a5' }}>
                ⚠ {error}
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading || briefText.trim().length < 20}
              className="btn-primary w-full py-3.5 disabled:opacity-30">
              {loading ? '⚡ Generuję koncept eventu...' : '✨ Wygeneruj propozycję'}
            </button>

            {streamProgress && (
              <div className="card">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300/70 mb-2">AI pracuje...</p>
                <pre className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                  {streamProgress.slice(-1500)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* RESULT */}
        {data && (
          <div className="space-y-6">
            {/* Concept hero */}
            <div className="rounded-2xl p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.08))',
                border: '1px solid rgba(168,85,247,0.25)',
              }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300/70 mb-1">Koncept kreatywny</p>
              <h2 className="text-3xl font-bold text-white mb-2">{data.concept.name}</h2>
              <p className="text-base italic text-purple-200 mb-4">&ldquo;{data.concept.tagline}&rdquo;</p>
              <p className="text-sm text-gray-300 leading-relaxed">{data.concept.summary}</p>

              <button
                onClick={() => copyText(`${data.concept.name}\n${data.concept.tagline}\n\n${data.concept.summary}`)}
                className="mt-4 text-[11px] px-3 py-1.5 rounded-lg transition-all"
                style={{ background:'rgba(255,255,255,0.05)', color:'#a5b4fc' }}>
                📋 Kopiuj koncept
              </button>
            </div>

            {/* Why this concept */}
            <div className="card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/70 mb-2">Dlaczego ten pomysł zadziała</p>
              <p className="text-sm text-gray-300 leading-relaxed">{data.concept.rationale}</p>
            </div>

            {/* Key messages + atmosphere - 2 cols */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/70 mb-3">Główne komunikaty</p>
                <ul className="space-y-2">
                  {data.concept.keyMessages.map((msg, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300 leading-relaxed">
                      <span className="text-purple-400 shrink-0">▸</span>
                      <span>{msg}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/70 mb-3">Atmosfera i nastrój</p>
                <p className="text-sm text-gray-300 leading-relaxed">{data.concept.atmosphere}</p>
              </div>
            </div>

            {/* Unique elements */}
            <div className="card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/70 mb-3">Elementy wyróżniające</p>
              <div className="space-y-2">
                {data.concept.uniqueElements.map((el, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg"
                    style={{ background:'rgba(251,191,36,0.05)' }}>
                    <span className="text-amber-400 text-base">★</span>
                    <p className="text-sm text-gray-200">{el}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Visuals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">
                  🎨 Propozycje grafik <span className="text-sm font-normal text-gray-500">({data.visuals.length})</span>
                </h3>
                <p className="text-[11px] text-gray-600">Wybierz które chcesz wygenerować</p>
              </div>

              <div className="space-y-4">
                {data.visuals.map((v, i) => (
                  <div key={i} className="card">
                    <div className="flex gap-4">
                      {/* Image / placeholder */}
                      <div className="w-48 h-48 shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                        style={{
                          background: v.generatedImage ? 'transparent' : 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                        {v.generatedImage ? (
                          <img src={v.generatedImage} alt={v.title} className="w-full h-full object-cover"/>
                        ) : v.generating ? (
                          <div className="text-center">
                            <p className="text-2xl mb-2">⚡</p>
                            <p className="text-[11px] text-gray-500">Generuję...</p>
                          </div>
                        ) : (
                          <div className="text-center px-2">
                            <p className="text-3xl mb-2">🎨</p>
                            <p className="text-[10px] text-gray-600">{v.format}</p>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-base font-semibold text-white">{v.title}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded shrink-0"
                            style={{ background:'rgba(168,85,247,0.15)', color:'#c084fc' }}>
                            {v.format}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{v.purpose}</p>
                        <p className="text-sm text-gray-300 mb-3 leading-relaxed">{v.description}</p>

                        <div className="mb-3 px-3 py-2 rounded-lg"
                          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-[10px] text-gray-600 mb-1">Image prompt (EN):</p>
                          <p className="text-[11px] text-gray-400 font-mono leading-relaxed">{v.imagePrompt}</p>
                        </div>

                        <p className="text-[11px] text-gray-600 mb-3">📍 {v.platform}</p>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {!v.generatedImage && (
                            <button
                              onClick={() => generateImage(i)}
                              disabled={v.generating}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
                              style={{ background:'#a855f7', color:'white' }}>
                              {v.generating ? '⚡ Generuję...' : '✨ Wygeneruj grafikę'}
                            </button>
                          )}
                          {v.generatedImage && (
                            <>
                              <button
                                onClick={() => generateImage(i)}
                                disabled={v.generating}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
                                style={{ background:'rgba(168,85,247,0.15)', color:'#c084fc' }}>
                                ↻ Wygeneruj inną
                              </button>
                              <button
                                onClick={() => downloadImage(v.generatedImage!, v.title)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                style={{ background:'rgba(16,185,129,0.15)', color:'#10b981' }}>
                                ⬇ Pobierz
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => copyText(v.imagePrompt)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background:'rgba(255,255,255,0.04)', color:'#9ca3af' }}>
                            📋 Kopiuj prompt
                          </button>
                        </div>

                        {v.imageError && (
                          <p className="text-[11px] text-red-400 mt-2">⚠ {v.imageError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Execution notes */}
            {data.executionNotes && data.executionNotes.length > 0 && (
              <div className="card" style={{ background:'rgba(99,102,241,0.05)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/70 mb-3">
                  💡 Wskazówki wykonawcze
                </p>
                <ul className="space-y-1.5">
                  {data.executionNotes.map((note, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-indigo-400">▸</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
