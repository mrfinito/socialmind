import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nie zalogowany' }, { status: 401 })

    const { data, error } = await supabase
      .from('client_briefs')
      .select('*')
      .eq('agency_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, briefs: data || [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Blad' }, { status: 500 })
  }
}
