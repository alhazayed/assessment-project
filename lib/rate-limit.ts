import { createAdminClient } from '@/lib/supabase/admin'

interface RateLimitOptions {
  limit: number
  windowMs: number
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<{ allowed: boolean; remaining: number }> {
  const db = createAdminClient()
  const windowStart = new Date(Date.now() - options.windowMs).toISOString()

  const { data, error } = await db.rpc('check_and_record_rate_limit', {
    p_key: key,
    p_window_start: windowStart,
    p_limit: options.limit,
  })

  if (error) {
    // Fail open on DB error — do not block legitimate requests
    console.error('[rate-limit] rpc error:', error)
    return { allowed: true, remaining: 0 }
  }

  const newCount = data as number
  if (newCount === -1) return { allowed: false, remaining: 0 }
  return { allowed: true, remaining: Math.max(0, options.limit - newCount) }
}
