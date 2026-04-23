'use client'
import { useState, useRef } from 'react'
import type { BrandDNA } from '@/lib/types'

interface Props {
  onComplete: (dna: BrandDNA) => void
}

export default function StepOnboarding({ onComplete }: Props) {
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [brandingNotes, setBrandingNotes] = useState('')
  const [docs, setDocs] = useState<File[]>([])
  const [images, setImages] = useState<File[]>([])
  const [logos, setLogos] = useState<File[]>([])
  const [brandbooks, setBrandbooks] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const docsRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<HTMLInputElement>(null)
  const logosRef = useRef<HTMLInputElement>(null)
  const brandbooksRef = useRef<HTMLInputElement>(null)

  async function handleAnalyze() {
    if (!url && !description && docs.length === 0 && images.length === 0 && logos.length === 0) {
      setError('Dodaj przynajmniej jeden material o marce')
      return
    }
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      if (url) fd.append('url', url)
      if (description) fd.append('description', description)
      if (brandingNotes) fd.append('brandingNotes', brandingNotes)
      docs.forEach(f => fd.append('docs', f))
      images.forEach(f => fd.append('images', f))
      logos.forEach(f => fd.append('logos', f))
      brandbooks.forEach(f => fd.append('docs', f)) // treat as docs

      const res = await fetch('/api/analyze-brand', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onComplete(data.dna)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Blad analizy')
    } finally {
      setLoading(false)
    }
  }

  function UploadZone({ icon, title, subtitle, onClick, files, onRemove, accept, multiple = true }: {
    icon: string; title: string; subtitle: string; onClick: () => void
    files: File[]; onRemove: (i: number) => void; accept: string; multiple?: boolean
  }) {
    return (
      <div>
        <div
          className="border-2 border-dashed border-white/10 rounded-xl p-5 text-center cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all"
          onClick={onClick}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); onClick() }}
        >
          <div className="text-2xl mb-1.5">{icon}</div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/8/3 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-600">
                {icon} {f.name}
                <button onClick={() => onRemove(i)} className="text-gray-400 hover:text-red-500 ml-1">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Zrodla wiedzy o marce</h2>
        <p className="text-gray-500 text-sm mt-1">Im wiecej materialow, tym dokladniejsze Brand DNA i lepsza identyfikacja wizualna</p>
      </div>

      {/* URL */}
      <div className="card">
        <label className="label">Strona www / Landing page</label>
        <input className="input" type="url" placeholder="https://twojafirma.pl" value={url} onChange={e => setUrl(e.target.value)} />
        <p className="text-xs text-gray-400 mt-1.5">Claude uzyje URL jako punkt odniesienia dla tresci i stylu</p>
      </div>

      {/* LOGO + BRANDBBOOK section */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🎨</span>
          <h3 className="font-semibold text-white text-sm">Identyfikacja wizualna</h3>
        </div>

        <div>
          <label className="label">Logotyp marki</label>
          <UploadZone
            icon="🔷" title="Wgraj logo" subtitle="PNG, SVG, WebP · przezroczyste tlo (PNG) daje najlepszy efekt"
            onClick={() => logosRef.current?.click()}
            files={logos} onRemove={i => setLogos(l => l.filter((_, j) => j !== i))}
            accept="image/*"
          />
          <input ref={logosRef} type="file" className="hidden" accept="image/png,image/svg+xml,image/webp"
            onChange={e => setLogos(Array.from(e.target.files || []).slice(0, 2))} />
        </div>

        <div>
          <label className="label">Brandbbok / wytyczne graficzne (PDF lub TXT)</label>
          <UploadZone
            icon="📋" title="Wgraj brandbbok" subtitle="PDF, TXT · Claude przeanalizuje wytyczne kolorow, typografii i stylu"
            onClick={() => brandbooksRef.current?.click()}
            files={brandbooks} onRemove={i => setBrandbooks(l => l.filter((_, j) => j !== i))}
            accept=".txt,.pdf"
          />
          <input ref={brandbooksRef} type="file" className="hidden" accept=".txt,.pdf" multiple
            onChange={e => setBrandbooks(Array.from(e.target.files || []).slice(0, 2))} />
        </div>

        <div>
          <label className="label">Wytyczne graficzne (opcjonalnie — opis reczny)</label>
          <textarea
            className="input resize-y min-h-[80px]"
            placeholder="Np. logo zawsze w prawym dolnym rogu, tlo ciemne, font Montserrat Bold, kolory: granatowy #1a2e5a i zloty #c9a84c, styl premium/luksusowy..."
            value={brandingNotes}
            onChange={e => setBrandingNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Brand images */}
      <div className="card">
        <label className="label">Zdejcia / materialy wizualne marki</label>
        <UploadZone
          icon="🖼" title="Wgraj inspiracje wizualne" subtitle="JPG, PNG, WebP · max 3 pliki"
          onClick={() => imagesRef.current?.click()}
          files={images} onRemove={i => setImages(l => l.filter((_, j) => j !== i))}
          accept="image/*"
        />
        <input ref={imagesRef} type="file" className="hidden" multiple accept="image/*"
          onChange={e => setImages(p => [...p, ...Array.from(e.target.files || [])].slice(0, 3))} />
      </div>

      {/* Docs */}
      <div className="card">
        <label className="label">Dokumenty (brief, opisy, teksty)</label>
        <UploadZone
          icon="📄" title="Wgraj dokumenty tekstowe" subtitle="TXT · max 3 pliki"
          onClick={() => docsRef.current?.click()}
          files={docs} onRemove={i => setDocs(l => l.filter((_, j) => j !== i))}
          accept=".txt"
        />
        <input ref={docsRef} type="file" className="hidden" multiple accept=".txt"
          onChange={e => setDocs(p => [...p, ...Array.from(e.target.files || [])].slice(0, 3))} />
      </div>

      {/* Description */}
      <div className="card">
        <label className="label">Opis marki (opcjonalnie)</label>
        <textarea
          className="input resize-y min-h-[90px]"
          placeholder="Branza, wartosci, co wyroznia marke, do kogo mowi, jaki ma styl komunikacji..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2 px-6 py-3" onClick={handleAnalyze} disabled={loading}>
          {loading ? (
            <>
              <span className="inline-flex gap-0.5">
                {[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-white/8/70 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
              </span>
              Analizuje marke i identyfikacje wizualna...
            </>
          ) : (
            'Analizuj i stworz Brand DNA →'
          )}
        </button>
      </div>
    </div>
  )
}
