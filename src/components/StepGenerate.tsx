'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { BrandDNA, GeneratedContent, GeneratedPost, Platform, BrandingOptions } from '@/lib/types'
import { PLATFORMS } from '@/lib/types'
import PlatformIcon from './PlatformIcon'

const ImageEditor = dynamic(() => import('./ImageEditor'), { ssr: false })

interface Props {
  dna: BrandDNA
  platforms: Platform[]
  topic: string
  goals: string[]
  tones: string[]
  onComplete: (content: GeneratedContent) => void
  onBack: () => void
  initialContent?: GeneratedContent | null
  onContentChange?: (c: GeneratedContent | null) => void
}

type ImageProvider = 'gemini' | 'dalle'

function Spinner() {
  return (
    <span className="inline-flex gap-0.5">
      {[0,1,2].map(i => (
        <span key={i} className="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-70"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  )
}

const DEFAULT_BRANDING: BrandingOptions = {
  addLogoOverlay: false,
  addTextOverlay: false,
  overlayText: '',
  overlayTextPosition: 'bottom',
  overlayTextColor: '#ffffff',
  overlayFontSize: 48,
}

function PostCard({
  platform, post, dna, onGenerateImage, generatingImage, imageProvider,
  onEditImage, onReviseImage, onSwitchIteration,
}: {
  platform: typeof PLATFORMS[0]
  post: GeneratedPost
  dna: BrandDNA
  onGenerateImage: () => void
  generatingImage: boolean
  imageProvider: ImageProvider
  onEditImage: () => void
  onReviseImage: (instruction: string) => void
  onSwitchIteration: (idx: number) => void
}) {
  const [copied, setCopied] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [showReviseModal, setShowReviseModal] = useState(false)
  const [revisionText, setRevisionText] = useState('')

  async function handleDownload() {
    if (!displayImage) return
    try {
      const response = await fetch(displayImage)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      a.download = `${platform.id}-${ts}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      window.open(displayImage, '_blank')
    }
  }

  function copy(text: string, setCb: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setCb(true)
    setTimeout(() => setCb(false), 1500)
  }

  const displayImage = post.editedImageUrl || post.generatedImageUrl
  const providerLabel = imageProvider === 'dalle' ? 'DALL-E 3' : 'Nano Banana'

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-white/6">
        <PlatformIcon platform={platform.id} size={32} />
        <div>
          <span className="font-semibold text-white text-sm">{platform.name}</span>
          <span className="text-gray-400 text-xs ml-2">{platform.format} · {platform.dimensions}</span>
        </div>
      </div>

      {/* Image */}
      <div>
        <label className="label">Grafika</label>
        {displayImage ? (
          <div>
            <div className="relative rounded-xl overflow-hidden border border-white/6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayImage} alt="Generated" className="w-full object-cover max-h-72" />
              {post.editedImageUrl && (
                <div className="absolute top-2 left-2 bg-indigo-500/100 text-white text-[10px] px-2 py-1 rounded-lg font-medium">
                  Z brandingiem
                </div>
              )}
              {!post.editedImageUrl && (
                <div className="absolute top-2 left-2 bg-white/8/90 text-gray-500 text-[10px] px-2 py-1 rounded-lg border border-white/10">
                  {providerLabel}
                  {post.imageIterations && post.imageIterations.length > 1 && (
                    <span className="ml-1.5 font-semibold text-indigo-400">
                      v{(post.activeIterationIdx ?? post.imageIterations.length - 1) + 1}/{post.imageIterations.length}
                    </span>
                  )}
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button onClick={onEditImage}
                  className="bg-white/8/90 text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/8 transition-all">
                  ✏️ Edytuj
                </button>
                <button onClick={handleDownload}
                  className="bg-white/8/90 text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/8 transition-all"
                  title="Pobierz">
                  ⬇
                </button>
                <a href={displayImage} target="_blank" rel="noopener noreferrer"
                  className="bg-white/8/90 text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/8 transition-all"
                  title="Otwórz">
                  ↗
                </a>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-2">
              <button onClick={handleDownload}
                className="text-xs py-2 px-3 rounded-lg transition-all"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
                ⬇ Pobierz
              </button>
              <button onClick={() => setShowReviseModal(true)} disabled={generatingImage}
                className="flex-1 text-xs py-2 px-3 rounded-lg border transition-all disabled:opacity-50"
                style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                ✨ Popraw grafikę
              </button>
              <button onClick={onGenerateImage} disabled={generatingImage}
                className="flex-1 text-xs py-2 px-3 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 transition-all disabled:opacity-50">
                {generatingImage ? <><Spinner /> Generuje...</> : '🔄 Wygeneruj ponownie'}
              </button>
            </div>

            {/* Iteration thumbnails */}
            {post.imageIterations && post.imageIterations.length > 1 && (
              <div className="mt-3">
                <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Wersje ({post.imageIterations.length})</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {post.imageIterations.map((it, idx) => {
                    const isActive = (post.activeIterationIdx ?? post.imageIterations!.length - 1) === idx
                    return (
                      <button key={idx} onClick={() => onSwitchIteration(idx)}
                        className="relative shrink-0 rounded-lg overflow-hidden transition-all"
                        style={{
                          border: isActive ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.08)',
                          opacity: isActive ? 1 : 0.6,
                        }}
                        title={it.revisionNote || 'Oryginał'}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.url} alt={`v${idx + 1}`} className="w-16 h-16 object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 text-[9px] font-semibold text-white px-1 py-0.5 text-center"
                          style={{ background: 'rgba(0,0,0,0.6)' }}>
                          v{idx + 1}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Revise modal */}
            {showReviseModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70" onClick={() => setShowReviseModal(false)}>
                <div className="rounded-2xl max-w-lg w-full p-6"
                  style={{ background: '#0f1423', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={e => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-indigo-400 font-medium mb-1">✨ Popraw grafikę</p>
                      <h3 className="text-lg font-semibold text-white">Co chcesz zmienić?</h3>
                    </div>
                    <button onClick={() => setShowReviseModal(false)} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Napisz co chcesz zmienić. AI przerobi prompt zachowując główny koncept.
                    Np: &quot;dodaj kota w tle&quot;, &quot;zmień tło na niebieskie&quot;, &quot;więcej ciepłego światła&quot;, &quot;uprość kompozycję&quot;.
                  </p>
                  <textarea
                    value={revisionText}
                    onChange={e => setRevisionText(e.target.value)}
                    placeholder="np. zmień tło na pastelowy róż, dodaj więcej kwiatów"
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setShowReviseModal(false)}
                      className="px-4 py-2 rounded-lg text-sm text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                      Anuluj
                    </button>
                    <button onClick={() => {
                        if (!revisionText.trim()) return
                        onReviseImage(revisionText.trim())
                        setShowReviseModal(false)
                        setRevisionText('')
                      }}
                      disabled={!revisionText.trim()}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-30 transition-all"
                      style={{ background: '#6366f1', color: 'white' }}>
                      ✨ Wygeneruj nową wersję
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-white/10 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400 mb-3">
              {platform.dimensions} · lub uzyj promptu ponizej w Midjourney
            </p>
            <button className="btn-secondary text-xs py-2" onClick={onGenerateImage} disabled={generatingImage}>
              {generatingImage ? <><Spinner /> Generuje przez {providerLabel}...</> : `🎨 Generuj przez ${providerLabel}`}
            </button>
          </div>
        )}
      </div>

      {/* Image prompt */}
      <div>
        <label className="label">Prompt do grafiki</label>
        <div className="relative bg-white/8/3 border border-white/10 rounded-xl p-3 pr-16">
          <p className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">{post.imagePrompt}</p>
          <button onClick={() => copy(post.imagePrompt, setCopiedPrompt)}
            className="absolute top-2.5 right-2.5 text-[11px] bg-white/8 border border-white/10 rounded-lg px-2 py-1 text-gray-500 hover:bg-white/8/3 transition-all">
            {copiedPrompt ? '✓' : 'kopiuj'}
          </button>
        </div>
      </div>

      {/* Post text */}
      <div>
        <label className="label">Tekst posta</label>
        <div className="relative bg-white/8 border border-white/10 rounded-xl p-3 pr-16">
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{post.text}</p>
          <button onClick={() => copy(post.text, setCopied)}
            className="absolute top-2.5 right-2.5 text-[11px] bg-white/8 border border-white/10 rounded-lg px-2 py-1 text-gray-500 hover:bg-white/8/3 transition-all">
            {copied ? '✓' : 'kopiuj'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">{post.text.length} / {platform.maxChars} znakow</p>
      </div>
    </div>
  )
}

export default function StepGenerate({ dna, platforms, topic, goals, tones, onComplete, onBack, initialContent, onContentChange }: Props) {
  const [content, setContent] = useState<GeneratedContent | null>(initialContent || null)
  const [loading, setLoading] = useState(false)
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [imageProvider, setImageProvider] = useState<ImageProvider>('gemini')
  const [branding, setBranding] = useState<BrandingOptions>(DEFAULT_BRANDING)
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)
  const hasGenerated = useRef(!!initialContent)

  // Sync content changes back to parent
  useEffect(() => {
    if (onContentChange) onContentChange(content)
  }, [content, onContentChange])

  useEffect(() => {
    if (!hasGenerated.current) {
      hasGenerated.current = true
      generate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build branding instructions for image prompt
  function buildBrandingPromptSuffix(): string {
    const parts: string[] = []
    const v = dna.visuals

    if (v?.visualStyle) parts.push(`Visual style: ${v.visualStyle}`)
    if (v?.dominantColors?.length) parts.push(`Brand colors: ${v.dominantColors.join(', ')}`)
    if (v?.fontStyle) parts.push(`Typography style: ${v.fontStyle}`)
    if (v?.brandingNotes) parts.push(v.brandingNotes)
    if (branding.addLogoOverlay && v?.logoUrl) parts.push('Leave clean space in corner for logo overlay')
    if (branding.addTextOverlay && branding.overlayText) parts.push(`Leave space for text overlay: "${branding.overlayText}"`)
    if (branding.overlayTextPosition === 'bottom') parts.push('Leave clean bottom area for text')
    if (branding.overlayTextPosition === 'top') parts.push('Leave clean top area for text')

    return parts.length ? '. BRAND GUIDELINES: ' + parts.join('. ') : ''
  }

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPrompt: dna.masterPrompt, platforms, topic, goals, tones }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContent(data.content)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Blad generowania')
    } finally {
      setLoading(false)
    }
  }

  async function generateImage(platform: Platform, revision?: string) {
    if (!content) return
    const post = content[platform] as GeneratedPost | undefined
    if (!post) return
    setGeneratingImages(p => ({ ...p, [platform]: true }))
    try {
      const enhancedPrompt = post.imagePrompt + buildBrandingPromptSuffix()
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt, platform, provider: imageProvider, revision }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const newIteration = {
        url: data.url as string,
        prompt: (data.finalPrompt || enhancedPrompt) as string,
        revisionNote: revision,
        createdAt: new Date().toISOString(),
      }

      setContent(prev => {
        if (!prev) return prev
        const currentPost = prev[platform] as GeneratedPost | undefined
        if (!currentPost) return prev
        const iterations = [...(currentPost.imageIterations || []), newIteration]
        return {
          ...prev,
          [platform]: {
            ...currentPost,
            generatedImageUrl: data.url,
            editedImageUrl: undefined, // reset edits when new image generated
            imageIterations: iterations,
            activeIterationIdx: iterations.length - 1,
          }
        }
      })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Blad generowania obrazka')
    } finally {
      setGeneratingImages(p => ({ ...p, [platform]: false }))
    }
  }

  function switchIteration(platform: Platform, idx: number) {
    setContent(prev => {
      if (!prev) return prev
      const post = prev[platform] as GeneratedPost | undefined
      if (!post?.imageIterations?.[idx]) return prev
      return {
        ...prev,
        [platform]: {
          ...post,
          generatedImageUrl: post.imageIterations[idx].url,
          editedImageUrl: undefined,
          activeIterationIdx: idx,
        }
      }
    })
  }

  function handleEditorSave(platform: Platform, dataUrl: string) {
    setContent(prev => prev ? { ...prev, [platform]: { ...prev[platform], editedImageUrl: dataUrl } } : prev)
    setEditingPlatform(null)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
          <span className="text-brand-500 text-xl animate-spin">⟳</span>
        </div>
        <div className="text-center">
          <p className="font-medium text-white">Generuje tresci...</p>
          <p className="text-gray-400 text-sm mt-1">Claude tworzy posty dopasowane do Brand DNA</p>
        </div>
        <div className="flex gap-1 mt-2">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="w-2 h-2 bg-brand-200 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="card text-center py-10">
          <p className="text-red-500 font-medium">Blad: {error}</p>
          <button className="btn-primary mt-4" onClick={generate}>Sprobuj ponownie</button>
        </div>
        <button className="btn-secondary" onClick={onBack}>← Wstecz</button>
      </div>
    )
  }

  if (!content) return null

  const platformConfigs = PLATFORMS.filter(p => platforms.includes(p.id))
  const editingPost = editingPlatform ? content[editingPlatform] as GeneratedPost | undefined : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Wygenerowane posty</h2>
          <p className="text-gray-500 text-sm mt-1">Generuj grafiki, dodaj branding, edytuj w edytorze</p>
        </div>
        <button className="btn-ghost text-xs" onClick={() => { hasGenerated.current = false; generate() }}>
          ↺ Regeneruj
        </button>
      </div>

      {/* Image provider */}
      <div className="card py-3 px-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">Generator grafik</span>
          <div className="flex items-center gap-1 bg-white/8/6 rounded-xl p-1">
            <button onClick={() => setImageProvider('gemini')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${imageProvider === 'gemini' ? 'bg-white/8 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
              🍌 Nano Banana
            </button>
            <button onClick={() => setImageProvider('dalle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${imageProvider === 'dalle' ? 'bg-white/8 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
              ⬡ DALL-E 3
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {imageProvider === 'gemini' ? 'Nano Banana — szybki, dobry w scenach i produktach' : 'DALL-E 3 — mocny w stylistyce i szczegolach'}
        </p>
      </div>

      {/* Branding options */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🎨</span>
          <h3 className="font-semibold text-white text-sm">Opcje brandingu na grafikach</h3>
        </div>

        {dna.visuals?.brandingNotes && (
          <div className="bg-indigo-500/10 border border-brand-100 rounded-xl px-3 py-2.5 text-xs text-indigo-300">
            <span className="font-medium">Wytyczne graficzne aktywne:</span> {dna.visuals.brandingNotes.slice(0, 120)}...
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="mt-0.5" checked={branding.addLogoOverlay}
              onChange={e => setBranding(p => ({ ...p, addLogoOverlay: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium text-gray-200 group-hover:text-indigo-400">
                Uwzglednij miejsce na logo w prompcie graficznym
              </p>
              <p className="text-xs text-gray-400">AI zostawi wolne miejsce w narozu na nalozone logo</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="mt-0.5" checked={branding.addTextOverlay}
              onChange={e => setBranding(p => ({ ...p, addTextOverlay: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium text-gray-200 group-hover:text-indigo-400">
                Uwzglednij miejsce na tekst nakladany
              </p>
              <p className="text-xs text-gray-400">AI zostawi czysty obszar na tekst ktory dodasz w edytorze</p>
            </div>
          </label>
        </div>

        {branding.addTextOverlay && (
          <div className="space-y-2 pl-6 border-l-2 border-brand-100">
            <div>
              <label className="label">Tekst do nalozenia</label>
              <input className="input text-sm" placeholder="np. Nowosci 2024, -20% tylko dzis, Zapisz sie teraz"
                value={branding.overlayText} onChange={e => setBranding(p => ({ ...p, overlayText: e.target.value }))} />
            </div>
            <div>
              <label className="label">Pozycja tekstu</label>
              <div className="flex gap-2">
                {(['top','center','bottom'] as const).map(pos => (
                  <button key={pos} onClick={() => setBranding(p => ({ ...p, overlayTextPosition: pos }))}
                    className={`tag ${branding.overlayTextPosition === pos ? 'tag-active' : 'tag-inactive'}`}>
                    {pos === 'top' ? '↑ Gora' : pos === 'center' ? '⊙ Srodek' : '↓ Dol'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {dna.visuals?.logoUrl && (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/8/3 rounded-lg px-3 py-2">
            <span>🔷</span>
            <span>Logo wgrane — dostepne w edytorze graficznym kazdego posta</span>
          </div>
        )}
      </div>

      {/* Posts */}
      {platformConfigs.map(p => {
        const post = content[p.id] as GeneratedPost | undefined
        if (!post) return null
        return (
          <PostCard key={p.id} platform={p} post={post} dna={dna}
            onGenerateImage={() => generateImage(p.id)}
            generatingImage={!!generatingImages[p.id]}
            imageProvider={imageProvider}
            onEditImage={() => setEditingPlatform(p.id)}
            onReviseImage={(instruction) => generateImage(p.id, instruction)}
            onSwitchIteration={(idx) => switchIteration(p.id, idx)}
          />
        )
      })}

      <div className="flex justify-between pt-2">
        <button className="btn-secondary" onClick={onBack}>← Wstecz</button>
        <button className="btn-primary px-6 py-3" onClick={() => onComplete(content)}>Eksportuj →</button>
      </div>

      {/* Image Editor Modal */}
      {editingPlatform && editingPost && (editingPost.generatedImageUrl || editingPost.editedImageUrl) && (
        <ImageEditor
          imageUrl={editingPost.editedImageUrl || editingPost.generatedImageUrl!}
          visuals={dna.visuals}
          onSave={(dataUrl) => handleEditorSave(editingPlatform, dataUrl)}
          onClose={() => setEditingPlatform(null)}
        />
      )}
    </div>
  )
}
