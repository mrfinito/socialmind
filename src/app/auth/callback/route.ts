import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Handle invite token — mark as used and set plan
      if (inviteToken) {
        try {
          const admin = createAdminClient()
          const { data: invite } = await admin
            .from('invites').select('*').eq('token', inviteToken).single()

          if (invite && !invite.used_at && new Date(invite.expires_at) > new Date()) {
            await admin.from('invites').update({
              used_by: data.user.id,
              used_at: new Date().toISOString()
            }).eq('token', inviteToken)

            if (invite.plan) {
              await admin.from('profiles')
                .update({ plan: invite.plan })
                .eq('id', data.user.id)
            }
          }
        } catch (e) {
          console.error('Invite processing error:', e)
        }
      }

      // Check if onboarded
      const { data: profile } = await supabase
        .from('profiles').select('onboarded').eq('id', data.user.id).single()

      if (!profile?.onboarded) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
