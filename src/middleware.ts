import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/confirm', '/invite', '/brief']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const { supabase, supabaseResponse } = createMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Skip onboarding check for admin and onboarding itself
  if (pathname === '/onboarding' || pathname.startsWith('/admin')) {
    return supabaseResponse
  }

  // Check if onboarded (skip for API routes)
  if (!pathname.startsWith('/api')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .single()

    if (profile && profile.onboarded === false) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
