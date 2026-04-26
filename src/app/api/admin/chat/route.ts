import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

function makeConversationId(a: string, b: string) {
  const [first, second] = [a, b].sort()
  return `${first}|${second}`
}

async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET ?with=userId - get messages
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const otherId = req.nextUrl.searchParams.get('with')
  if (!otherId) return NextResponse.json({ error: 'Brak with' }, { status: 400 })

  const adminClient = createAdminClient()
  const conversationId = makeConversationId(user.id, otherId)

  const { data: messages } = await adminClient
    .from('admin_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  // Mark received messages as read
  await adminClient
    .from('admin_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return NextResponse.json({ ok: true, messages: messages || [] })
}

// POST - send message
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipientId, content } = await req.json()
  if (!recipientId || !content?.trim()) {
    return NextResponse.json({ error: 'Brak danych' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('admin_messages')
    .insert({
      conversation_id: makeConversationId(user.id, recipientId),
      sender_id: user.id,
      recipient_id: recipientId,
      content: content.trim().slice(0, 5000),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, message: data })
}
