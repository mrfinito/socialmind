'use client'
import { useState, useEffect, use } from 'react'

interface BriefData {
  business_name: string
  client_name: string
  status: string
  responses?: Record<string, string>
}

const STEPS = [
  { id: 'about', title: 'O firmie', icon: '🏢' },
  { id: 'audience', title: 'Klienci', icon: '👥' },
  { id: 'competition', title: 'Rynek', icon: '⚔️' },
  { id: 'goals', title: 'Cele', icon: '🎯' },
  { id: 'communication', title: 'Komunikacja', icon: '💬' },
]

export default function BriefPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [brief, setBrief] = useState<BriefData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({
    business_name: '',
    industry: '',
    description: '',
    products: '',
    target_audience: '',
    competitors: '',
    unique_value: '',
    business_goals: '',
    social_goals: '',
    budget: '',
    platforms: 'facebook, instagram',
    tone_preference: '',
    values: '',
    additional_info: '',
  })

  useEffect(() => {
    fetch(`/api/brief/fetch?token=${token}`)
      .then(r => r.json())
      .then(j => {
        if (!j.ok) { setError(j.error); return }
        setBrief(j.brief)
        if (j.brief.business_name) setFormData(p => ({ ...p, business_name: j.brief.business_name }))
        if (j.brief.status === 'submitted' || j.brief.status === 'processed') {
          setSubmitted(true)
        }
      })
      .catch(() => setError('Nie można załadować briefu'))
      .finally(() => setLoading(false))
  }, [token])

  function update(key: string, val: string) {
    setFormData(p => ({ ...p, [key]: val }))
  }

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/brief/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, responses: formData })
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
        <p className="text-gray-500">Ładowanie...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0a0e1a' }}>
        <div className="max-w-md text-center">
          <p className="text-4xl mb-4">😕</p>
          <h1 className="text-xl font-semibold text-white mb-2">Nie można załadować briefu</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0a0e1a' }}>
        <div className="max-w-lg text-center">
          <p className="text-5xl mb-6">✅</p>
          <h1 className="text-2xl font-bold text-white mb-3">Dziękujemy!</h1>
          <p className="text-gray-400 mb-2">Brief został wysłany. Nasz zespół przejrzy Twoje odpowiedzi i przygotuje strategię komunikacji dla <strong className="text-white">{brief?.business_name}</strong>.</p>
          <p className="text-sm text-gray-600 mt-6">Skontaktujemy się wkrótce.</p>
        </div>
      </div>
    )
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen" style={{ background: '#0a0e1a' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-sm text-indigo-400 font-medium mb-2">📋 Brief strategiczny</p>
          <h1 className="text-3xl font-bold text-white mb-2">
            Opowiedz nam o {brief?.business_name || 'swojej firmie'}
          </h1>
          <p className="text-gray-500">Odpowiedzi pomogą nam przygotować strategię komunikacji dopasowaną do Twoich celów. Zajmie Ci to około 10 minut.</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <button key={s.id} onClick={() => setStep(i)}
                className="flex flex-col items-center gap-2 transition-all"
                style={{ opacity: i <= step ? 1 : 0.4 }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{
                    background: i === step ? 'rgba(99,102,241,0.25)' : i < step ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                    border: i === step ? '2px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                  {i < step ? '✓' : s.icon}
                </div>
                <span className="text-[10px] text-gray-500">{s.title}</span>
              </button>
            ))}
          </div>
          <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Nazwa firmy *</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none"
                  value={formData.business_name} onChange={e => update('business_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Branża *</label>
                <input type="text" placeholder="np. edukacja przedszkolna, gastronomia, e-commerce..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none"
                  value={formData.industry} onChange={e => update('industry', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Krótki opis firmy *</label>
                <textarea rows={4} placeholder="Czym się zajmujecie? Od jak dawna? Ile osób pracuje?"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.description} onChange={e => update('description', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Produkty lub usługi *</label>
                <textarea rows={3} placeholder="Co konkretnie oferujecie? Główne kategorie produktów/usług."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.products} onChange={e => update('products', e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Kim jest Wasz idealny klient? *</label>
                <textarea rows={4} placeholder="Wiek, płeć, miejsce zamieszkania, sytuacja życiowa, dochody, zainteresowania..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.target_audience} onChange={e => update('target_audience', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Co wyróżnia Waszą firmę?</label>
                <textarea rows={3} placeholder="Co sprawia, że klienci wybierają Was, a nie konkurencję?"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.unique_value} onChange={e => update('unique_value', e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Główni konkurenci</label>
                <textarea rows={3} placeholder="Wymień 2-5 głównych konkurentów..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.competitors} onChange={e => update('competitors', e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Cele biznesowe *</label>
                <textarea rows={3} placeholder="Co chcecie osiągnąć w tym roku? Wzrost sprzedaży, nowe rynki, lojalni klienci?"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.business_goals} onChange={e => update('business_goals', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Cele social media *</label>
                <textarea rows={3} placeholder="Co social media mają robić dla firmy? Zasięg, leady, sprzedaż, budowanie społeczności?"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.social_goals} onChange={e => update('social_goals', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Budżet miesięczny na social media</label>
                <input type="text" placeholder="np. 2000-5000 zł miesięcznie"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none"
                  value={formData.budget} onChange={e => update('budget', e.target.value)} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Na jakich platformach chcecie być aktywni? *</label>
                <input type="text" placeholder="Facebook, Instagram, LinkedIn, TikTok..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none"
                  value={formData.platforms} onChange={e => update('platforms', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Jak firma powinna komunikować się z klientami?</label>
                <textarea rows={3} placeholder="Profesjonalnie? Z humorem? Luźno? Ekspercko? Jakieś konkretne zwroty, których unikacie?"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.tone_preference} onChange={e => update('tone_preference', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Wartości i misja firmy</label>
                <textarea rows={3} placeholder="Co jest dla Was ważne? W co wierzycie?"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.values} onChange={e => update('values', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Coś jeszcze, co powinniśmy wiedzieć?</label>
                <textarea rows={3} placeholder="Wszystko co może pomóc w zrozumieniu Waszej firmy..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                  value={formData.additional_info} onChange={e => update('additional_info', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-30 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
            ← Wstecz
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }}>
              Dalej →
            </button>
          ) : (
            <button onClick={submit} disabled={submitting || !formData.business_name || !formData.industry || !formData.description}
              className="px-8 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: '#6366f1', color: 'white' }}>
              {submitting ? 'Wysyłanie...' : '✓ Wyślij brief'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
