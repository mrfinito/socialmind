// Shared helpers for AI route handlers — env guards + safe error responses.
// Use these to avoid 500-with-empty-body errors that crash the frontend.

import { NextResponse } from 'next/server'

/**
 * Returns a Response with 500 if ANTHROPIC_API_KEY is missing, otherwise null.
 * Use at the very top of POST handlers:
 *   const guard = checkAnthropicKey()
 *   if (guard) return guard
 */
export function checkAnthropicKey(): Response | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in env')
    return NextResponse.json(
      { error: 'Brak klucza ANTHROPIC_API_KEY na serwerze. Dodaj go w Vercel Environment Variables.' },
      { status: 500 }
    )
  }
  return null
}

export function checkOpenAIKey(): Response | null {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY in env')
    return NextResponse.json(
      { error: 'Brak klucza OPENAI_API_KEY na serwerze.' },
      { status: 500 }
    )
  }
  return null
}

export function checkGoogleKey(): Response | null {
  if (!process.env.GOOGLE_API_KEY) {
    console.error('Missing GOOGLE_API_KEY in env')
    return NextResponse.json(
      { error: 'Brak klucza GOOGLE_API_KEY na serwerze.' },
      { status: 500 }
    )
  }
  return null
}

/**
 * Wraps an unknown error into a clean 500 JSON response.
 * Logs the full stack trace to console.
 */
export function errorResponse(err: unknown, prefix = 'Server error'): Response {
  const msg = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : ''
  console.error(`${prefix}:`, msg)
  if (stack) console.error('Stack:', stack)
  return NextResponse.json(
    {
      error: `${prefix}: ${msg}`,
      stack: stack?.split('\n').slice(0, 5).join('\n'),
    },
    { status: 500 }
  )
}

/**
 * Safely parses request JSON body with proper error response on failure.
 * Returns either { body: T } or { response: Response (400) }.
 */
export async function safeJsonBody<T>(
  req: Request | { json: () => Promise<unknown> }
): Promise<{ body: T; response: null } | { body: null; response: Response }> {
  try {
    const body = await req.json() as T
    return { body, response: null }
  } catch (e) {
    console.error('Malformed request body:', e)
    return {
      body: null,
      response: NextResponse.json({ error: 'Niepoprawny format zapytania' }, { status: 400 }),
    }
  }
}
