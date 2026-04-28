// Lightweight client-side activity logger.
// Fire-and-forget — never blocks UI, never throws.
//
// Usage from any client-side code:
//   import { logActivity } from '@/lib/activityLog'
//   logActivity('generate.posts', '5 wariantów Facebook')
//   logActivity('generate.image', 'gemini', { width: 1024, height: 1024 })

export function logActivity(
  action: string,
  details?: string,
  metadata?: Record<string, unknown>
) {
  // Don't await — fire and forget
  fetch('/api/admin/activity-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, details, metadata }),
  }).catch(() => {
    // Silently swallow — logging must never break user flow
  })
}
