'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import ImageGenerator from '@/components/ImageGenerator'

interface HistoryImage {
  url: string
  prompt: string
  platform: string
  provider: string
  idea: string
  createdAt: string
}

const HISTORY_KEY = 'sm:grafika:history'
const MAX_HISTORY = 20

function loadHistory(): HistoryImage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

function saveHistory(items: HistoryImage[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)))
  } catch {}
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram (1:1)', dim: '1024×1024' },
  { id: 'facebook', label: 'Facebook (16:9)', dim: '1792×1024' },
  { id: 'tiktok', label: 'TikTok / Story (9:16)', dim: '1024×1792' },
  { id: 'pinterest', label: 'Pinterest (2:3)', dim: '1024×1792' },
  { id: 'linkedin', label: 'LinkedIn (16:9)', dim: '1792×1024' },
]

const STYLE_PRESETS = [
  { id: 'photo', label: '📸 Fotografia', value: 'commercial photography, professional lighting, sharp focus' },
  { id: 'minimal', label: '✨ Minimalizm', value: 'minimalist composition, clean background, lots of negative space' },
  { id: 'illustration', label: '🎨 Ilustracja', value: 'modern flat illustration, vibrant colors, simple shapes' },
  { id: '3d', label: '🧊 3D Render', value: '3D render, isometric view, soft shadows, modern aesthetic' },
  { id: 'cinematic', label: '🎬 Kinematograficzny', value: 'cinematic lighting, dramatic atmosphere, film grain, moody' },
  { id: 'lifestyle', label: '🌿 Lifestyle', value: 'lifestyle photography, natural lighting, candid moment, warm tones' },
]

const MOOD_PRESETS = [
  { id: 'warm',     label: '☀️ Ciepły',      value: 'warm tones, golden hour, cozy atmosphere' },
  { id: 'cold',     label: '❄️ Chłodny',     value: 'cool tones, blue palette, clean atmosphere' },
  { id: 'energetic',label: '⚡ Energetyczny', value: 'dynamic, vibrant colors, bold contrast, motion' },
  { id: 'calm',     label: '🌊 Spokojny',    value: 'serene, soft pastels, peaceful, balanced composition' },
  { id: 'luxurious',label: '💎 Luksusowy',   value: 'luxurious, premium feel, rich textures, elegant' },
  { id: 'playful',  label: '🎉 Zabawny',     value: 'playful, colorful, fun atmosphere, optimistic' },
]

export default function GrafikaPage() {
  const [idea, setIdea] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<string>('')
  const [selectedMood, setSelectedMood] = useState<string>('')
  const [platform, setPlatform] = useState('instagram')
  const [refining, setRefining] = useState(false)
  const [refinedPrompt, setRefinedPrompt] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryImage[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  function addToHistory(img: { url: string; prompt: string; platform: string; provider: string }) {
    const newItem: HistoryImage = {
      ...img,
      idea: idea || 'Bez opisu',
      createdAt: new Date().toISOString(),
    }
    setHistory(prev => {
      const next = [newItem, ...prev].slice(0, MAX_HISTORY)
      saveHistory(next)
      return next
    })
  }

  function loadFromHistory(item: HistoryImage) {
    setIdea(item.idea)
    setRefinedPrompt(item.prompt)
    setPlatform(item.platform)
    setShowHistory(false)
  }

  function clearHistory() {
    if (!confirm('Usunąć całą historię grafik?')) return
    setHistory([])
    saveHistory([])
  }

  async function handleDownloadHistory(item: HistoryImage) {
    try {
      const res = await fetch(item.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      const ts = new Date(item.createdAt).toISOString().slice(0, 19).replace(/[:T]/g, '-')
      a.download = `grafika-${item.platform}-${ts}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      window.open(item.url, '_blank')
    }
  }

  async function refinePrompt() {
    if (idea.trim().length < 5) {
      setError('Wpisz pomysł na grafikę (minimum 5 znaków)')
      return
    }
    setRefining(true)
    setError('')
    setRefinedPrompt('')
    try {
      const style = STYLE_PRESETS.find(s => s.id === selectedStyle)?.value
      const mood = MOOD_PRESETS.find(m => m.id === selectedMood)?.value
      const res = await fetch('/api/refine-image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, style, mood }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRefinedPrompt(data.prompt)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setRefining(false)
    }
  }

  function reset() {
    setIdea('')
    setRefinedPrompt('')
    setSelectedStyle('')
    setSelectedMood('')
    setError('')
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">🖼️ Stwórz grafikę</h1>
            <p className="text-gray-500 text-sm mt-1">
              Wpisz swój pomysł — AI przekształci go w profesjonalny prompt i wygeneruje grafikę. Wybierz styl, nastrój i format.
            </p>
          </div>
          {history.length > 0 && (
            <button onClick={() => setShowHistory(s => !s)}
              className="text-xs py-2 px-4 rounded-lg transition-all whitespace-nowrap"
              style={{
                background: showHistory ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                border: showHistory ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: showHistory ? '#a5b4fc' : '#9ca3af',
              }}>
              📚 Ostatnio stworzone ({history.length})
            </button>
          )}
        </div>

        {showHistory ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">Twoje ostatnie {history.length} {history.length === 1 ? 'grafika' : history.length < 5 ? 'grafiki' : 'grafik'}</p>
              <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300">🗑 Wyczyść historię</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {history.map((item, i) => (
                <div key={i} className="rounded-xl overflow-hidden transition-all hover:border-indigo-500/40"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.idea} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button onClick={() => handleDownloadHistory(item)}
                        className="text-xs py-2 px-3 rounded-lg backdrop-blur"
                        style={{ background: 'rgba(16,185,129,0.85)', color: 'white' }}>⬇ Pobierz</button>
                      <button onClick={() => loadFromHistory(item)}
                        className="text-xs py-2 px-3 rounded-lg backdrop-blur"
                        style={{ background: 'rgba(99,102,241,0.85)', color: 'white' }}>↻ Wczytaj</button>
                    </div>
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded backdrop-blur"
                      style={{ background: 'rgba(0,0,0,0.6)', color: '#d1d5db' }}>
                      {item.platform}
                    </span>
                    <span className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded backdrop-blur"
                      style={{ background: 'rgba(0,0,0,0.6)', color: '#a5b4fc' }}>
                      {item.provider === 'gemini' ? '🍌' : '🎨'}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed mb-1">{item.idea}</p>
                    <p className="text-[10px] text-gray-600">{new Date(item.createdAt).toLocaleString('pl', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Inputs */}
          <div className="space-y-5">
            <div className="card">
              <label className="label">💡 Twój pomysł</label>
              <textarea value={idea} onChange={e => setIdea(e.target.value)}
                placeholder="np. dziecko bawiące się klockami w słonecznym pokoju, mama uśmiecha się w tle"
                rows={4} className="input w-full resize-none" />
              <p className="text-[10px] text-gray-600 mt-1">{idea.length}/500 znaków</p>
            </div>

            <div className="card">
              <label className="label">🎨 Styl wizualny (opcjonalnie)</label>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_PRESETS.map(s => (
                  <button key={s.id} onClick={() => setSelectedStyle(s.id === selectedStyle ? '' : s.id)}
                    className="text-xs py-2 px-2 rounded-lg transition-all"
                    style={{
                      background: selectedStyle === s.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                      border: selectedStyle === s.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: selectedStyle === s.id ? '#a5b4fc' : '#9ca3af',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="label">🌈 Nastrój (opcjonalnie)</label>
              <div className="grid grid-cols-3 gap-2">
                {MOOD_PRESETS.map(m => (
                  <button key={m.id} onClick={() => setSelectedMood(m.id === selectedMood ? '' : m.id)}
                    className="text-xs py-2 px-2 rounded-lg transition-all"
                    style={{
                      background: selectedMood === m.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                      border: selectedMood === m.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: selectedMood === m.id ? '#a5b4fc' : '#9ca3af',
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="label">📐 Format / Platforma</label>
              <div className="space-y-1.5">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all flex justify-between items-center"
                    style={{
                      background: platform === p.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      border: platform === p.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      color: platform === p.id ? '#a5b4fc' : '#9ca3af',
                    }}>
                    <span className="text-sm">{p.label}</span>
                    <span className="text-[10px] text-gray-600">{p.dim}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="card bg-red-500/5 border-red-500/20 text-red-300 text-sm">{error}</div>}

            <div className="flex gap-2">
              <button onClick={refinePrompt} disabled={refining || idea.length < 5}
                className="btn-primary flex-1 py-3 disabled:opacity-30">
                {refining ? '✦ Tworzę prompt...' : '✦ Stwórz prompt i wygeneruj'}
              </button>
              {(idea || refinedPrompt) && (
                <button onClick={reset} className="btn-ghost px-4">🗑</button>
              )}
            </div>
          </div>

          {/* Right: Output */}
          <div className="space-y-5">
            {refinedPrompt ? (
              <>
                <div className="card">
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">🤖 Prompt wygenerowany przez AI</label>
                    <button onClick={() => navigator.clipboard.writeText(refinedPrompt)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300">📋 Kopiuj</button>
                  </div>
                  <p className="text-xs font-mono text-gray-300 leading-relaxed bg-white/5 p-3 rounded-lg">{refinedPrompt}</p>
                  <p className="text-[10px] text-gray-600 mt-2">Możesz teraz wygenerować grafikę poniżej, lub skopiować prompt do Midjourney/Leonardo.</p>
                </div>

                <div className="card">
                  <label className="label">🖼️ Wygenerowana grafika</label>
                  <ImageGenerator
                    key={`${refinedPrompt.slice(0,30)}-${platform}`}
                    initialPrompt={refinedPrompt}
                    platform={platform}
                    size="lg"
                    showProviderToggle={true}
                    onImageGenerated={addToHistory}
                  />
                </div>
              </>
            ) : (
              <div className="card text-center py-16">
                <p className="text-5xl mb-4">🖼️</p>
                <p className="text-gray-400 mb-1">Wpisz pomysł i kliknij &ldquo;Stwórz prompt&rdquo;</p>
                <p className="text-xs text-gray-600">AI zoptymalizuje opis, a Ty wygenerujesz grafikę</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </AppShell>
  )
}
