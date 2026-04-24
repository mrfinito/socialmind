import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { robustParse } from '@/lib/parseJSON'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nie zalogowany' }, { status: 401 })

    const { brief_id } = await req.json()
    if (!brief_id) return NextResponse.json({ error: 'Brak brief_id' }, { status: 400 })

    const admin = createAdminClient()
    const { data: brief } = await admin
      .from('client_briefs')
      .select('*')
      .eq('id', brief_id)
      .eq('agency_user_id', user.id)
      .maybeSingle()

    if (!brief || !brief.responses) {
      return NextResponse.json({ error: 'Brief nie wypełniony' }, { status: 400 })
    }

    const r = brief.responses as Record<string, unknown>
    const prompt = `Jestes doswiadczonym strategiem marki i komunikacji. Na podstawie briefu klienta stworz:
1. Brand DNA (tozsamosc marki)
2. Wstepna strategie komunikacji w social media

BRIEF KLIENTA:
Nazwa firmy: ${r.business_name || brief.business_name || 'brak'}
Branza: ${r.industry || 'brak'}
Opis firmy: ${r.description || 'brak'}
Produkty/uslugi: ${r.products || 'brak'}
Grupa docelowa: ${r.target_audience || 'brak'}
Konkurenci: ${r.competitors || 'brak'}
Co wyroznia firme: ${r.unique_value || 'brak'}
Cele biznesowe: ${r.business_goals || 'brak'}
Cele social media: ${r.social_goals || 'brak'}
Budzet miesieczny: ${r.budget || 'brak'}
Platformy: ${r.platforms || 'facebook, instagram'}
Ton komunikacji: ${r.tone_preference || 'brak'}
Wartosci marki: ${r.values || 'brak'}
Dodatkowe info: ${r.additional_info || 'brak'}

Odpowiedz TYLKO czystym JSON bez markdown:
{
  "dna": {
    "brandName": "nazwa marki",
    "industry": "branza",
    "usp": "unikalna propozycja wartosci - 1-2 zdania konkretne",
    "tone": "opis tonu komunikacji - 2-3 zdania, jak marka powinna brzmiec",
    "persona": "szczegolowy opis person klienta - demografia, psychografia, zachowania",
    "values": "kluczowe wartosci marki - 3-5 wartosci oddzielonych przecinkami",
    "keywords": "slowa kluczowe zwiazane z marka - 8-10 oddzielonych przecinkami",
    "doList": ["co robic w komunikacji 1", "co robic 2", "co robic 3", "co robic 4"],
    "dontList": ["czego unikac 1", "czego unikac 2", "czego unikac 3"]
  },
  "strategy": {
    "executiveSummary": "streszczenie strategii 3-4 zdania",
    "recommendations": ["kluczowa rekomendacja strategiczna 1", "rekomendacja 2", "rekomendacja 3", "rekomendacja 4"],
    "contentPillars": [
      {"name": "Filar 1", "description": "opis", "percentage": 30},
      {"name": "Filar 2", "description": "opis", "percentage": 25},
      {"name": "Filar 3", "description": "opis", "percentage": 25},
      {"name": "Filar 4", "description": "opis", "percentage": 20}
    ],
    "platformApproach": {
      "facebook": "konkretne rekomendacje dla FB",
      "instagram": "konkretne rekomendacje dla IG"
    },
    "nextSteps": ["pierwszy krok do wdrozenia", "drugi krok", "trzeci krok", "czwarty krok"]
  }
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content
      .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '')
      .join('')

    const parsed = robustParse(raw) as { dna: unknown; strategy: unknown }

    // Save to brief
    await admin
      .from('client_briefs')
      .update({
        generated_dna: parsed.dna,
        generated_strategy: parsed.strategy,
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', brief_id)

    return NextResponse.json({ ok: true, dna: parsed.dna, strategy: parsed.strategy })
  } catch (err) {
    console.error('Brief process error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad' }, { status: 500 })
  }
}
