import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nie zalogowany' }, { status: 401 })

    const { client_name, client_email, business_name, project_id } = await req.json()
    const token = generateToken()

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('client_briefs')
      .insert({
        token,
        agency_user_id: user.id,
        project_id: project_id || null,
        client_name,
        client_email,
        business_name,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
    const briefUrl = `${appUrl}/brief/${token}`
    return NextResponse.json({ ok: true, brief: data, url: briefUrl })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad' }, { status: 500 })
  }
}
