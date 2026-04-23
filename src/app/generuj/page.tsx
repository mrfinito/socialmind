'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import StepOnboarding from '@/components/StepOnboarding'
import StepBrandDNA from '@/components/StepBrandDNA'
import StepPlatforms from '@/components/StepPlatforms'
import StepGenerate from '@/components/StepGenerate'
import StepExport from '@/components/StepExport'
import { useStore } from '@/lib/store'
import type { BrandDNA, GeneratedContent, Platform } from '@/lib/types'

const STEPS = ['Marka', 'Brand DNA', 'Platformy', 'Generuj', 'Eksport']

export default function GenerujPage() {
  const { state, saveDNA, savePlatforms, savePost } = useStore()
  const [step, setStep] = useState(0)
  const [dna, setDna] = useState<BrandDNA | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['facebook', 'instagram'])
  const [topic, setTopic] = useState('')
  const [goals, setGoals] = useState<string[]>(['Świadomość marki'])
  const [tones, setTones] = useState<string[]>(['profesjonalny'])
  const [content, setContent] = useState<GeneratedContent | null>(null)

  // Load from store on mount
  useEffect(() => {
    if (dna) { setDna(dna); setStep(2) }
    if ((selectedPlatforms || []).length) setSelectedPlatforms(selectedPlatforms || [])
  }, [dna, selectedPlatforms || []])

  function handleDNA(d: BrandDNA) {
    setDna(d)
    saveDNA(d)
    setStep(1)
  }

  function handlePlatforms(p: Platform[]) {
    setSelectedPlatforms(p)
    savePlatforms(p)
  }

  function handleComplete(c: GeneratedContent) {
    setContent(c)
    savePost({ topic, platforms: selectedPlatforms, content: c, dna: dna!, goals, tones })
    setStep(4)
  }

  return (
    <AppShell>
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Generator postów</h1>
          <p className="text-gray-500 text-sm mt-1">Stwórz posty dopasowane do Brand DNA Twojej marki</p>
        </div>

        {/* Step tabs */}
        <div className="flex items-center gap-1 mb-8 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {STEPS.map((label, i) => (
            <button key={i}
              onClick={() => (i < step || dna) ? setStep(i) : undefined}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-1 justify-center transition-all"
              style={{
                background: i === step ? '#6366f1' : 'transparent',
                color: i === step ? '#fff' : i < step ? '#9ca3af' : '#4b5563',
                cursor: i < step || dna ? 'pointer' : 'default',
                boxShadow: i === step ? '0 4px 12px rgba(99,102,241,0.25)' : 'none',
              }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: i === step ? 'rgba(255,255,255,0.2)' : i < step ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)' }}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="max-w-2xl">
          {step === 0 && <StepOnboarding onComplete={handleDNA} />}
          {step === 1 && dna && <StepBrandDNA dna={dna} tones={tones} onTonesChange={setTones} onDnaChange={d => { setDna(d); saveDNA(d) }} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
          {step === 2 && <StepPlatforms selectedPlatforms={selectedPlatforms} onPlatformsChange={handlePlatforms} topic={topic} onTopicChange={setTopic} goals={goals} onGoalsChange={setGoals} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
          {step === 3 && dna && <StepGenerate dna={dna} platforms={selectedPlatforms} topic={topic} goals={goals} tones={tones} onComplete={handleComplete} onBack={() => setStep(2)} />}
          {step === 4 && content && <StepExport content={content} platforms={selectedPlatforms} onBack={() => setStep(3)} onNewProject={() => { setStep(2); setContent(null); setTopic('') }} />}
        </div>
      </div>
    </AppShell>
  )
}
