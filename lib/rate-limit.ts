import { checkRateLimitRedis } from '@/lib/rate-limit/redis'

interface RateLimitOptions {
  limit: number
  windowMs: number
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<{ allowed: boolean; remaining: number }> {
  const result = await checkRateLimitRedis(key, options)
  return { allowed: result.allowed, remaining: result.remaining }
}
