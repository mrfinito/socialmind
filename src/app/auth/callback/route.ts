import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite')
  const next = searchParams.get('next') ?? '/'

  // Use APP_URL env var if available, fallback to origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || origin

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log('Auth callback - code exchange:', error ? error.message : 'OK', 'user:', data?.user?.id)

    if (!error && data.user) {
      // Handle invite token
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
        return NextResponse.redirect(`${appUrl}/onboarding`)
      }

      return NextResponse.redirect(`${appUrl}${next}`)
    }

    console.error('Auth callback error:', error?.message)
  }

  return NextResponse.redirect(`${appUrl}/login?error=auth_callback_error`)
}
