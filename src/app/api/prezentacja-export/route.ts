import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120
export const runtime = 'nodejs'

interface Slide {
  id: string
  type: 'title' | 'section' | 'content' | 'stats' | 'quote' | 'comparison' | 'cta'
  title: string
  subtitle?: string
  content?: string[]
  speakerNotes?: string
  imageUrl?: string
  imagePlacement?: 'side' | 'background' | 'full'
}

interface Presentation {
  title: string
  subtitle?: string
  slides: Slide[]
  theme?: {
    primary?: string
    secondary?: string
    background?: string
    text?: string
  }
}

// Layout 16:9 widescreen = 13.33 x 7.5 inches
const SLIDE_W = 13.33
const SLIDE_H = 7.5

export async function POST(req: NextRequest) {
  try {
    const { presentation } = await req.json() as { presentation: Presentation }
    if (!presentation?.slides?.length) {
      return NextResponse.json({ error: 'Brak slajdow' }, { status: 400 })
    }

    const PptxGenJS = (await import('pptxgenjs')).default
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'
    pptx.title = presentation.title
    pptx.author = 'SocialMind'

    const theme = {
      primary: presentation.theme?.primary || '6366F1',
      secondary: presentation.theme?.secondary || 'A855F7',
      background: presentation.theme?.background || '0F1117',
      text: presentation.theme?.text || 'FFFFFF',
    }

    for (const slide of presentation.slides) {
      const pSlide = pptx.addSlide()
      pSlide.background = { color: theme.background }

      if (slide.speakerNotes) {
        pSlide.addNotes(slide.speakerNotes)
      }

      const hasImage = !!slide.imageUrl && (slide.imageUrl.startsWith('http') || slide.imageUrl.startsWith('data:'))
      const placement = slide.imagePlacement || 'side'
      const isInline = !!slide.imageUrl && slide.imageUrl.startsWith('data:')

      // === IMAGE AS BACKGROUND or FULL ===
      if (hasImage && (placement === 'background' || placement === 'full')) {
        try {
          const imgOpts = isInline
            ? { data: slide.imageUrl as string }
            : { path: slide.imageUrl as string }
          pSlide.addImage({
            ...imgOpts,
            x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
            sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H },
          })
        } catch {}

        if (placement === 'background') {
          // Semi-transparent overlay so text is readable
          pSlide.addShape('rect', {
            x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
            fill: { color: theme.background, transparency: 40 },
            line: { color: theme.background, width: 0 },
          })
        }
        if (placement === 'full') {
          if (slide.type !== 'title') {
            pSlide.addText(`${presentation.slides.indexOf(slide) + 1} / ${presentation.slides.length}`, {
              x: 11.5, y: 6.95, w: 1.3, h: 0.3,
              fontSize: 10, color: theme.text, fontFace: 'Inter',
              align: 'right',
            })
          }
          continue
        }
      }

      const sideImage = hasImage && placement === 'side'

      switch (slide.type) {
        case 'title': {
          pSlide.addText(slide.title, {
            x: 0.5, y: 2.5, w: SLIDE_W - 1, h: 1.8,
            fontSize: 56, bold: true, color: theme.text,
            align: 'center', fontFace: 'Inter',
          })
          if (slide.subtitle) {
            pSlide.addText(slide.subtitle, {
              x: 0.5, y: 4.4, w: SLIDE_W - 1, h: 1,
              fontSize: 24, color: theme.primary,
              align: 'center', fontFace: 'Inter',
            })
          }
          pSlide.addShape('rect', {
            x: SLIDE_W / 2 - 0.5, y: 5.6, w: 1, h: 0.05,
            fill: { color: theme.primary }, line: { color: theme.primary, width: 0 },
          })
          break
        }

        case 'section': {
          pSlide.addText(slide.title, {
            x: 0.7, y: 2.8, w: SLIDE_W - 1.4, h: 1.5,
            fontSize: 60, bold: true, color: theme.primary,
            align: 'left', fontFace: 'Inter',
          })
          if (slide.subtitle) {
            pSlide.addText(slide.subtitle, {
              x: 0.7, y: 4.4, w: SLIDE_W - 1.4, h: 0.8,
              fontSize: 20, color: theme.text,
              align: 'left', fontFace: 'Inter',
            })
          }
          break
        }

        case 'quote': {
          const quote = slide.content?.[0] || slide.title
          const author = slide.content?.[1]
          pSlide.addText(`"${quote}"`, {
            x: 1, y: 2.5, w: SLIDE_W - 2, h: 2,
            fontSize: 36, italic: true, color: theme.text,
            align: 'center', fontFace: 'Georgia',
          })
          if (author) {
            pSlide.addText(`— ${author}`, {
              x: 1, y: 4.7, w: SLIDE_W - 2, h: 0.5,
              fontSize: 18, color: theme.primary,
              align: 'center', fontFace: 'Inter',
            })
          }
          break
        }

        case 'stats': {
          pSlide.addText(slide.title, {
            x: 0.5, y: 0.4, w: SLIDE_W - 1, h: 0.8,
            fontSize: 30, bold: true, color: theme.text,
            align: 'left', fontFace: 'Inter',
          })
          const stats = slide.content || []
          const cols = stats.length === 4 ? 2 : Math.min(stats.length, 3)
          const cellW = (SLIDE_W - 1.5) / cols
          stats.forEach((s, i) => {
            const [num, ...rest] = s.split(':')
            const desc = rest.join(':').trim()
            const col = i % cols
            const row = Math.floor(i / cols)
            const xPos = 0.75 + col * cellW
            const yPos = 2 + row * 2.2
            pSlide.addText(num.trim(), {
              x: xPos, y: yPos, w: cellW, h: 1.2,
              fontSize: 60, bold: true, color: theme.primary,
              align: 'center', fontFace: 'Inter',
            })
            if (desc) {
              pSlide.addText(desc, {
                x: xPos, y: yPos + 1.2, w: cellW, h: 0.6,
                fontSize: 14, color: theme.text,
                align: 'center', fontFace: 'Inter',
              })
            }
          })
          break
        }

        case 'comparison': {
          pSlide.addText(slide.title, {
            x: 0.5, y: 0.4, w: SLIDE_W - 1, h: 0.8,
            fontSize: 28, bold: true, color: theme.text,
            align: 'center', fontFace: 'Inter',
          })
          const items = slide.content || []
          const left = items.filter((_, i) => i % 2 === 0)
          const right = items.filter((_, i) => i % 2 === 1)
          left.forEach((l, i) => {
            pSlide.addText(`• ${l}`, {
              x: 0.7, y: 1.7 + i * 0.7, w: SLIDE_W / 2 - 1, h: 0.6,
              fontSize: 18, color: theme.text, fontFace: 'Inter',
            })
          })
          right.forEach((r, i) => {
            pSlide.addText(`• ${r}`, {
              x: SLIDE_W / 2 + 0.3, y: 1.7 + i * 0.7, w: SLIDE_W / 2 - 1, h: 0.6,
              fontSize: 18, color: theme.text, fontFace: 'Inter',
            })
          })
          pSlide.addShape('rect', {
            x: SLIDE_W / 2 - 0.025, y: 1.5, w: 0.05, h: 5,
            fill: { color: theme.primary }, line: { color: theme.primary, width: 0 },
          })
          break
        }

        case 'cta': {
          pSlide.addText(slide.title, {
            x: 0.5, y: 2.8, w: SLIDE_W - 1, h: 1.5,
            fontSize: 44, bold: true, color: theme.primary,
            align: 'center', fontFace: 'Inter',
          })
          if (slide.content && slide.content.length > 0) {
            pSlide.addText(slide.content.join(' · '), {
              x: 1, y: 4.5, w: SLIDE_W - 2, h: 1,
              fontSize: 20, color: theme.text,
              align: 'center', fontFace: 'Inter',
            })
          }
          break
        }

        default: {
          const titleW = sideImage ? 7.5 : SLIDE_W - 1
          pSlide.addText(slide.title, {
            x: 0.5, y: 0.4, w: titleW, h: 0.8,
            fontSize: 30, bold: true, color: theme.text,
            align: 'left', fontFace: 'Inter',
          })
          if (slide.content && slide.content.length > 0) {
            const bulletItems = slide.content.map(c => ({
              text: c,
              options: { bullet: { code: '25CF' }, fontSize: 18, color: theme.text },
            }))
            pSlide.addText(bulletItems, {
              x: 0.6, y: 1.5, w: sideImage ? 7.4 : SLIDE_W - 1.2, h: 5,
              fontFace: 'Inter', paraSpaceBefore: 12,
            })
          }
          if (sideImage && slide.imageUrl) {
            try {
              const imgOpts = isInline
                ? { data: slide.imageUrl }
                : { path: slide.imageUrl }
              pSlide.addImage({
                ...imgOpts,
                x: 8.3, y: 1.5, w: 4.5, h: 5,
              })
            } catch {}
          }
          break
        }
      }

      if (slide.type !== 'title') {
        pSlide.addText(`${presentation.slides.indexOf(slide) + 1} / ${presentation.slides.length}`, {
          x: 11.5, y: 6.95, w: 1.3, h: 0.3,
          fontSize: 10, color: theme.primary,
          align: 'right', fontFace: 'Inter',
        })
      }
    }

    const buf = await pptx.write({ outputType: 'nodebuffer' }) as Buffer
    const base64 = Buffer.from(buf).toString('base64')
    const filename = `${(presentation.title || 'prezentacja').replace(/[^a-zA-Z0-9_\-\s]/g, '').slice(0, 80) || 'prezentacja'}.pptx`
    return NextResponse.json({ ok: true, base64, filename })
  } catch (e) {
    console.error('PPTX export error:', e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Bad eksportu'
    }, { status: 500 })
  }
}
