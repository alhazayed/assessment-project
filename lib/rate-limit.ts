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

  const { count } = await db
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', windowStart)

  const hits = count ?? 0
  if (hits >= options.limit) {
    return { allowed: false, remaining: 0 }
  }

  await db.from('rate_limit_log').insert({ key })
  return { allowed: true, remaining: options.limit - hits - 1 }
}
