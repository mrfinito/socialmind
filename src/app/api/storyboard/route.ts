import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkGenerationLimit } from '@/lib/checkLimits'
import { robustParse } from '@/lib/parseJSON'
import { checkAnthropicKey } from '@/lib/aiGuards'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const _envGuard = checkAnthropicKey()
  if (_envGuard) return _envGuard

  const limit = await checkGenerationLimit()
  if (!limit.allowed) return NextResponse.json({ error: limit.reason }, { status: 429 })

  const { topic, platform, duration, vibe, hookType, dna } = await req.json() as {
    topic: string
    platform: 'reels' | 'tiktok' | 'shorts'
    duration: number // seconds
    vibe: string
    hookType?: string
    dna?: { brandName?: string; tone?: string }
  }

  if (!topic || topic.trim().length < 3) {
    return NextResponse.json({ error: 'Opisz temat wideo' }, { status: 400 })
  }

  const platformInfo = {
    reels: { aspect: '9:16', max: 90, name: 'Instagram Reels' },
    tiktok: { aspect: '9:16', max: 60, name: 'TikTok' },
    shorts: { aspect: '9:16', max: 60, name: 'YouTube Shorts' },
  }
  const p = platformInfo[platform] || platformInfo.reels
  const targetDuration = Math.min(Math.max(duration || 30, 7), p.max)

  const system = `Jestes senior wideo directorem specjalizujacym sie w short-form (Reels/TikTok/Shorts). Tworzysz storyboardy ktore:
- Maja killer hook w pierwszych 1-3 sekundach
- Stosuja patterns (pattern interrupt, pacing, retention curves)
- Sa konkretne i wykonalne (operator wie co krecic)
- Maja jasny CTA na koncu

Odpowiadasz WYLACZNIE poprawnym JSON.`

  const prompt = `STWORZ STORYBOARD wideo ${p.name} (${p.aspect}, ${targetDuration}s)

TEMAT: ${topic}
${vibe ? `VIBE/STYL: ${vibe}` : ''}
${hookType ? `TYP HOOKA: ${hookType}` : ''}
${dna?.brandName ? `MARKA: ${dna.brandName} (ton: ${dna.tone || 'profesjonalny'})` : ''}

Zwroc JSON:
{
  "title": "Tytul scenariusza",
  "hookText": "Co mowi/pokazuje hook na ekranie w pierwszych 2s",
  "totalDuration": ${targetDuration},
  "shots": [
    {
      "shotNumber": 1,
      "startTime": 0,
      "duration": 2,
      "type": "hook|build|value|cta|outro",
      "description": "Co dokladnie krecimy - bardzo konkretnie",
      "shotType": "close-up|medium|wide|POV|cutaway|talking-head",
      "onScreenText": "Tekst ktory pojawia sie na ekranie",
      "voiceover": "Co mowi narrator/osoba na ekranie",
      "audioCue": "muzyka|sound effect|cisza",
      "transition": "cut|fade|swipe|zoom",
      "tip": "Tip dla operatora/montazysty"
    }
    // ... 5-10 shots
  ],
  "audio": {
    "musicSuggestion": "Typ muzyki: trending TikTok / cinematic / upbeat",
    "soundEffects": ["whoosh przy cuts", "ding przy reveals"],
    "voiceoverTone": "energetyczny|spokojny|tajemniczy"
  },
  "production": {
    "totalShots": 6,
    "estimatedShootTime": "30-45 min",
    "equipment": ["Smartphone", "Statyw", "Mikrofon zewnetrzny"],
    "locations": ["Biuro", "Plener"],
    "props": ["Produkt", "Tlo"]
  },
  "caption": {
    "hook": "Pierwsza linia captiona ktora sprawia ze ludzie czytaja dalej",
    "body": "Glowny tekst",
    "cta": "Call to action",
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  },
  "retention_tips": [
    "Tip 1 - jak utrzymac uwage w 3-5s",
    "Tip 2 - jak zwiekszyc completion rate",
    "Tip 3 - jak pchnac do kolejnego watch"
  ]
}

WAZNE: Pierwsze ujecie MUSI miec hook ktory zatrzymuje scrollowanie. Ostatnie ujecie MUSI miec CTA.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = response.content
    .map((b: { type: string; text?: string }) => b.type === 'text' ? b.text : '').join('')

  const parsed = robustParse(raw)
  if (!parsed) return NextResponse.json({ error: 'Blad parsowania' }, { status: 500 })
  return NextResponse.json({ ok: true, data: parsed })
}
