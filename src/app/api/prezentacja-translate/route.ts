import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { repairAIJSON } from '@/lib/repairJSON'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const maxDuration = 180

interface Slide {
  id: string
  type: string
  title: string
  subtitle?: string
  content?: string[]
  speakerNotes?: string
  imageIdea?: string
  imageUrl?: string
  imagePlacement?: string
}

interface Presentation {
  title: string
  subtitle?: string
  totalSlides: number
  slides: Slide[]
}

export async function POST(req: NextRequest) {
  const limit = await checkGenerationLimit()
  if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 })

  const { presentation, targetLang } = await req.json() as {
    presentation: Presentation
    targetLang: 'en' | 'pl'
  }

  if (!presentation?.slides?.length) {
    return NextResponse.json({ error: 'Brak prezentacji do tłumaczenia' }, { status: 400 })
  }

  const langName = targetLang === 'en' ? 'English' : 'Polish (Polski)'
  const sourceLang = targetLang === 'en' ? 'Polish' : 'English'

  // Build slim version - only translatable fields, keep IDs and types
  const translatable = {
    title: presentation.title,
    subtitle: presentation.subtitle || '',
    slides: presentation.slides.map(s => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle || '',
      content: s.content || [],
      speakerNotes: s.speakerNotes || '',
      imageIdea: s.imageIdea || '',
    }))
  }

  const prompt = `You are a professional translator specializing in business presentations and marketing content.

TASK: Translate this presentation from ${sourceLang} to ${langName}.

RULES:
1. Preserve the EXACT structure - same number of slides, same order, same array lengths
2. Keep ALL IDs unchanged (id field)
3. Translate naturally - not word-for-word, but capturing the meaning and tone
4. Keep brand names, product names, and proper nouns unchanged
5. Numbers, percentages, dates - keep as-is unless format differs (e.g. 1,000 vs 1.000)
6. Keep the same professional tone as the original
7. Marketing/business idioms should be adapted to natural ${langName} equivalents
8. Image descriptions (imageIdea) - translate to ${langName === 'English' ? 'English' : 'Polish'} - they are used as AI image prompts

Return ONLY the JSON, no markdown, no preamble. Same structure as input but with translated text:

INPUT PRESENTATION:
${JSON.stringify(translatable, null, 2)}

Return JSON in this exact shape (translate ALL text fields):
{
  "title": "translated presentation title",
  "subtitle": "translated subtitle",
  "slides": [
    {
      "id": "keep-original-id",
      "title": "translated title",
      "subtitle": "translated subtitle or empty",
      "content": ["translated bullet 1", "translated bullet 2"],
      "speakerNotes": "translated speaker notes",
      "imageIdea": "translated image description"
    }
  ]
}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const { parsed, strategy } = repairAIJSON(raw)
    if (!parsed) {
      console.error('Translate parse failed. Raw len:', raw.length)
      return NextResponse.json({ error: 'Nie mozna sparsowac tlumaczenia' }, { status: 500 })
    }
    console.log('Translate parsed via:', strategy)

    const translated = parsed as Presentation
    
    // Merge translated text back into original presentation, preserving non-text fields
    const mergedSlides = presentation.slides.map((origSlide, i) => {
      const transSlide = translated.slides?.[i] || translated.slides?.find(s => s.id === origSlide.id)
      if (!transSlide) return origSlide
      return {
        ...origSlide,  // keep type, imageUrl, imagePlacement
        title: transSlide.title || origSlide.title,
        subtitle: transSlide.subtitle ?? origSlide.subtitle,
        content: transSlide.content && transSlide.content.length > 0 ? transSlide.content : origSlide.content,
        speakerNotes: transSlide.speakerNotes ?? origSlide.speakerNotes,
        imageIdea: transSlide.imageIdea ?? origSlide.imageIdea,
      }
    })

    const result: Presentation = {
      ...presentation,
      title: translated.title || presentation.title,
      subtitle: translated.subtitle ?? presentation.subtitle,
      slides: mergedSlides,
    }

    return NextResponse.json({ ok: true, data: result })
  } catch (e) {
    console.error('Translate error:', e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Bad tlumaczenia'
    }, { status: 500 })
  }
}
