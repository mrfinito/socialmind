import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const url = formData.get('url') as string | null
    const description = formData.get('description') as string | null
    const brandingNotes = formData.get('brandingNotes') as string | null
    const images = formData.getAll('images') as File[]
    const logos = formData.getAll('logos') as File[]
    const docs = formData.getAll('docs') as File[]

    const contentParts: Anthropic.MessageParam['content'] = []

    // Process logo files first (priority for visual analysis)
    const logoBase64List: string[] = []
    for (const logo of logos.slice(0, 2)) {
      const buffer = await logo.arrayBuffer()
      const b64 = Buffer.from(buffer).toString('base64')
      const mediaType = (logo.type || 'image/png') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      logoBase64List.push(`data:${mediaType};base64,${b64}`)
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } })
    }

    // Process brand images
    for (const img of images.slice(0, 3)) {
      const buffer = await img.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mediaType = (img.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } })
    }

    // Process text docs
    const docTexts: string[] = []
    for (const doc of docs.slice(0, 3)) {
      if (doc.type === 'text/plain') {
        const text = await doc.text()
        docTexts.push(text.slice(0, 2000))
      }
    }

    const hasLogo = logos.length > 0
    const hasImages = images.length > 0

    const textPrompt = `Jestes ekspertem od brand strategy i identyfikacji wizualnej. Przeanalizuj ponizsze materialy i stworz kompletny profil marki.

${url ? `URL strony: ${url}` : ''}
${description ? `Opis marki: ${description}` : ''}
${docTexts.length ? `Dokumenty:\n${docTexts.join('\n---\n')}` : ''}
${hasLogo ? `\nDolaczono logo marki (${logos.length} plik/ow) — przeanalizuj dokladnie: kolory, ksztalt, styl, typografie.` : ''}
${hasImages ? `\nDolaczono ${images.length} materialow wizualnych — przeanalizuj styl wizualny.` : ''}
${brandingNotes ? `\nDodatkowe wytyczne graficzne od uzytkownika:\n${brandingNotes}` : ''}

Odpowiedz TYLKO w formacie JSON (bez markdown, bez komentarzy):
{
  "industry": "branza (max 4 slowa)",
  "persona": "opis persony docelowej (2 zdania)",
  "values": "3-4 wartosci marki oddzielone przecinkami",
  "usp": "unikalna propozycja wartosci (1 zdanie)",
  "tone": "opis tonu komunikacji (2-3 zdania)",
  "keywords": "10 slow kluczowych/hashtagow oddzielonych spacjami",
  "masterPrompt": "system prompt do generowania tresci tej marki (4-5 zdan)",
  "brandName": "nazwa marki",
  "brandShort": "2-3 litery skrotu",
  "dominantColors": ["#hex1", "#hex2", "#hex3"],
  "visuals": {
    "dominantColors": ["#hex1", "#hex2", "#hex3", "#hex4"],
    "fontStyle": "${hasLogo ? 'opisz styl typografii z logo' : 'brak danych — wpisz unknown'}",
    "visualStyle": "opisz styl wizualny marki (np. minimalistyczny, luksusowy, technologiczny, organiczny)",
    "brandingNotes": "${brandingNotes || 'brak dodatkowych wytycznych'}",
    "logoPosition": "bottom-right",
    "logoSizePercent": 15
  }
}`

    contentParts.push({ type: 'text', text: textPrompt })

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: contentParts }],
    })

    const text = response.content.map(b => (b.type === 'text' ? b.text : '')).join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Attach logo base64 to response so frontend can use it in editor
    if (logoBase64List.length > 0) {
      parsed.visuals = parsed.visuals || {}
      parsed.visuals.logoUrl = logoBase64List[0]
      parsed.visuals.logoFileName = logos[0]?.name || 'logo'
    }

    return NextResponse.json({ ok: true, dna: parsed })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Blad analizy marki' }, { status: 500 })
  }
}
