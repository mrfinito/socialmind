'use client'
import type { BrandDNA } from '@/lib/types'

const TONES = ['profesjonalny','inspirujacy','przyjazny','ekspercki','zabawny','premium','lokalny','aktywistyczny','minimalistyczny','storytelling']
const LOGO_POSITIONS = [
  { id: 'top-left', label: '↖ Lewy gorny' },
  { id: 'top-right', label: '↗ Prawy gorny' },
  { id: 'bottom-left', label: '↙ Lewy dolny' },
  { id: 'bottom-right', label: '↘ Prawy dolny' },
  { id: 'center', label: '⊙ Srodek' },
]

interface Props {
  dna: BrandDNA
  tones: string[]
  onTonesChange: (t: string[]) => void
  onDnaChange: (d: BrandDNA) => void
  onBack: () => void
  onNext: () => void
}

export default function StepBrandDNA({ dna, tones, onTonesChange, onDnaChange, onBack, onNext }: Props) {
  function toggleTone(t: string) {
    onTonesChange(tones.includes(t) ? tones.filter(x => x !== t) : [...tones, t])
  }
  function update(field: keyof BrandDNA, value: string) {
    onDnaChange({ ...dna, [field]: value })
  }
  function updateVisuals(field: string, value: string | number) {
    onDnaChange({ ...dna, visuals: { ...(dna.visuals || { dominantColors: [], brandingNotes: '' }), [field]: value } })
  }

  const fields: { key: keyof BrandDNA; label: string; multiline?: boolean }[] = [
    { key: 'industry',     label: 'Branza' },
    { key: 'persona',      label: 'Persona docelowa', multiline: true },
    { key: 'values',       label: 'Wartosci marki' },
    { key: 'usp',          label: 'Unikalna propozycja wartosci (USP)', multiline: true },
    { key: 'tone',         label: 'Ton komunikacji', multiline: true },
    { key: 'keywords',     label: 'Slowa kluczowe / hashtagi' },
    { key: 'masterPrompt', label: 'Master prompt marki', multiline: true },
  ]

  const colors = dna.visuals?.dominantColors || dna.dominantColors || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Brand DNA</h2>
        <p className="text-gray-500 text-sm mt-1">Zweryfikuj i popraw profil — to fundament wszystkich postow</p>
      </div>

      {/* DNA text fields */}
      <div className="card space-y-5">
        {fields.map(({ key, label, multiline }) => (
          <div key={key}>
            <label className="label">{label}</label>
            {multiline ? (
              <textarea className="input resize-y min-h-[80px]" value={String(dna[key] ?? '')} onChange={e => update(key, e.target.value)} />
            ) : (
              <input className="input" value={String(dna[key] ?? '')} onChange={e => update(key, e.target.value)} />
            )}
          </div>
        ))}
      </div>

      {/* Visual identity section */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-white/6">
          <span className="text-base">🎨</span>
          <h3 className="font-semibold text-white text-sm">Identyfikacja wizualna</h3>
        </div>

        {/* Logo preview */}
        {dna.visuals?.logoUrl && (
          <div>
            <label className="label">Logo marki</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 border border-white/10 rounded-xl flex items-center justify-center bg-white/8/3 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dna.visuals.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
              </div>
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-300">{dna.visuals.logoFileName || 'logo'}</p>
                <p className="text-xs mt-0.5">Logo zostanie uzyte w edytorze graficznym</p>
              </div>
            </div>
          </div>
        )}

        {/* Colors */}
        {colors.length > 0 && (
          <div>
            <label className="label">Wykryta paleta kolorow</label>
            <div className="flex gap-3 mt-1">
              {colors.map((c: string, i: number) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl border border-white/6 shadow-sm" style={{ background: c }} />
                  <span className="text-[10px] font-mono text-gray-400">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual style */}
        <div>
          <label className="label">Styl wizualny (auto-wykryty)</label>
          <input className="input" value={dna.visuals?.visualStyle || ''} onChange={e => updateVisuals('visualStyle', e.target.value)}
            placeholder="np. minimalistyczny, luksusowy, technologiczny, organiczny..." />
        </div>

        {/* Font style */}
        <div>
          <label className="label">Styl typografii</label>
          <input className="input" value={dna.visuals?.fontStyle || ''} onChange={e => updateVisuals('fontStyle', e.target.value)}
            placeholder="np. sans-serif geometryczny, serif klasyczny, bold display..." />
        </div>

        {/* Logo position */}
        <div>
          <label className="label">Domyslna pozycja logo na grafikach</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {LOGO_POSITIONS.map(p => (
              <button key={p.id} onClick={() => updateVisuals('logoPosition', p.id)}
                className={`tag ${dna.visuals?.logoPosition === p.id ? 'tag-active' : 'tag-inactive'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logo size */}
        <div>
          <label className="label">Rozmiar logo na grafikach ({dna.visuals?.logoSizePercent || 15}% szerokosci)</label>
          <input type="range" min="5" max="35" step="5"
            value={dna.visuals?.logoSizePercent || 15}
            onChange={e => updateVisuals('logoSizePercent', parseInt(e.target.value))}
            className="w-full mt-1" />
          <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
            <span>5% (male)</span><span>20% (srednie)</span><span>35% (duze)</span>
          </div>
        </div>

        {/* Branding notes */}
        <div>
          <label className="label">Wytyczne graficzne / dodatkowe instrukcje</label>
          <textarea className="input resize-y min-h-[80px]"
            value={dna.visuals?.brandingNotes || ''}
            onChange={e => updateVisuals('brandingNotes', e.target.value)}
            placeholder="np. zawsze ciemne tlo, zlote akcenty, styl editorial, brak ludzi na zdjeciach..." />
        </div>
      </div>

      {/* Tone */}
      <div className="card">
        <label className="label">Ton komunikacji — dostosuj</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {TONES.map(t => (
            <button key={t} onClick={() => toggleTone(t)} className={`tag ${tones.includes(t) ? 'tag-active' : 'tag-inactive'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={onBack}>← Wstecz</button>
        <button className="btn-primary px-6 py-3" onClick={onNext}>Wybierz platformy →</button>
      </div>
    </div>
  )
}
