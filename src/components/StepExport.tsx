'use client'
import { useState } from 'react'
import type { GeneratedContent, GeneratedPost, Platform } from '@/lib/types'
import { PLATFORMS } from '@/lib/types'
import PlatformIcon from './PlatformIcon'

interface Props {
  content: GeneratedContent
  platforms: Platform[]
  onBack: () => void
  onNewProject: () => void
}

const NEXT_ACTIONS = [
  { icon: '✦', title: 'Stwórz warianty A/B', sub: 'Testuj różne wersje postów', prompt: 'Stwórz warianty A/B dla każdego z tych postów — zmień hook, CTA i styl przy zachowaniu Brand DNA' },
  { icon: '◆', title: 'Dostosuj pod kampanię płatną', sub: 'Mocne nagłówki i CTA', prompt: 'Dostosuj te posty pod kampanię płatną Facebook Ads / Google Ads — dodaj mocne nagłówki, wyraźne CTA i hook w pierwszych 3 sekundach' },
  { icon: '▣', title: 'Zaplanuj calendar content', sub: 'Plan na miesiąc z datami', prompt: 'Zaplanuj calendar content na miesiąc dla tej marki — uwzględnij mix postów z sugestią dat i tematów' },
  { icon: '✧', title: 'Brief graficzny dla designera', sub: 'E-mail z opisem grafik', prompt: 'Na podstawie promptów graficznych napisz profesjonalny brief e-mail do grafika z dokładnym opisem czego potrzebujemy' },
]

export default function StepExport({ content, platforms, onBack, onNewProject }: Props) {
  const [copiedTexts, setCopiedTexts] = useState(false)
  const [copiedPrompts, setCopiedPrompts] = useState(false)
  const [copiedAction, setCopiedAction] = useState<number | null>(null)

  const activePlatforms = PLATFORMS.filter(p => platforms.includes(p.id))

  function buildTexts() {
    return activePlatforms.map(p => {
      const post = content[p.id] as GeneratedPost | undefined
      if (!post) return ''
      return `=== ${p.name.toUpperCase()} ===\n${post.text}`
    }).filter(Boolean).join('\n\n')
  }

  function buildPrompts() {
    return activePlatforms.map(p => {
      const post = content[p.id] as GeneratedPost | undefined
      if (!post) return ''
      return `=== ${p.name.toUpperCase()} (${p.dimensions}) ===\n${post.imagePrompt}`
    }).filter(Boolean).join('\n\n')
  }

  function copy(text: string, setCb: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setCb(true)
    setTimeout(() => setCb(false), 1800)
  }

  function downloadTxt(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function copyAction(i: number, prompt: string) {
    navigator.clipboard.writeText(prompt)
    setCopiedAction(i)
    setTimeout(() => setCopiedAction(null), 1800)
  }

  const textsOutput = buildTexts()
  const promptsOutput = buildPrompts()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Eksport</h2>
        <p className="text-gray-500 text-sm mt-1">Gotowe treści do skopiowania lub pobrania</p>
      </div>

      {/* Platform summary */}
      <div className="grid grid-cols-3 gap-3">
        {activePlatforms.map(p => {
          const post = content[p.id] as GeneratedPost | undefined
          return (
            <div key={p.id} className="card-sm flex items-center gap-3">
              <PlatformIcon platform={p.id} size={36} />
              <div>
                <p className="text-sm font-medium text-white">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {post ? `${post.text.length} zn.` : '—'}
                  {(post?.generatedImageUrl || post?.editedImageUrl) && ' · 🖼'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Texts */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Teksty postów</label>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => copy(textsOutput, setCopiedTexts)}>
              {copiedTexts ? '✓ Skopiowano' : 'Kopiuj wszystko'}
            </button>
            <button className="btn-ghost text-xs py-1.5 px-3"
              onClick={() => downloadTxt(textsOutput, `posty_${new Date().toISOString().slice(0,10)}.txt`)}>
              Pobierz .txt
            </button>
          </div>
        </div>
        <textarea readOnly
          className="w-full rounded-xl px-3.5 py-3 text-sm font-mono leading-relaxed resize-y focus:outline-none"
          style={{ minHeight: 160, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
          value={textsOutput}
        />
      </div>

      {/* Prompts */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Prompty do grafik</label>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => copy(promptsOutput, setCopiedPrompts)}>
              {copiedPrompts ? '✓ Skopiowano' : 'Kopiuj prompty'}
            </button>
            <button className="btn-ghost text-xs py-1.5 px-3"
              onClick={() => downloadTxt(promptsOutput, `prompty_grafiki_${new Date().toISOString().slice(0,10)}.txt`)}>
              Pobierz .txt
            </button>
          </div>
        </div>
        <textarea readOnly
          className="w-full rounded-xl px-3.5 py-3 text-sm font-mono leading-relaxed resize-y focus:outline-none"
          style={{ minHeight: 130, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
          value={promptsOutput}
        />
      </div>

      {/* Generated images */}
      {activePlatforms.some(p => {
        const post = content[p.id] as GeneratedPost | undefined
        return post?.generatedImageUrl || post?.editedImageUrl
      }) && (
        <div className="card">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 block">Wygenerowane grafiki</label>
          <div className="grid grid-cols-2 gap-3">
            {activePlatforms.map(p => {
              const post = content[p.id] as GeneratedPost | undefined
              const img = post?.editedImageUrl || post?.generatedImageUrl
              if (!img) return null
              return (
                <div key={p.id} className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={p.name} className="w-full object-cover aspect-video" />
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex items-center gap-2"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                    <PlatformIcon platform={p.id} size={22} />
                    <div>
                      <p className="text-white text-xs font-medium">{p.name}</p>
                      <a href={img} target="_blank" rel="noopener noreferrer"
                        className="text-white/60 text-[10px] hover:text-white transition-colors">Pobierz ↗</a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next actions grid */}
      <div className="card">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 block">Co dalej?</label>
        <div className="grid grid-cols-2 gap-3">
          {NEXT_ACTIONS.map((action, i) => (
            <button key={i} onClick={() => copyAction(i, action.prompt)}
              className="flex items-start gap-3 p-4 rounded-xl text-left transition-all group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.25)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
            >
              <span className="text-indigo-400 text-lg shrink-0 mt-0.5">{action.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors leading-tight">
                  {copiedAction === i ? '✓ Skopiowano prompt' : action.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{action.sub}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-600 mt-3 text-center">Kliknij kartę żeby skopiować prompt — wklej go w nowej rozmowie z Claude</p>
      </div>

      <div className="flex justify-between pt-2">
        <button className="btn-secondary" onClick={onBack}>← Wstecz</button>
        <button className="btn-primary px-6 py-3" onClick={onNewProject}>✦ Nowy projekt</button>
      </div>
    </div>
  )
}
