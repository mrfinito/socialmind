'use client'
import { PLATFORMS } from '@/lib/types'
import PlatformIcon from './PlatformIcon'
import type { Platform } from '@/lib/types'

const GOALS = ['Świadomość marki','Ruch na stronę','Sprzedaż / konwersja','Zaangażowanie','Pozyskiwanie followersów','Edukacja','Budowanie społeczności']

interface Props {
  selectedPlatforms: Platform[]
  onPlatformsChange: (p: Platform[]) => void
  topic: string
  onTopicChange: (t: string) => void
  goals: string[]
  onGoalsChange: (g: string[]) => void
  onBack: () => void
  onNext: () => void
}

export default function StepPlatforms({ selectedPlatforms, onPlatformsChange, topic, onTopicChange, goals, onGoalsChange, onBack, onNext }: Props) {
  function toggle(id: Platform) {
    onPlatformsChange(selectedPlatforms.includes(id)
      ? selectedPlatforms.filter(p => p !== id)
      : [...selectedPlatforms, id])
  }
  function toggleGoal(g: string) {
    onGoalsChange(goals.includes(g) ? goals.filter(x => x !== g) : [...goals, g])
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Platformy i temat</h2>
        <p className="text-gray-500 text-sm mt-1">Wybierz gdzie publikujesz i o czym ma być post</p>
      </div>

      <div className="card">
        <label className="label">Platformy</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          {PLATFORMS.map(p => {
            const selected = selectedPlatforms.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition-all ${
                  selected
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                    : 'border-white/10 bg-white/8 hover:border-white/15 hover:bg-white/8/3'
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base" style={{ background: p.color }}>
                    {p.emoji}
                  </div>
                  <span className={`text-sm font-medium ${selected ? 'text-indigo-300' : 'text-gray-300'}`}>{p.name}</span>
                  {selected && <span className="ml-auto text-brand-500 text-xs">✓</span>}
                </div>
                <div className="text-[11px] text-gray-400 leading-relaxed pl-0.5">
                  {p.format}<br />
                  <span className="font-mono">{p.dimensions}</span> · {p.maxChars} zn.
                </div>
              </button>
            )
          })}
        </div>
        {selectedPlatforms.length === 0 && (
          <p className="text-amber-600 text-xs mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Wybierz przynajmniej jedną platformę
          </p>
        )}
      </div>

      <div className="card">
        <label className="label">Temat / kampania</label>
        <textarea
          className="input resize-y min-h-[90px]"
          placeholder="O czym ma być ten post? Np. 'Premiera produktu X — promuję funkcję Y, target kobiety 30+, chcę ruchu na landing page'"
          value={topic}
          onChange={e => onTopicChange(e.target.value)}
        />
      </div>

      <div className="card">
        <label className="label">Cel posta</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {GOALS.map(g => (
            <button
              key={g}
              onClick={() => toggleGoal(g)}
              className={`tag ${goals.includes(g) ? 'tag-active' : 'tag-inactive'}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={onBack}>← Wstecz</button>
        <button
          className="btn-primary px-6 py-3"
          onClick={onNext}
          disabled={selectedPlatforms.length === 0}
        >
          Generuj posty →
        </button>
      </div>
    </div>
  )
}
