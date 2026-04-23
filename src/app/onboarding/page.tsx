'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PLATFORMS } from '@/lib/types'
import type { Platform } from '@/lib/types'
import PlatformIcon from '@/components/PlatformIcon'

const STEPS = ['Witaj','Marka','Platformy','Ton','Gotowe']
const INDUSTRIES = ['Edukacja','Restauracja / Food','Moda / Beauty','Zdrowie / Wellness','Technologia','Usługi B2B','Nieruchomości','Finanse','Sport / Fitness','E-commerce','Inne']
const TONES = [
  {id:'profesjonalny',label:'Profesjonalny',desc:'Ekspercki, rzeczowy, buduje autorytet'},
  {id:'przyjazny',label:'Przyjazny',desc:'Ciepły, bliski, jak rozmowa ze znajomym'},
  {id:'inspirujący',label:'Inspirujący',desc:'Motywujący, emocjonalny, budzi działanie'},
  {id:'zabawny',label:'Zabawny',desc:'Lekki, z humorem, angażujący'},
  {id:'premium',label:'Premium',desc:'Ekskluzywny, elegancki, prestiżowy'},
  {id:'ekspercki',label:'Ekspercki',desc:'Edukacyjny, szczegółowy, merytoryczny'},
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // Form data
  const [brandName, setBrandName] = useState('')
  const [industry, setIndustry] = useState('')
  const [customIndustry, setCustomIndustry] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>(['facebook','instagram'])
  const [tone, setTone] = useState('')
  const [persona, setPersona] = useState('')
  const [usp, setUsp] = useState('')

  function togglePlatform(id: Platform) {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p=>p!==id) : [...prev, id])
  }

  async function finish() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const finalIndustry = industry === 'Inne' ? customIndustry : industry

      // Create first project with Brand DNA
      const { data: project } = await supabase.from('projects').insert({
        user_id: user.id,
        name: brandName || 'Moja marka',
        emoji: '🏢',
        color: '#6366f1',
        selected_platforms: platforms,
        dna: {
          brandName,
          industry: finalIndustry,
          tone,
          persona: persona || `Klient zainteresowany ${finalIndustry}`,
          usp: usp || '',
          values: '',
          keywords: '',
          masterPrompt: `Jesteś copywriterem dla marki ${brandName}. Branża: ${finalIndustry}. Ton: ${tone}. ${usp ? `USP: ${usp}.` : ''} Pisz angażujące treści social media.`,
        }
      }).select().single()

      // Mark as onboarded
      await supabase.from('profiles').update({
        onboarded: true,
        full_name: user.user_metadata?.full_name || brandName,
      }).eq('id', user.id)

      router.push('/')
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const canNext = [
    true, // step 0 - welcome
    brandName.trim().length > 0 && (industry !== '' && (industry !== 'Inne' || customIndustry.trim().length > 0)), // step 1
    platforms.length > 0, // step 2
    tone !== '', // step 3
    true, // step 4 - done
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-indigo-500 text-white' :
                i === step ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50' :
                'bg-white/5 text-gray-600 border border-white/8'
              }`}>
                {i < step ? '✓' : i+1}
              </div>
              {i < STEPS.length-1 && (
                <div className="w-8 h-px" style={{background: i<step?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.08)'}}/>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-8" style={{background:'#181c27',border:'1px solid rgba(255,255,255,0.06)'}}>
          {/* Step 0 — Welcome */}
          {step===0 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{boxShadow:'0 0 30px rgba(99,102,241,0.4)'}}>
                <span className="text-3xl">✦</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Witaj w SocialMind!</h1>
              <p className="text-gray-400 leading-relaxed">
                Skonfigurujemy razem Twoją markę w 2 minuty. Potem AI będzie pisać w Twoim tonie, znać Twoich klientów i generować treści idealne dla Twojej branży.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-6 text-center">
                {[{icon:'🧬',label:'Brand DNA'},{icon:'✍️',label:'AI Copywriter'},{icon:'🚀',label:'Kampanie 360°'}].map(f=>(
                  <div key={f.label} className="p-3 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <p className="text-2xl mb-1">{f.icon}</p>
                    <p className="text-xs text-gray-400">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Brand */}
          {step===1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Twoja marka</h2>
                <p className="text-gray-500 text-sm">Podstawowe informacje o marce</p>
              </div>
              <div>
                <label className="label">Nazwa marki *</label>
                <input className="input" placeholder="np. Kids&Co, Studio Primo, Agencja XYZ"
                  value={brandName} onChange={e=>setBrandName(e.target.value)} autoFocus/>
              </div>
              <div>
                <label className="label">Branża *</label>
                <div className="grid grid-cols-3 gap-2">
                  {INDUSTRIES.map(ind=>(
                    <button key={ind} onClick={()=>setIndustry(ind)}
                      className="px-3 py-2 rounded-xl text-xs border transition-all text-left"
                      style={{
                        background:industry===ind?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.03)',
                        borderColor:industry===ind?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.07)',
                        color:industry===ind?'#a5b4fc':'#6b7280',
                      }}>
                      {ind}
                    </button>
                  ))}
                </div>
                {industry==='Inne' && (
                  <input className="input mt-2" placeholder="Wpisz swoją branżę..."
                    value={customIndustry} onChange={e=>setCustomIndustry(e.target.value)}/>
                )}
              </div>
              <div>
                <label className="label">Co wyróżnia Twoją markę? (opcjonalnie)</label>
                <input className="input" placeholder="np. Jedyne dwujęzyczne przedszkole Montessori w Warszawie"
                  value={usp} onChange={e=>setUsp(e.target.value)}/>
              </div>
            </div>
          )}

          {/* Step 2 — Platforms */}
          {step===2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Platformy social media</h2>
                <p className="text-gray-500 text-sm">Gdzie publikujesz treści?</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map(p=>(
                  <button key={p.id} onClick={()=>togglePlatform(p.id as Platform)}
                    className="flex items-center gap-3 p-4 rounded-xl border transition-all text-left"
                    style={{
                      background:platforms.includes(p.id as Platform)?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',
                      borderColor:platforms.includes(p.id as Platform)?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.08)',
                    }}>
                    <PlatformIcon platform={p.id} size={28}/>
                    <div>
                      <p className={`text-sm font-semibold ${platforms.includes(p.id as Platform)?'text-indigo-300':'text-gray-400'}`}>{p.name}</p>
                      <p className="text-[10px] text-gray-600">{p.format}</p>
                    </div>
                    {platforms.includes(p.id as Platform) && (
                      <span className="ml-auto text-indigo-400">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Tone */}
          {step===3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Ton komunikacji</h2>
                <p className="text-gray-500 text-sm">Jak Twoja marka rozmawia z klientami?</p>
              </div>
              <div className="space-y-2">
                {TONES.map(t=>(
                  <button key={t.id} onClick={()=>setTone(t.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left"
                    style={{
                      background:tone===t.id?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.03)',
                      borderColor:tone===t.id?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.07)',
                    }}>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${tone===t.id?'text-indigo-300':'text-gray-300'}`}>{t.label}</p>
                      <p className="text-xs text-gray-600">{t.desc}</p>
                    </div>
                    {tone===t.id && <span className="text-indigo-400 shrink-0">✓</span>}
                  </button>
                ))}
              </div>
              <div>
                <label className="label">Kim są Twoi klienci? (opcjonalnie)</label>
                <input className="input" placeholder="np. Mamy dzieci w wieku 2-6 lat, świadome i wymagające"
                  value={persona} onChange={e=>setPersona(e.target.value)}/>
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step===4 && (
            <div className="text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <h2 className="text-2xl font-bold text-white">Gotowe!</h2>
              <p className="text-gray-400 leading-relaxed">
                Brand DNA dla <strong className="text-white">{brandName}</strong> jest gotowe. AI teraz zna Twoją markę i będzie pisać idealnie dopasowane treści.
              </p>
              <div className="p-4 rounded-2xl text-left space-y-2" style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)'}}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Marka</span><span className="text-white font-medium">{brandName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Branża</span><span className="text-white">{industry==='Inne'?customIndustry:industry}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ton</span><span className="text-white">{tone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Platformy</span>
                  <span className="text-white">{platforms.join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step>0 && (
              <button onClick={()=>setStep(s=>s-1)} className="btn-secondary flex-1">← Wstecz</button>
            )}
            {step<4 ? (
              <button onClick={()=>setStep(s=>s+1)} disabled={!canNext[step]}
                className="btn-primary flex-1 disabled:opacity-40">
                Dalej →
              </button>
            ) : (
              <button onClick={finish} disabled={loading}
                className="btn-primary flex-1 py-3 text-base">
                {loading ? 'Konfiguruję...' : '🚀 Wejdź do SocialMind'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
