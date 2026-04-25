'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useStore } from '@/lib/store'

const ImageEditor = dynamic(() => import('./ImageEditor'), { ssr: false })

type ImageProvider = 'gemini' | 'dalle'

interface ImageIteration {
  url: string
  prompt: string
  revisionNote?: string
  createdAt: string
}

interface Props {
  initialPrompt: string
  platform?: string
  brandingPromptSuffix?: string
  size?: 'sm' | 'md' | 'lg'
  showProviderToggle?: boolean
}

function Spinner() {
  return (
    <span className="inline-flex gap-0.5">
      {[0,1,2].map(i => (
        <span key={i} className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}
    </span>
  )
}

export default function ImageGenerator({
  initialPrompt,
  platform = 'facebook',
  brandingPromptSuffix = '',
  size = 'md',
  showProviderToggle = true,
}: Props) {
  const { dna } = useStore()
  const visuals = dna?.visuals
  const [provider, setProvider] = useState<ImageProvider>('gemini')
  const [generating, setGenerating] = useState(false)
  const [iterations, setIterations] = useState<ImageIteration[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [error, setError] = useState('')
  const [showRevise, setShowRevise] = useState(false)
  const [revisionText, setRevisionText] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editedUrl, setEditedUrl] = useState<string | null>(null)

  const heightClass = size === 'sm' ? 'max-h-48' : size === 'lg' ? 'max-h-96' : 'max-h-64'
  const providerLabel = provider === 'dalle' ? 'DALL-E 3' : 'Nano Banana'
  const activeIteration = iterations[activeIdx]
  const displayUrl = editedUrl || activeIteration?.url

  async function generate(revision?: string) {
    setGenerating(true)
    setError('')
    try {
      const fullPrompt = initialPrompt + brandingPromptSuffix
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, platform, provider, revision }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const newIter: ImageIteration = {
        url: data.url,
        prompt: data.finalPrompt || fullPrompt,
        revisionNote: revision,
        createdAt: new Date().toISOString(),
      }
      setIterations(prev => {
        const next = [...prev, newIter]
        setActiveIdx(next.length - 1)
        setEditedUrl(null)
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setGenerating(false)
    }
  }

  function handleRevise() {
    if (!revisionText.trim()) return
    generate(revisionText.trim())
    setShowRevise(false)
    setRevisionText('')
  }

  async function handleDownload() {
    if (!displayUrl) return
    try {
      const response = await fetch(displayUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      const suffix = editedUrl ? '-edytowana' : ''
      a.download = `grafika-${platform}${suffix}-${ts}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      window.open(displayUrl, '_blank')
    }
  }

  return (
    <div className="space-y-2">
      {!activeIteration ? (
        <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center">
          {showProviderToggle && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <button onClick={() => setProvider('gemini')}
                className="text-[10px] px-2 py-1 rounded-md transition-all"
                style={{
                  background: provider === 'gemini' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  border: provider === 'gemini' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: provider === 'gemini' ? '#a5b4fc' : '#9ca3af',
                }}>
                🍌 Nano Banana
              </button>
              <button onClick={() => setProvider('dalle')}
                className="text-[10px] px-2 py-1 rounded-md transition-all"
                style={{
                  background: provider === 'dalle' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  border: provider === 'dalle' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: provider === 'dalle' ? '#a5b4fc' : '#9ca3af',
                }}>
                🎨 DALL-E 3
              </button>
            </div>
          )}
          <button onClick={() => generate()} disabled={generating}
            className="text-xs py-2 px-4 rounded-lg transition-all disabled:opacity-50"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            {generating ? <><Spinner /> Generuję...</> : `🎨 Wygeneruj grafikę (${providerLabel})`}
          </button>
        </div>
      ) : (
        <>
          <div className="relative rounded-xl overflow-hidden border border-white/6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayUrl} alt="Generated" className={`w-full object-cover ${heightClass}`} />
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-gray-300 text-[10px] px-2 py-1 rounded-lg border border-white/10">
              {editedUrl ? (
                <span className="text-emerald-400 font-medium">✏️ Edytowana</span>
              ) : (
                <>
                  {providerLabel}
                  {iterations.length > 1 && (
                    <span className="ml-1.5 font-semibold text-indigo-400">v{activeIdx + 1}/{iterations.length}</span>
                  )}
                </>
              )}
            </div>
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button onClick={handleDownload}
                className="bg-black/60 backdrop-blur text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-white/10 hover:bg-black/80 transition-all"
                title="Pobierz na komputer">
                ⬇
              </button>
              <a href={displayUrl} target="_blank" rel="noopener noreferrer"
                className="bg-black/60 backdrop-blur text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-white/10 hover:bg-black/80"
                title="Otwórz w nowej karcie">
                ↗
              </a>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={handleDownload}
              className="text-xs py-2 px-3 rounded-lg transition-all"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}
              title="Pobierz na komputer">
              ⬇ Pobierz
            </button>
            <button onClick={() => setShowEditor(true)}
              className="text-xs py-2 px-3 rounded-lg transition-all"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
              title="Dodaj logo / tekst / edytuj">
              ✏️ Edytuj
            </button>
            {editedUrl && (
              <button onClick={() => setEditedUrl(null)}
                className="text-xs py-2 px-2 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                title="Cofnij edycje">
                ↺
              </button>
            )}
            <button onClick={() => setShowRevise(true)} disabled={generating}
              className="flex-1 text-xs py-2 rounded-lg transition-all disabled:opacity-50"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
              ✨ Popraw
            </button>
            <button onClick={() => generate()} disabled={generating}
              className="flex-1 text-xs py-2 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50">
              {generating ? <><Spinner /></> : '🔄 Regeneruj'}
            </button>
          </div>

          {iterations.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {iterations.map((it, i) => (
                <button key={i} onClick={() => { setActiveIdx(i); setEditedUrl(null) }}
                  className="relative shrink-0 rounded-md overflow-hidden transition-all"
                  style={{
                    border: activeIdx === i ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.08)',
                    opacity: activeIdx === i ? 1 : 0.6,
                  }}
                  title={it.revisionNote || 'Oryginał'}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt={`v${i+1}`} className="w-12 h-12 object-cover" />
                </button>
              ))}
            </div>
          )}

          {showRevise && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70" onClick={() => setShowRevise(false)}>
              <div className="rounded-2xl max-w-lg w-full p-6"
                style={{ background: '#0f1423', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-white mb-3">✨ Co chcesz zmienić?</h3>
                <textarea value={revisionText} onChange={e => setRevisionText(e.target.value)}
                  placeholder='np. zmień tło na pastelowy róż, dodaj więcej kwiatów'
                  rows={4} autoFocus
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none" />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowRevise(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 bg-white/5 border border-white/10">Anuluj</button>
                  <button onClick={handleRevise} disabled={!revisionText.trim()}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-30" style={{ background: '#6366f1', color: 'white' }}>
                    ✨ Wygeneruj nową wersję
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {showEditor && displayUrl && (
        <ImageEditor
          imageUrl={displayUrl}
          visuals={visuals}
          onSave={(dataUrl) => {
            setEditedUrl(dataUrl)
            setShowEditor(false)
          }}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
