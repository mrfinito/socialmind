'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import { historyLoad, historySave } from '@/lib/history'
import type { HistoryEntry } from '@/lib/history'
import ImageGenerator from '@/components/ImageGenerator'

interface Slide {
  id: string
  type: 'title' | 'section' | 'content' | 'stats' | 'quote' | 'comparison' | 'cta'
  title: string
  subtitle?: string
  content?: string[]
  speakerNotes?: string
  imageIdea?: string
  imageUrl?: string
  imagePlacement?: 'side' | 'background' | 'full'
}

interface Presentation {
  title: string
  subtitle?: string
  totalSlides: number
  slides: Slide[]
}

const STYLES = [
  { id: 'biznesowy', label: '💼 Biznesowy', desc: 'Profesjonalny, korporacyjny' },
  { id: 'kreatywny', label: '🎨 Kreatywny', desc: 'Bold, wizualny, inspirujący' },
  { id: 'edukacyjny', label: '🎓 Edukacyjny', desc: 'Szkoleniowy, krok po kroku' },
  { id: 'pitch', label: '🚀 Pitch', desc: 'Inwestorski, zwięzły, mocny' },
  { id: 'raport', label: '📊 Raport', desc: 'Dane, statystyki, wnioski' },
  { id: 'storytelling', label: '📖 Storytelling', desc: 'Narracyjny, emocjonalny' },
]

const SLIDE_TYPE_ICONS: Record<string, string> = {
  title: '🎬', section: '📑', content: '📝', stats: '📊',
  quote: '💬', comparison: '⚖️', cta: '🎯',
}

export default function PrezentacjaPage() {
  const { dna, activeProject } = useStore()
  const projectId = activeProject?.id || 'default'
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [slidesCount, setSlidesCount] = useState(10)
  const [style, setStyle] = useState('biznesowy')
  const [additionalContext, setAdditionalContext] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [sourceFileName, setSourceFileName] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState<Presentation | null>(null)
  const [resultReady, setResultReady] = useState(false)
  const resultRef = useRef<Presentation | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [history, setHistory] = useState<HistoryEntry<Presentation>[]>([])
  const [editInstruction, setEditInstruction] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editAction, setEditAction] = useState<'add' | 'modify-slide' | 'modify'>('add')
  const [translating, setTranslating] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function copyToClipboard(text: string, fieldId: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldId)
      setTimeout(() => setCopiedField(null), 1500)
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      setCopiedField(fieldId)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }

  async function translatePresentation(targetLang: 'en' | 'pl') {
    if (!data) return
    if (!confirm(targetLang === 'en'
      ? 'Przetłumaczyć całą prezentację na angielski? Wszystkie tytuły, treści i speaker notes zostaną podmienione.'
      : 'Przetłumaczyć całą prezentację na polski?')) return
    setTranslating(true)
    try {
      const res = await fetch('/api/prezentacja-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentation: data, targetLang })
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error || 'Błąd tłumaczenia')
      setData(j.data)
      resultRef.current = j.data
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Błąd tłumaczenia')
    } finally {
      setTranslating(false)
    }
  }

  useEffect(() => {
    setHistory(historyLoad<Presentation>('prezentacja', projectId))
  }, [projectId])

  async function handleFile(file: File) {
    setFileLoading(true)
    setError('')
    setSourceFileName(file.name)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/extract-text', { method: 'POST', body: fd })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setSourceText(j.text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
      setSourceFileName('')
    } finally {
      setFileLoading(false)
    }
  }

  async function generate() {
    if (topic.trim().length < 5) { setError('Wpisz temat prezentacji'); return }
    setLoading(true); setError(''); setStreamText('')
    setData(null); setResultReady(false); resultRef.current = null

    try {
      const res = await fetch('/api/prezentacja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, slidesCount, style, additionalContext, sourceText, dna }),
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
          let parsed: { chunk?: string; done?: boolean; data?: Presentation; error?: string } | null = null
          try { parsed = JSON.parse(jsonStr) } catch { continue }
          if (!parsed) continue
          if (parsed.chunk) setStreamText(prev => (prev + parsed!.chunk).slice(-300))
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.done && parsed.data) {
            resultRef.current = parsed.data
            setStreamText('')
            setResultReady(true)
            try {
              const entry = historySave<Presentation>('prezentacja', projectId, {
                title: parsed.data.title,
                subtitle: `${parsed.data.slides?.length || 0} slajdów · ${style}`,
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
      setLoading(false); setStreamText('')
    }
  }

  function showResult() {
    if (resultRef.current) {
      setData(resultRef.current)
      setActiveSlide(0)
      setResultReady(false)
    }
  }

  async function exportPPTX() {
    if (!data) return
    setExporting(true)
    try {
      const res = await fetch('/api/prezentacja-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentation: data }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      // Download as blob
      const byteChars = atob(j.base64)
      const byteArr = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
      const blob = new Blob([byteArr], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = j.filename || 'prezentacja.pptx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Błąd eksportu')
    } finally {
      setExporting(false)
    }
  }

  function updateSlideImage(slideIdx: number, imageUrl: string) {
    setData(prev => {
      if (!prev) return prev
      const slides = [...prev.slides]
      const current = slides[slideIdx]
      slides[slideIdx] = {
        ...current,
        imageUrl,
        // Default placement when first generating: title/section → full bg, others → side
        imagePlacement: current.imagePlacement || (current.type === 'title' || current.type === 'section' ? 'background' : 'side'),
      }
      const updated = { ...prev, slides }
      resultRef.current = updated
      return updated
    })
  }

  function updateSlide(slideIdx: number, patch: Partial<Slide>) {
    setData(prev => {
      if (!prev) return prev
      const slides = [...prev.slides]
      slides[slideIdx] = { ...slides[slideIdx], ...patch }
      return { ...prev, slides }
    })
  }

  function deleteSlide(idx: number) {
    if (!data || data.slides.length <= 1) return
    if (!confirm(`Usunąć slajd ${idx+1}: "${data.slides[idx].title}"?`)) return
    setData(prev => {
      if (!prev) return prev
      const slides = prev.slides.filter((_, i) => i !== idx)
      return { ...prev, slides }
    })
    if (activeSlide >= idx && activeSlide > 0) setActiveSlide(activeSlide - 1)
  }

  function moveSlide(idx: number, direction: 'up' | 'down') {
    setData(prev => {
      if (!prev) return prev
      const slides = [...prev.slides]
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= slides.length) return prev
      ;[slides[idx], slides[targetIdx]] = [slides[targetIdx], slides[idx]]
      return { ...prev, slides }
    })
    setActiveSlide(direction === 'up' ? Math.max(0, idx - 1) : Math.min((data?.slides.length || 1) - 1, idx + 1))
  }

  function duplicateSlide(idx: number) {
    setData(prev => {
      if (!prev) return prev
      const orig = prev.slides[idx]
      const copy: Slide = { ...orig, id: `${orig.id}-copy-${Date.now()}`, title: orig.title + ' (kopia)' }
      const slides = [...prev.slides.slice(0, idx + 1), copy, ...prev.slides.slice(idx + 1)]
      return { ...prev, slides }
    })
    setActiveSlide(idx + 1)
  }

  function addBlankSlide(afterIdx?: number) {
    if (!data) return
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      type: 'content',
      title: 'Nowy slajd',
      content: ['Punkt pierwszy', 'Punkt drugi'],
      speakerNotes: '',
    }
    const insertAt = typeof afterIdx === 'number' ? afterIdx + 1 : data.slides.length
    setData(prev => {
      if (!prev) return prev
      const slides = [...prev.slides.slice(0, insertAt), newSlide, ...prev.slides.slice(insertAt)]
      return { ...prev, slides }
    })
    setActiveSlide(insertAt)
  }

  async function aiEdit() {
    if (!data || !editInstruction.trim()) return
    setEditLoading(true); setEditError('')
    try {
      const res = await fetch('/api/prezentacja-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: editInstruction,
          action: editAction,
          presentation: data,
          slideIndex: editAction === 'modify-slide' ? activeSlide : undefined,
        })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)

      // Apply changes
      if (editAction === 'add' && j.slides) {
        setData(prev => {
          if (!prev) return prev
          const newSlides = (j.slides as Array<Slide & { insertAfterIndex?: number }>).map((s, i) => ({
            ...s,
            id: `slide-ai-${Date.now()}-${i}`,
          }))
          let slides = [...prev.slides]
          // Sort additions by insertAfterIndex (insert from end)
          const sorted = [...newSlides].sort((a, b) => 
            (b.insertAfterIndex ?? slides.length) - (a.insertAfterIndex ?? slides.length)
          )
          for (const s of sorted) {
            const insertIdx = (s.insertAfterIndex ?? slides.length - 1) + 1
            slides = [...slides.slice(0, insertIdx), s, ...slides.slice(insertIdx)]
          }
          return { ...prev, slides }
        })
      } else if (editAction === 'modify-slide' && j.slide) {
        updateSlide(activeSlide, j.slide)
      } else if (editAction === 'modify' && j.modifications) {
        setData(prev => {
          if (!prev) return prev
          const slides = [...prev.slides]
          for (const mod of j.modifications as Array<{ slideIndex: number; changes: Partial<Slide> }>) {
            if (slides[mod.slideIndex]) {
              slides[mod.slideIndex] = { ...slides[mod.slideIndex], ...mod.changes }
            }
          }
          return { ...prev, slides }
        })
      }
      setEditInstruction('')
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setEditLoading(false)
    }
  }

  function reset() {
    setData(null); setTopic(''); setAdditionalContext('')
    setSourceText(''); setSourceFileName(''); setError(''); setActiveSlide(0)
  }

  const slide = data?.slides?.[activeSlide]

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">🎤 Generator prezentacji</h1>
            <p className="text-gray-500 text-sm mt-1">
              AI tworzy spójne slajdy z Twojego tematu lub wgranego materiału. Eksport do PPTX, edycja, generowanie grafik per slajd.
            </p>
          </div>
          {data && <button onClick={reset} className="btn-ghost text-sm">+ Nowa prezentacja</button>}
        </div>

        {history.length > 0 && !data && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📚 Ostatnie prezentacje ({history.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {history.slice(0, 6).map(h => (
                <button key={h.id} onClick={() => { setData(h.data); resultRef.current = h.data; setActiveSlide(0) }}
                  className="text-left p-3 rounded-xl transition-all hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-semibold text-white mb-1 line-clamp-2">{h.title}</p>
                  {h.subtitle && <p className="text-[11px] text-indigo-400 mb-1">{h.subtitle}</p>}
                  <p className="text-[10px] text-gray-600">{new Date(h.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!data && (
          <div className="space-y-5">
            <div className="card">
              <label className="label">📌 Temat prezentacji *</label>
              <input className="input" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="np. Strategia content marketingowa Q1 2026" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <label className="label">👥 Grupa docelowa</label>
                <input className="input" value={audience} onChange={e => setAudience(e.target.value)}
                  placeholder="np. Zarząd firmy, klient agencyjny, zespół" />
              </div>
              <div className="card">
                <label className="label">📑 Liczba slajdów</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={3} max={30} value={slidesCount}
                    onChange={e => setSlidesCount(parseInt(e.target.value))} className="flex-1" />
                  <span className="text-base font-semibold text-white w-10">{slidesCount}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <label className="label">🎨 Styl prezentacji</label>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className="text-left p-3 rounded-lg transition-all"
                    style={{
                      background: style === s.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      border: style === s.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    <p className="text-sm font-medium" style={{color: style === s.id ? '#a5b4fc' : '#e5e7eb'}}>{s.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="label">📎 Źródłowy materiał (opcjonalnie)</label>
              <p className="text-xs text-gray-500 mb-2">Wgraj brief, raport, artykuł, notatki — AI użyje ich jako podstawy treści</p>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <div onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-indigo-500/50"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                {fileLoading ? <p className="text-sm text-gray-400">Przetwarzanie...</p>
                  : sourceFileName ? (
                    <div>
                      <p className="text-2xl mb-1">✅</p>
                      <p className="text-sm text-white font-medium">{sourceFileName}</p>
                      <p className="text-[11px] text-gray-500 mt-1">{(sourceText.length/1000).toFixed(1)}k znaków · kliknij żeby zmienić</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl mb-1">📎</p>
                      <p className="text-sm text-gray-400">Przeciągnij plik lub kliknij (PDF, DOCX, TXT)</p>
                    </div>
                  )}
              </div>
            </div>

            <div className="card">
              <label className="label">💡 Dodatkowe wytyczne (opcjonalnie)</label>
              <textarea className="input" rows={3} value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                placeholder="np. Skup się na wzroście Q4, koniecznie wspomnij case study X, ton bardziej luźny niż formalny..." />
            </div>

            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}

            {loading && streamText && (
              <div className="p-3 rounded-xl text-xs font-mono text-indigo-300/60 overflow-hidden"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-[10px] text-indigo-400 mb-1">Generowanie slajdów w toku...</p>
                <p className="truncate">{streamText}</p>
              </div>
            )}

            {resultReady && (
              <div className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span className="text-2xl">✅</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Prezentacja gotowa!</p>
                  <p className="text-xs text-gray-500">{resultRef.current?.slides?.length} slajdów · {resultRef.current?.title}</p>
                </div>
                <button onClick={showResult} className="btn-primary px-6">Pokaż prezentację →</button>
              </div>
            )}

            <button onClick={generate} disabled={loading || topic.length < 5}
              className="btn-primary w-full py-4 text-base disabled:opacity-30">
              {loading ? '✦ Tworzę prezentację...' : '✦ Wygeneruj prezentację'}
            </button>
          </div>
        )}

        {data && slide && (
          <div className="grid grid-cols-[280px_1fr] gap-4">
            {/* Slide list */}
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="card mb-2">
                <p className="text-xs font-semibold text-white">{data.title}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{data.slides.length} slajdów</p>
                <button onClick={exportPPTX} disabled={exporting}
                  className="w-full mt-3 text-xs py-2 rounded-lg transition-all"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
                  {exporting ? '⏳ Generuję PPTX...' : '⬇ Pobierz PPTX'}
                </button>

                {/* Translation buttons */}
                <div className="grid grid-cols-2 gap-1 mt-2">
                  <button onClick={() => translatePresentation('en')} disabled={translating || exporting}
                    className="text-[11px] py-1.5 rounded-lg transition-all disabled:opacity-50"
                    style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                    {translating ? '⏳ Tłumaczę...' : '🇬🇧 EN'}
                  </button>
                  <button onClick={() => translatePresentation('pl')} disabled={translating || exporting}
                    className="text-[11px] py-1.5 rounded-lg transition-all disabled:opacity-50"
                    style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                    {translating ? '⏳' : '🇵🇱 PL'}
                  </button>
                </div>
              </div>

              {/* AI Edit panel */}
              <div className="card mb-2" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-xs font-semibold text-indigo-300 mb-2">🤖 Dopytaj AI</p>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  <button onClick={() => setEditAction('add')}
                    className="text-[10px] py-1.5 rounded"
                    style={{
                      background: editAction === 'add' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                      color: editAction === 'add' ? '#a5b4fc' : '#9ca3af',
                    }}>+ Dodaj</button>
                  <button onClick={() => setEditAction('modify-slide')}
                    className="text-[10px] py-1.5 rounded"
                    style={{
                      background: editAction === 'modify-slide' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                      color: editAction === 'modify-slide' ? '#a5b4fc' : '#9ca3af',
                    }}>✏️ Ten slajd</button>
                  <button onClick={() => setEditAction('modify')}
                    className="text-[10px] py-1.5 rounded"
                    style={{
                      background: editAction === 'modify' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                      color: editAction === 'modify' ? '#a5b4fc' : '#9ca3af',
                    }}>🌐 Wszystkie</button>
                </div>
                <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)}
                  placeholder={
                    editAction === 'add' ? 'np. dodaj slajd o ROI z naszych kampanii' :
                    editAction === 'modify-slide' ? 'np. skróć ten slajd, dodaj statystyki, zmień ton' :
                    'np. zmień ton wszystkich slajdów na bardziej luźny'
                  }
                  rows={3}
                  className="w-full px-2 py-2 rounded text-xs bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none mb-2" />
                <button onClick={aiEdit} disabled={editLoading || !editInstruction.trim()}
                  className="w-full text-xs py-2 rounded-lg transition-all disabled:opacity-30"
                  style={{ background: '#6366f1', color: 'white' }}>
                  {editLoading ? '⏳ AI pracuje...' : '✦ Zastosuj'}
                </button>
                {editError && <p className="text-[10px] text-red-400 mt-2">{editError}</p>}
              </div>

              <button onClick={() => addBlankSlide()}
                className="w-full text-xs py-2 rounded-lg mb-2 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: '#9ca3af' }}>
                + Dodaj pusty slajd na końcu
              </button>
              {data.slides.map((s, i) => (
                <button key={s.id} onClick={() => setActiveSlide(i)}
                  className="w-full text-left p-3 rounded-lg transition-all"
                  style={{
                    background: activeSlide === i ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                    border: activeSlide === i ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-gray-500 w-4">{i+1}</span>
                    <span className="text-sm">{SLIDE_TYPE_ICONS[s.type] || '📝'}</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-600">{s.type}</span>
                  </div>
                  <p className="text-xs text-white line-clamp-2 ml-6">{s.title}</p>
                </button>
              ))}
            </div>

            {/* Slide editor */}
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="text-xs uppercase tracking-wider text-gray-500">{slide.type} · slajd {activeSlide+1}/{data.slides.length}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setActiveSlide(s => Math.max(0, s-1))} disabled={activeSlide === 0}
                      title="Poprzedni"
                      className="btn-ghost text-xs px-2 py-1 disabled:opacity-30">←</button>
                    <button onClick={() => setActiveSlide(s => Math.min(data.slides.length-1, s+1))} disabled={activeSlide === data.slides.length-1}
                      title="Następny"
                      className="btn-ghost text-xs px-2 py-1 disabled:opacity-30">→</button>
                    <div className="w-px bg-white/10 mx-1"></div>
                    <button onClick={() => moveSlide(activeSlide, 'up')} disabled={activeSlide === 0}
                      title="Przesuń w górę"
                      className="btn-ghost text-xs px-2 py-1 disabled:opacity-30">↑</button>
                    <button onClick={() => moveSlide(activeSlide, 'down')} disabled={activeSlide === data.slides.length-1}
                      title="Przesuń w dół"
                      className="btn-ghost text-xs px-2 py-1 disabled:opacity-30">↓</button>
                    <div className="w-px bg-white/10 mx-1"></div>
                    <button onClick={() => duplicateSlide(activeSlide)}
                      title="Duplikuj slajd"
                      className="btn-ghost text-xs px-2 py-1">⧉</button>
                    <button onClick={() => addBlankSlide(activeSlide)}
                      title="Dodaj pusty slajd"
                      className="btn-ghost text-xs px-2 py-1">+</button>
                    <button onClick={() => deleteSlide(activeSlide)} disabled={data.slides.length <= 1}
                      title="Usuń slajd"
                      className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10 disabled:opacity-30">🗑</button>
                  </div>
                </div>

                <label className="label">Typ slajdu</label>
                <select className="input mb-3" value={slide.type}
                  onChange={e => updateSlide(activeSlide, { type: e.target.value as Slide['type'] })}>
                  <option value="title">🎬 Title (otwierający)</option>
                  <option value="section">📑 Section (przejście sekcji)</option>
                  <option value="content">📝 Content (bullety)</option>
                  <option value="stats">📊 Stats (dane liczbowe)</option>
                  <option value="quote">💬 Quote (cytat)</option>
                  <option value="comparison">⚖️ Comparison (porównanie)</option>
                  <option value="cta">🎯 CTA (call to action)</option>
                </select>

                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Tytuł slajdu</label>
                  <CopyBtn text={slide.title} fieldId={`title-${slide.id}`}
                    copiedField={copiedField} onCopy={copyToClipboard} />
                </div>
                <input className="input mb-3" value={slide.title}
                  onChange={e => updateSlide(activeSlide, { title: e.target.value })} />

                {(slide.type === 'title' || slide.type === 'section') && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <label className="label !mb-0">Podtytuł</label>
                      <CopyBtn text={slide.subtitle || ''} fieldId={`sub-${slide.id}`}
                        copiedField={copiedField} onCopy={copyToClipboard} />
                    </div>
                    <input className="input mb-3" value={slide.subtitle || ''}
                      onChange={e => updateSlide(activeSlide, { subtitle: e.target.value })} />
                  </>
                )}

                {slide.content && slide.content.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <label className="label !mb-0">Treść (każda linia = osobny punkt)</label>
                      <CopyBtn text={slide.content.join('\n')} fieldId={`content-${slide.id}`}
                        copiedField={copiedField} onCopy={copyToClipboard} />
                    </div>
                    <textarea className="input mb-3" rows={Math.max(3, slide.content.length)}
                      value={slide.content.join('\n')}
                      onChange={e => updateSlide(activeSlide, { content: e.target.value.split('\n').filter(l => l.trim()) })} />
                  </>
                )}

                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">📝 Speaker notes (co prelegent powie)</label>
                  <CopyBtn text={slide.speakerNotes || ''} fieldId={`notes-${slide.id}`}
                    copiedField={copiedField} onCopy={copyToClipboard} />
                </div>
                <textarea className="input" rows={3} value={slide.speakerNotes || ''}
                  onChange={e => updateSlide(activeSlide, { speakerNotes: e.target.value })} />
              </div>

              {/* Image generator for this slide */}
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <label className="label !mb-0">🖼️ Grafika slajdu</label>
                  {slide.imageUrl && (
                    <button onClick={() => updateSlide(activeSlide, { imageUrl: undefined })}
                      className="text-[10px] text-red-400 hover:text-red-300">
                      🗑 Usuń grafikę
                    </button>
                  )}
                </div>

                {/* Image idea — editable */}
                <textarea className="input mb-3" rows={2}
                  placeholder="Opisz jaka grafika ma być na tym slajdzie..."
                  value={slide.imageIdea || ''}
                  onChange={e => updateSlide(activeSlide, { imageIdea: e.target.value })} />

                {/* Placement selector — only when image exists */}
                {slide.imageUrl && (
                  <div className="mb-3">
                    <label className="label">Sposób umieszczenia grafiki w PPTX</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'side', label: '📐 Z boku', desc: 'Po prawej + tekst po lewej' },
                        { id: 'background', label: '🌅 Tło', desc: 'Pełne tło z nakładką tekstu' },
                        { id: 'full', label: '🖼️ Pełny slajd', desc: 'Cała grafika bez tekstu' },
                      ] as const).map(opt => {
                        const isActive = (slide.imagePlacement || 'side') === opt.id
                        return (
                          <button key={opt.id} type="button"
                            onClick={() => updateSlide(activeSlide, { imagePlacement: opt.id })}
                            className="text-left p-2.5 rounded-lg transition-all"
                            style={{
                              background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                              border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            }}>
                            <p className="text-xs font-semibold text-white mb-0.5">{opt.label}</p>
                            <p className="text-[10px] text-gray-500">{opt.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {slide.imageIdea && (
                  <ImageGenerator
                    key={`${slide.id}-img`}
                    initialPrompt={slide.imageIdea}
                    platform="facebook"
                    size="md"
                    onImageGenerated={(d) => updateSlideImage(activeSlide, d.url)}
                  />
                )}
              </div>

              {/* Live slide preview */}
              <div className="card">
                <p className="text-xs text-gray-500 mb-3">Podgląd slajdu</p>
                <div className="rounded-xl p-8 aspect-video relative overflow-hidden flex"
                  style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <SlidePreview slide={slide} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function CopyBtn({ text, fieldId, copiedField, onCopy }: {
  text: string
  fieldId: string
  copiedField: string | null
  onCopy: (text: string, fieldId: string) => void
}) {
  const isCopied = copiedField === fieldId
  if (!text || !text.trim()) return null
  return (
    <button type="button" onClick={() => onCopy(text, fieldId)}
      className="text-[10px] px-2 py-0.5 rounded transition-all"
      style={{
        background: isCopied ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.10)',
        color: isCopied ? '#6ee7b7' : '#a5b4fc',
        border: '1px solid rgba(99,102,241,0.20)',
      }}
      title="Skopiuj do schowka">
      {isCopied ? '✓ Skopiowane' : '📋 Kopiuj'}
    </button>
  )
}

function SlidePreview({ slide }: { slide: Slide }) {
  const hasImage = slide.imageUrl
  
  if (slide.type === 'title') {
    return (
      <div className="flex flex-col items-center justify-center w-full text-center">
        <h1 className="text-4xl font-bold text-white mb-3">{slide.title}</h1>
        {slide.subtitle && <p className="text-lg text-indigo-400">{slide.subtitle}</p>}
        <div className="w-12 h-0.5 bg-indigo-500 mt-6" />
      </div>
    )
  }
  if (slide.type === 'section') {
    return (
      <div className="flex flex-col justify-center w-full">
        <h1 className="text-5xl font-bold text-indigo-400">{slide.title}</h1>
        {slide.subtitle && <p className="text-base text-white mt-3">{slide.subtitle}</p>}
      </div>
    )
  }
  if (slide.type === 'quote') {
    return (
      <div className="flex flex-col items-center justify-center w-full text-center">
        <p className="text-2xl italic text-white mb-3" style={{ fontFamily: 'Georgia' }}>&ldquo;{slide.content?.[0] || slide.title}&rdquo;</p>
        {slide.content?.[1] && <p className="text-sm text-indigo-400">— {slide.content[1]}</p>}
      </div>
    )
  }
  if (slide.type === 'stats') {
    const stats = slide.content || []
    return (
      <div className="w-full flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4">{slide.title}</h2>
        <div className={`grid gap-4 flex-1 ${stats.length <= 2 ? 'grid-cols-2' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {stats.map((s, i) => {
            const [num, ...desc] = s.split(':')
            return (
              <div key={i} className="text-center flex flex-col justify-center">
                <p className="text-3xl font-bold text-indigo-400">{num.trim()}</p>
                {desc.length > 0 && <p className="text-xs text-white mt-1">{desc.join(':').trim()}</p>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  if (slide.type === 'comparison') {
    const items = slide.content || []
    const left = items.filter((_,i) => i % 2 === 0)
    const right = items.filter((_,i) => i % 2 === 1)
    return (
      <div className="w-full flex flex-col">
        <h2 className="text-lg font-bold text-white mb-3 text-center">{slide.title}</h2>
        <div className="grid grid-cols-2 gap-4 flex-1">
          <div className="border-r border-indigo-500/40 pr-3 space-y-2">
            {left.map((l, i) => <p key={i} className="text-xs text-white">{l}</p>)}
          </div>
          <div className="space-y-2">
            {right.map((r, i) => <p key={i} className="text-xs text-white">{r}</p>)}
          </div>
        </div>
      </div>
    )
  }
  if (slide.type === 'cta') {
    return (
      <div className="flex flex-col items-center justify-center w-full text-center">
        <h1 className="text-3xl font-bold text-indigo-400 mb-4">{slide.title}</h1>
        {slide.content && <p className="text-base text-white">{slide.content.join(' · ')}</p>}
      </div>
    )
  }
  // content (default)
  return (
    <div className="w-full flex gap-4">
      <div className={hasImage ? 'flex-1' : 'w-full'}>
        <h2 className="text-xl font-bold text-white mb-3">{slide.title}</h2>
        <ul className="space-y-2">
          {slide.content?.map((c, i) => (
            <li key={i} className="text-sm text-white flex gap-2"><span className="text-indigo-400">•</span>{c}</li>
          ))}
        </ul>
      </div>
      {hasImage && (
        <div className="w-2/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
        </div>
      )}
    </div>
  )
}
