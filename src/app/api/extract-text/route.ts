import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 })
    }

    const filename = file.name.toLowerCase()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ''

    if (filename.endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else if (filename.endsWith('.pdf')) {
      // Dynamic import to avoid bundling issues
      // @ts-expect-error - pdf-parse types not yet installed
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      text = data.text
    } else if (filename.endsWith('.docx')) {
      // @ts-expect-error - mammoth types not yet installed
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (filename.endsWith('.doc')) {
      return NextResponse.json({ 
        error: 'Format .doc nie jest obsługiwany. Konwertuj plik do .docx lub .pdf' 
      }, { status: 400 })
    } else {
      return NextResponse.json({ 
        error: 'Obsługiwane formaty: PDF, DOCX, TXT' 
      }, { status: 400 })
    }

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Nie udało się wyodrębnić tekstu z pliku. Plik może być pusty lub zaszyfrowany.' 
      }, { status: 400 })
    }

    return NextResponse.json({ ok: true, text: text.slice(0, 50000) })
  } catch (err) {
    console.error('Extract error:', err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Błąd przetwarzania pliku' 
    }, { status: 500 })
  }
}
