'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import type { GeneratedContent, GeneratedPost, Platform } from '@/lib/types'
import { PLATFORMS } from '@/lib/types'

export default function EksportPage() {
  const router = useRouter()
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [cpTexts, setCpTexts] = useState(false)
  const [cpPrompts, setCpPrompts] = useState(false)

  useEffect(() => {
    const c = localStorage.getItem('sm_content')
    const p = localStorage.getItem('sm_platforms')
    if (c) setContent(JSON.parse(c))
    if (p) setPlatforms(JSON.parse(p).platforms || [])
  }, [])

  const activePlatforms = PLATFORMS.filter(p => platforms.includes(p.id))

  function buildTexts() {
    return activePlatforms.map(p => {
      const post = content?.[p.id] as GeneratedPost | undefined
      return post ? `=== ${p.name.toUpperCase()} ===\n${post.text}` : ''
    }).filter(Boolean).join('\n\n')
  }

  function buildPrompts() {
    return activePlatforms.map(p => {
      const post = content?.[p.id] as GeneratedPost | undefined
      return post ? `=== ${p.name.toUpperCase()} (${p.dimensions}) ===\n${post.imagePrompt}` : ''
    }).filter(Boolean).join('\n\n')
  }

  function copy(text: string, setCb: (v:boolean)=>void) {
    navigator.clipboard.writeText(text); setCb(true); setTimeout(()=>setCb(false),1800)
  }

  function download(text: string, name: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    a.download = name; a.click()
  }

  const NEXT_ACTIONS = [
    { label: 'Stwórz warianty A/B', desc: 'Testuj różne wersje postów', icon: '⊹' },
    { label: 'Dostosuj pod kampanię płatną', desc: 'Mocne nagłówki i CTA', icon: '◈' },
    { label: 'Zaplanuj calendar content', desc: 'Plan na miesiąc z datami', icon: '⊟' },
    { label: 'Brief graficzny dla designera', desc: 'E-mail z opisem grafik', icon: '✦' },
  ]

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-2xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-white">Eksport</h1>
            <p className="text-gray-500 text-sm mt-1">Gotowe treści do skopiowania lub pobrania</p>
          </div>
          <button className="btn-secondary text-sm" onClick={() => router.push('/generuj')}>← Wstecz</button>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {activePlatforms.map(p => {
            const post = content?.[p.id] as GeneratedPost | undefined
            return (
              <div key={p.id} className="card-sm text-center py-4">
                <div className="text-2xl mb-1.5">{p.emoji}</div>
                <p className="text-xs font-medium text-gray-400">{p.name}</p>
                <p className="text-[11px] text-gray-600 mt-1">
                  {post ? `${post.text.length} zn.` : '—'}
                  {post?.editedImageUrl ? ' · 🎨' : post?.generatedImageUrl ? ' · 🖼' : ''}
                </p>
              </div>
            )
          })}
        </div>

        <div className="space-y-5">
          {/* Texts */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Teksty postów</label>
              <div className="flex gap-2">
                <button className="btn-ghost text-xs py-1.5" onClick={() => copy(buildTexts(), setCpTexts)}>
                  {cpTexts ? '✓ Skopiowano' : 'Kopiuj'}
                </button>
                <button className="btn-ghost text-xs py-1.5" onClick={() => download(buildTexts(), `posty_${new Date().toISOString().slice(0,10)}.txt`)}>
                  Pobierz .txt
                </button>
              </div>
            </div>
            <textarea readOnly className="input min-h-[160px] resize-y font-mono text-xs text-gray-400" value={buildTexts()} />
          </div>

          {/* Prompts */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Prompty do grafik</label>
              <div className="flex gap-2">
                <button className="btn-ghost text-xs py-1.5" onClick={() => copy(buildPrompts(), setCpPrompts)}>
                  {cpPrompts ? '✓ Skopiowano' : 'Kopiuj'}
                </button>
                <button className="btn-ghost text-xs py-1.5" onClick={() => download(buildPrompts(), `prompty_${new Date().toISOString().slice(0,10)}.txt`)}>
                  Pobierz .txt
                </button>
              </div>
            </div>
            <textarea readOnly className="input min-h-[120px] resize-y font-mono text-xs text-gray-400" value={buildPrompts()} />
          </div>

          {/* Generated images */}
          {activePlatforms.some(p => !!(content?.[p.id] as GeneratedPost | undefined)?.generatedImageUrl) && (
            <div className="card">
              <label className="label mb-4">Wygenerowane grafiki</label>
              <div className="grid grid-cols-2 gap-3">
                {activePlatforms.map(p => {
                  const post = content?.[p.id] as GeneratedPost | undefined
                  const img = post?.editedImageUrl || post?.generatedImageUrl
                  if (!img) return null
                  return (
                    <div key={p.id} className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={p.name} className="w-full object-cover aspect-square" />
                      <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                        <p className="text-white text-xs font-medium">{p.emoji} {p.name}</p>
                        <a href={img} target="_blank" rel="noopener noreferrer" className="text-white/60 text-[10px] hover:text-white/90">Pobierz ↗</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Next actions */}
          <div className="card">
            <label className="label mb-4">Co dalej?</label>
            <div className="grid grid-cols-2 gap-3">
              {NEXT_ACTIONS.map(a => (
                <button key={a.label} className="text-left p-3.5 rounded-xl transition-all group"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}
                  onClick={() => router.push('/generuj')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-indigo-400 text-sm">{a.icon}</span>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">{a.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button className="btn-secondary" onClick={() => router.push('/generuj')}>← Wstecz</button>
            <button className="btn-primary px-8 py-3" onClick={() => {
              localStorage.removeItem('sm_content')
              router.push('/marka')
            }}>✦ Nowy projekt</button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
