import { NextRequest, NextResponse } from 'next/server'
import { checkGenerationLimit } from '@/lib/checkLimits'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function robustParse(raw: string) {
  let clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  if (s !== -1 && e !== -1) {
    clean = clean.slice(s, e + 1)
    try { return JSON.parse(clean) } catch {}
    clean = clean
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/,(\s*[}\]])/g, '$1')
    try { return JSON.parse(clean) } catch {}
  }
  // Last resort — return minimal valid structure
  return null
}

export async function POST(req: NextRequest) {
  try {
  // Check generation limit
  const limitCheck = await checkGenerationLimit()
  if (!limitCheck.allowed) {
    return NextResponse.json({
      error: limitCheck.reason || 'Przekroczono limit generowania',
      limit_exceeded: true,
      used: limitCheck.used,
      limit: limitCheck.limit,
    }, { status: 429 })
  }

    const { topic, platform, duration, style, masterPrompt, brandName } = await req.json()

    if (!topic?.trim()) throw new Error('Brak tematu wideo')

    const durationSecs = { '15s': 15, '30s': 30, '60s': 60, '90s': 90, '3min': 180 }[duration as string] || 60
    const sceneCount = Math.min(Math.max(3, Math.floor(durationSecs / 10)), 8)

    const prompt = `${(masterPrompt || '').slice(0, 200)}
Jestes ekspertem od content wideo na social media.

Stwórz skrypt wideo:
Platforma: ${platform || 'tiktok'} (${duration || '60s'})
Marka: ${brandName || 'Marka'}
Temat: ${topic}
Styl: ${style || 'dynamiczny'}

Odpowiedz TYLKO czystym JSON bez zadnego tekstu przed lub po:

{"title":"tytul skryptu","platform":"${platform || 'tiktok'}","duration":"${duration || '60s'}","style":"${style || 'dynamiczny'}","hook":{"text":"pierwsze zdanie max 8 slow","visual":"co widac na ekranie","caption":"tekst overlay","duration":3},"scenes":[{"number":1,"duration":8,"script":"co mowi tworca","visual":"opis ujecia","caption":"tekst na ekranie","cameraNote":"wskazowka montazu","emotion":"emocja"},{"number":2,"duration":8,"script":"kolejna scena","visual":"opis","caption":"tekst","cameraNote":"wskazowka","emotion":"emocja"},{"number":3,"duration":8,"script":"kolejna scena","visual":"opis","caption":"tekst","cameraNote":"wskazowka","emotion":"emocja"}],"cta":{"text":"wezwanie do akcji","visual":"co widac","caption":"tekst CTA"},"music":{"mood":"nastroj","bpm":"120 BPM","suggestion":"gatunek muzyki"},"hashtags":["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5"],"caption":"opis posta z hashtagami do 2200 znakow","tips":["wskazowka 1","wskazowka 2","wskazowka 3"],"totalWords":120,"readingPace":"150 slow/min"}

Wygeneruj ${sceneCount} scen. Bądź konkretny, podawaj realne opisy wizualne i wskazówki montażu.`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const parsed = robustParse(rawText)
    if (!parsed) throw new Error('Nie mozna przetworzyc odpowiedzi — sprobuj ponownie')

    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error('Video script error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Blad generowania skryptu'
    }, { status: 500 })
  }
}
