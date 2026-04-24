import { createServerSupabaseClient } from './supabase-server'

interface LimitCheck {
  allowed: boolean
  reason?: string
  used?: number
  limit?: number
}

export async function checkGenerationLimit(): Promise<LimitCheck> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { allowed: false, reason: 'Nie jesteś zalogowany' }

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, plan')
      .eq('id', user.id)
      .single()

    if (profile?.is_admin) return { allowed: true }

    // Get limit from user_permissions (ignore errors)
    let limit = 50
    try {
      const { data: perms } = await supabase
        .from('user_permissions')
        .select('max_posts_per_month')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (perms?.max_posts_per_month) {
        limit = perms.max_posts_per_month
      } else {
        const planLimits: Record<string, number> = { free: 10, pro: 200, agency: 9999 }
        limit = planLimits[profile?.plan || 'free'] ?? 50
      }
    } catch {
      // If user_permissions table doesn't exist or errors - use plan default
      const planLimits: Record<string, number> = { free: 10, pro: 200, agency: 9999 }
      limit = planLimits[profile?.plan || 'free'] ?? 50
    }

    // Count posts this month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('drafts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString())

    const used = count || 0
    if (used >= limit) {
      return {
        allowed: false,
        reason: `Osiągnąłeś limit ${limit} postów w tym miesiącu.`,
        used,
        limit,
      }
    }

    return { allowed: true, used, limit }
  } catch (err) {
    console.error('checkLimits error:', err)
    return { allowed: true } // fail open
  }
}

export async function checkProjectLimit(): Promise<LimitCheck> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { allowed: false, reason: 'Nie jesteś zalogowany' }

    const { data: profile } = await supabase
      .from('profiles').select('is_admin, plan').eq('id', user.id).single()
    if (profile?.is_admin) return { allowed: true }

    let limit = 3
    try {
      const { data: perms } = await supabase
        .from('user_permissions').select('max_projects').eq('user_id', user.id).maybeSingle()
      if (perms?.max_projects) {
        limit = perms.max_projects
      } else {
        const planLimits: Record<string, number> = { free: 1, pro: 10, agency: 999 }
        limit = planLimits[profile?.plan || 'free'] ?? 3
      }
    } catch {
      const planLimits: Record<string, number> = { free: 1, pro: 10, agency: 999 }
      limit = planLimits[profile?.plan || 'free'] ?? 3
    }

    const { count } = await supabase
      .from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id)

    const used = count || 0
    if (used >= limit) {
      return { allowed: false, reason: `Osiągnąłeś limit ${limit} projektów.`, used, limit }
    }
    return { allowed: true, used, limit }
  } catch {
    return { allowed: true }
  }
}
