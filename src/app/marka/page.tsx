'use client'
import { useState, useRef, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import type { BrandDNA } from '@/lib/types'

export default function MarkaPage() {
  const { state, dna, selectedPlatforms, saveDNA, addMaterial } = useStore()
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [brandingNotes, setBrandingNotes] = useState('')
  const [logos, setLogos] = useState<File[]>([])
  const [brandbooks, setBrandbooks] = useState<File[]>([])
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const logosRef = useRef<HTMLInputElement>(null)
  const bbRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dna) {
      setUrl(dna?.usp || '')
      setDescription(dna?.values || '')
      setBrandingNotes(dna?.visuals?.brandingNotes || '')
    }
  }, [dna])

  async function analyze() {
    if (!url && !description && logos.length === 0 && images.length === 0 && brandingNotes.length === 0) {
      setError('Dodaj przynajmniej jeden materiał')
      return
    }
    setLoading(true); setError(''); setSuccess(false)
    try {
      const fd = new FormData()
      if (url) fd.append('url', url)
      if (description) fd.append('description', description)
      if (brandingNotes) fd.append('brandingNotes', brandingNotes)
      logos.forEach(f => fd.append('logos', f))
      brandbooks.forEach(f => fd.append('docs', f))
      images.forEach(f => fd.append('images', f))

      const res = await fetch('/api/analyze-brand', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      saveDNA(data.dna)

      // Save materials to store
      logos.forEach(f => addMaterial({ name: f.name, type: 'logo', size: `${(f.size/1024).toFixed(0)} KB` }))
      brandbooks.forEach(f => addMaterial({ name: f.name, type: 'brandbook', size: `${(f.size/1024).toFixed(0)} KB` }))

      setSuccess(true)
      setLogos([]); setBrandbooks([]); setImages([])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd analizy')
    } finally { setLoading(false) }
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Marka</h1>
          <p className="text-gray-500 text-sm mt-1">Zdefiniuj swoją markę — Claude przeanalizuje materiały i stworzy Brand DNA</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: form */}
          <div className="col-span-2 space-y-5">

            {/* URL */}
            <div className="card">
              <label className="label">Strona www</label>
              <input className="input" type="url" placeholder="https://twojafirma.pl" value={url} onChange={e => setUrl(e.target.value)} />
            </div>

            {/* Visual identity */}
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><span className="text-indigo-400">🎨</span> Identyfikacja wizualna</h3>

              <div>
                <label className="label">Logotyp <span className="text-gray-600 normal-case font-normal">(PNG z przezroczystym tłem daje najlepszy efekt)</span></label>
                <div onClick={() => logosRef.current?.click()} className="upload-zone">
                  <span className="text-2xl mb-1.5 block">🔷</span>
                  <p className="text-sm text-gray-400 font-medium">Kliknij lub przeciągnij logo</p>
                  <p className="text-xs text-gray-600 mt-0.5">PNG, SVG, WebP</p>
                </div>
                <input ref={logosRef} type="file" className="hidden" accept="image/png,image/svg+xml,image/webp"
                  onChange={e => setLogos(Array.from(e.target.files || []).slice(0, 2))} />
                {logos.map((f, i) => <FilePill key={i} name={f.name} onRemove={() => setLogos(l => l.filter((_, j) => j !== i))} />)}
              </div>

              <div>
                <label className="label">Brandbook / wytyczne graficzne</label>
                <div onClick={() => bbRef.current?.click()} className="upload-zone">
                  <span className="text-2xl mb-1.5 block">📋</span>
                  <p className="text-sm text-gray-400 font-medium">Wgraj brandbook</p>
                  <p className="text-xs text-gray-600 mt-0.5">TXT, PDF</p>
                </div>
                <input ref={bbRef} type="file" className="hidden" multiple accept=".txt,.pdf"
                  onChange={e => setBrandbooks(Array.from(e.target.files || []).slice(0, 3))} />
                {brandbooks.map((f, i) => <FilePill key={i} name={f.name} onRemove={() => setBrandbooks(l => l.filter((_, j) => j !== i))} />)}
              </div>

              <div>
                <label className="label">Wytyczne graficzne (opis ręczny)</label>
                <textarea className="input resize-y min-h-[80px]"
                  placeholder="Np. logo zawsze w prawym dolnym rogu, tło ciemne, kolory: granatowy #1a2e5a i złoty #c9a84c..."
                  value={brandingNotes} onChange={e => setBrandingNotes(e.target.value)} />
              </div>
            </div>

            {/* Images */}
            <div className="card">
              <label className="label">Zdjęcia / inspiracje wizualne</label>
              <div onClick={() => imgRef.current?.click()} className="upload-zone">
                <span className="text-2xl mb-1.5 block">🖼</span>
                <p className="text-sm text-gray-400 font-medium">Wgraj zdjęcia produktów, inspiracje</p>
                <p className="text-xs text-gray-600 mt-0.5">JPG, PNG, WebP · max 3 pliki</p>
              </div>
              <input ref={imgRef} type="file" className="hidden" multiple accept="image/*"
                onChange={e => setImages(Array.from(e.target.files || []).slice(0, 3))} />
              {images.map((f, i) => <FilePill key={i} name={f.name} onRemove={() => setImages(l => l.filter((_, j) => j !== i))} />)}
            </div>

            {/* Description */}
            <div className="card">
              <label className="label">Opis marki</label>
              <textarea className="input resize-y min-h-[100px]"
                placeholder="Branża, wartości, co wyróżnia markę, do kogo mówi, styl komunikacji..."
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
            {success && <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">✓ Brand DNA wygenerowane — sprawdź sekcję Brand DNA</p>}

            <button className="btn-primary w-full py-3 flex items-center justify-center gap-2" onClick={analyze} disabled={loading}>
              {loading ? <><Dots /> Analizuję markę...</> : '✦ Analizuj i stwórz Brand DNA →'}
            </button>
          </div>

          {/* Right: current DNA summary */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Aktualny profil</h3>
              {dna ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">Marka</p>
                    <p className="text-sm font-semibold text-white">{dna.brandName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">Branża</p>
                    <p className="text-xs text-gray-300">{dna.industry || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">Wartości</p>
                    <p className="text-xs text-gray-300">{dna.values || '—'}</p>
                  </div>
                  {dna.visuals?.dominantColors && dna.visuals.dominantColors.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-600 mb-1.5">Paleta</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {dna.visuals.dominantColors.map((c: string, i: number) => (
                          <div key={i} className="w-6 h-6 rounded-lg border border-white/10" style={{ background: c }} title={c} />
                        ))}
                      </div>
                    </div>
                  )}
                  {dna.visuals?.logoUrl && (
                    <div>
                      <p className="text-[10px] text-gray-600 mb-1.5">Logo</p>
                      <div className="w-full h-16 rounded-xl flex items-center justify-center p-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dna.visuals.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-600">Brak profilu — wypełnij formularz i kliknij Analizuj</p>
              )}
            </div>

            <div className="card">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Wskazówka</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Im więcej materiałów wgrasz, tym dokładniejsze Brand DNA. Logo z przezroczystym tłem jest kluczowe dla edytora graficznego.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .upload-zone {
          border: 1.5px dashed rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 8px;
        }
        .upload-zone:hover {
          border-color: rgba(99,102,241,0.4);
          background: rgba(99,102,241,0.05);
        }
      `}</style>
    </AppShell>
  )
}

function FilePill({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 px-2.5 py-1.5 rounded-lg mt-1 mr-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {name}
      <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition-colors">✕</button>
    </div>
  )
}

function Dots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
    </span>
  )
}
