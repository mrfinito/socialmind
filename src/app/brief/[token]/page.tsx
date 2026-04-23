'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const QUESTIONS = [
  { id:'brandName',     label:'Nazwa marki lub firmy',          placeholder:'np. Kids&Co, Studio Primo',        required:true },
  { id:'industry',      label:'Branża / czym się zajmujecie',   placeholder:'np. Przedszkole dwujęzyczne, Agencja reklamowa', required:true },
  { id:'usp',          label:'Co wyróżnia Was na tle konkurencji?', placeholder:'Co robicie lepiej lub inaczej niż inni?', required:true },
  { id:'targetAudience',label:'Kim są Wasi klienci?',           placeholder:'Opisz swoją grupę docelową — wiek, kim są, czego szukają', required:true },
  { id:'values',       label:'Wartości marki',                  placeholder:'np. Bezpieczeństwo, innowacyjność, bliskość z klientem', required:false },
  { id:'competitors',  label:'Główni konkurenci',               placeholder:'Kto jest Waszą największą konkurencją?', required:false },
  { id:'tone',         label:'Ton komunikacji',                 type:'select', options:['Profesjonalny','Przyjazny i ciepły','Inspirujący','Zabawny i lekki','Ekspercki','Premium / ekskluzywny'], required:true },
  { id:'keywords',     label:'Ważne słowa kluczowe',            placeholder:'Słowa/frazy które chcecie używać w komunikacji', required:false },
  { id:'goals',        label:'Cele social media',               placeholder:'Co chcecie osiągnąć przez social media? np. zwiększenie zapisów, świadomość marki', required:false },
  { id:'extra',        label:'Cokolwiek ważnego czego nie ma powyżej', placeholder:'Dodatkowe informacje dla agencji', required:false },
]

export default function BriefPage() {
  const { token } = useParams()
  const supabase = createClient()
  const [brief, setBrief] = useState<{client_name?:string;status?:string}|null>(null)
  const [status, setStatus] = useState<'loading'|'valid'|'invalid'|'completed'>('loading')
  const [responses, setResponses] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)

  useEffect(() => {
    async function check() {
      const { data, error } = await supabase.from('briefs').select('*').eq('token', token).single()
      if (error || !data) { setStatus('invalid'); return }
      if (data.status === 'completed') { setStatus('completed'); setBrief(data); return }
      setBrief(data)
      setStatus('valid')
    }
    check()
  }, [token])

  function setResponse(id: string, value: string) {
    setResponses(prev => ({ ...prev, [id]: value }))
  }

  async function submit() {
    const required = QUESTIONS.filter(q => q.required).every(q => responses[q.id]?.trim())
    if (!required) { alert('Wypełnij wymagane pola'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/brief/submit', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ token, responses })
      })
      if (!res.ok) throw new Error('Błąd')
      setDone(true)
    } catch { alert('Wystąpił błąd — spróbuj ponownie') }
    finally { setLoading(false) }
  }

  const progress = Math.round((Object.keys(responses).filter(k=>responses[k]).length / QUESTIONS.length)*100)

  if (status==='loading') return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <p className="text-gray-500">Ładowanie formularza...</p>
    </div>
  )

  if (status==='invalid') return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-4xl mb-3">❌</p>
        <p className="text-white font-semibold">Nieprawidłowy link</p>
        <p className="text-gray-500 text-sm mt-1">Ten formularz nie istnieje lub link jest błędny</p>
      </div>
    </div>
  )

  if (status==='completed' || done) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">🎉</p>
        <h1 className="text-2xl font-bold text-white mb-2">Dziękujemy!</h1>
        <p className="text-gray-400 leading-relaxed">
          Brief został wysłany do agencji. Wkrótce skontaktujemy się z Tobą z przygotowaną strategią.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f1117] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-2xl mb-4"
            style={{boxShadow:'0 0 24px rgba(99,102,241,0.4)'}}>
            <span className="text-white text-xl">✦</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Brief klienta</h1>
          {brief?.client_name && <p className="text-gray-500">dla: {brief.client_name}</p>}
          <p className="text-gray-600 text-sm mt-2">Wypełnienie zajmie ok. 10-15 minut</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>Postęp</span><span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{width:`${progress}%`}}/>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-5">
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className="rounded-2xl p-5" style={{background:'#181c27',border:'1px solid rgba(255,255,255,0.07)'}}>
              <label className="block text-sm font-semibold text-white mb-2">
                {i+1}. {q.label}
                {q.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {q.type==='select' ? (
                <select className="input w-full" value={responses[q.id]||''} onChange={e=>setResponse(q.id,e.target.value)}>
                  <option value="">Wybierz...</option>
                  {q.options?.map(opt=><option key={opt} value={opt.toLowerCase()}>{opt}</option>)}
                </select>
              ) : (
                <textarea className="input w-full resize-y" style={{minHeight:80}}
                  placeholder={q.placeholder}
                  value={responses[q.id]||''}
                  onChange={e=>setResponse(q.id,e.target.value)}/>
              )}
            </div>
          ))}
        </div>

        <button onClick={submit} disabled={loading}
          className="btn-primary w-full py-4 text-base mt-8">
          {loading ? 'Wysyłam...' : '📤 Wyślij brief →'}
        </button>
        <p className="text-center text-xs text-gray-700 mt-4">
          Twoje odpowiedzi zostaną przekazane bezpośrednio do agencji
        </p>
      </div>
    </div>
  )
}
