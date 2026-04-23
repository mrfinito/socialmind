import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { token, responses } = await req.json()
  const admin = createAdminClient()

  const { data: brief, error: findErr } = await admin.from('briefs').select('*').eq('token', token).single()
  if (findErr || !brief) return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
  if (brief.status === 'completed') return NextResponse.json({ error: 'Already submitted' }, { status: 400 })

  // Build DNA from responses
  const dna = {
    brandName: responses.brandName || '',
    industry: responses.industry || '',
    persona: responses.targetAudience || '',
    values: responses.values || '',
    usp: responses.usp || '',
    tone: responses.tone || 'profesjonalny',
    keywords: responses.keywords || '',
    masterPrompt: `Jesteś copywriterem dla marki ${responses.brandName}. Branża: ${responses.industry}. Ton: ${responses.tone}. Grupa docelowa: ${responses.targetAudience}. USP: ${responses.usp}.`,
  }

  // Update brief
  await admin.from('briefs').update({
    status: 'completed',
    responses,
    completed_at: new Date().toISOString(),
  }).eq('token', token)

  // Update or create project with DNA
  if (brief.project_id) {
    await admin.from('projects').update({ dna, updated_at: new Date().toISOString() }).eq('id', brief.project_id)
  }

  return NextResponse.json({ ok: true })
}
