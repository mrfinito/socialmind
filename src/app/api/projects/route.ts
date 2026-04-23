import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkProjectLimit } from '@/lib/checkLimits'

export async function POST(req: NextRequest) {
  try {
    const limitCheck = await checkProjectLimit()
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: limitCheck.reason,
        limit_exceeded: true,
        used: limitCheck.used,
        limit: limitCheck.limit,
      }, { status: 429 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await supabase.from('projects').insert({
      ...body, user_id: user.id
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data })
  } catch {
    return NextResponse.json({ error: 'Błąd tworzenia projektu' }, { status: 500 })
  }
}
