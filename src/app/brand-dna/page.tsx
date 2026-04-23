'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'
import Link from 'next/link'

const TONES = ['profesjonalny','inspirujący','przyjazny','ekspercki','zabawny','premium','lokalny','minimalistyczny','storytelling','aktywistyczny']
const LOGO_POSITIONS = [
  { id: 'top-left', label: '↖ Lewy górny' },
  { id: 'top-right', label: '↗ Prawy górny' },
  { id: 'bottom-left', label: '↙ Lewy dolny' },
  { id: 'bottom-right', label: '↘ Prawy dolny' },
  { id: 'center', label: '⊙ Środek' },
]

export default function BrandDNAPage() {
  const { state, dna, selectedPlatforms, saveDNA } = useStore()
  const [saved, setSaved] = useState(false)
  const [tones, setTones] = useState<string[]>(['profesjonalny'])

  useEffect(() => {
    if (dna?.tone) {
      const found = TONES.filter(t => dna.tone.toLowerCase().includes(t))
      if (found.length) setTones(found)
    }
  }, [dna?.tone])

  function update(field: string, value: string | number) {
    if (!dna) return
    saveDNA({ ...dna, [field]: value })
  }

  function updateVisuals(field: string, value: string | number) {
    if (!dna) return
    saveDNA({ ...dna, visuals: { ...(dna.visuals || { dominantColors: [], brandingNotes: '' }), [field]: value } })
  }

  function toggleTone(t: string) {
    const next = tones.includes(t) ? tones.filter(x => x !== t) : [...tones, t]
    setTones(next)
    if (dna) saveDNA({ ...dna, tone: next.join(', ') })
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!dna) {
    return (
      <AppShell>
        <div className="px-8 py-8">
          <h1 className="text-2xl font-semibold text-white mb-2">Brand DNA</h1>
          <div className="card max-w-md mt-6 text-center py-10">
            <p className="text-4xl mb-4">◉</p>
            <p className="text-gray-300 font-medium mb-1">Brak Brand DNA</p>
            <p className="text-gray-500 text-sm mb-5">Najpierw przejdź do sekcji Marka i wgraj materiały</p>
            <Link href="/marka" className="btn-primary">Przejdź do Marki →</Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="card space-y-4">
      <h3 className="text-sm font-semibold text-white border-b border-white/6 pb-3">{title}</h3>
      {children}
    </div>
  )

  const Field = ({ label, value, multiline, onChange }: { label: string; value: string; multiline?: boolean; onChange: (v: string) => void }) => (
    <div>
      <label className="label">{label}</label>
      {multiline
        ? <textarea className="input resize-y min-h-[80px]" value={value} onChange={e => onChange(e.target.value)} />
        : <input className="input" value={value} onChange={e => onChange(e.target.value)} />}
    </div>
  )

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Brand DNA</h1>
            <p className="text-gray-500 text-sm mt-1">Profil komunikacyjny marki — edytuj i zapisuj zmiany</p>
          </div>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            {saved ? '✓ Zapisano' : 'Zapisz zmiany'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-5">
            <Section title="Podstawy">
              <Field label="Nazwa marki" value={dna.brandName || ''} onChange={v => update('brandName', v)} />
              <Field label="Branża" value={dna.industry || ''} onChange={v => update('industry', v)} />
              <Field label="Persona docelowa" value={dna.persona || ''} multiline onChange={v => update('persona', v)} />
              <Field label="Wartości marki" value={dna.values || ''} onChange={v => update('values', v)} />
              <Field label="USP — unikalna propozycja wartości" value={dna.usp || ''} multiline onChange={v => update('usp', v)} />
            </Section>

            <Section title="Komunikacja">
              <Field label="Opis tonu komunikacji" value={dna.tone || ''} multiline onChange={v => update('tone', v)} />
              <div>
                <label className="label">Ton — tagi</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t} onClick={() => toggleTone(t)} className={`tag ${tones.includes(t) ? 'tag-active' : 'tag-inactive'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <Field label="Słowa kluczowe / hashtagi" value={dna.keywords || ''} onChange={v => update('keywords', v)} />
              <Field label="Master prompt marki" value={dna.masterPrompt || ''} multiline onChange={v => update('masterPrompt', v)} />
            </Section>

            <Section title="Identyfikacja wizualna">
              {dna.visuals?.logoUrl && (
                <div>
                  <label className="label">Logo</label>
                  <div className="w-32 h-16 rounded-xl flex items-center justify-center p-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dna.visuals.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
              )}
              {(dna.visuals?.dominantColors || dna.dominantColors || []).length > 0 && (
                <div>
                  <label className="label">Paleta kolorów</label>
                  <div className="flex gap-2 flex-wrap">
                    {(dna.visuals?.dominantColors || dna.dominantColors || []).map((c: string, i: number) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-xl border border-white/10" style={{ background: c }} />
                        <span className="text-[10px] font-mono text-gray-600">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Styl wizualny" value={dna.visuals?.visualStyle || ''} onChange={v => updateVisuals('visualStyle', v)} />
              <Field label="Styl typografii" value={dna.visuals?.fontStyle || ''} onChange={v => updateVisuals('fontStyle', v)} />
              <div>
                <label className="label">Domyślna pozycja logo</label>
                <div className="flex flex-wrap gap-2">
                  {LOGO_POSITIONS.map(p => (
                    <button key={p.id} onClick={() => updateVisuals('logoPosition', p.id)}
                      className={`tag ${dna.visuals?.logoPosition === p.id ? 'tag-active' : 'tag-inactive'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Rozmiar logo na grafikach ({dna.visuals?.logoSizePercent || 15}%)</label>
                <input type="range" min="5" max="35" step="5" className="w-full"
                  value={dna.visuals?.logoSizePercent || 15}
                  onChange={e => updateVisuals('logoSizePercent', parseInt(e.target.value))} />
              </div>
              <Field label="Wytyczne graficzne" value={dna.visuals?.brandingNotes || ''} multiline onChange={v => updateVisuals('brandingNotes', v)} />
            </Section>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Podsumowanie</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Marka', val: dna.brandName },
                  { label: 'Branża', val: dna.industry },
                  { label: 'USP', val: dna.usp },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-600">{label}</p>
                    <p className="text-xs text-gray-300 leading-snug">{val || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ton aktywny</h3>
              <div className="flex flex-wrap gap-1.5">
                {tones.map(t => (
                  <span key={t} className="tag tag-active text-[11px] py-0.5">{t}</span>
                ))}
              </div>
            </div>

            <Link href="/generuj" className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
              Generuj posty →
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
