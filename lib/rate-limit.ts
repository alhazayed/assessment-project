/**
 * Simple in-memory token-bucket rate limiter.
 * Works per-process (sufficient for single-instance deployments like Vercel functions
 * where each function invocation is isolated — this guards against burst abuse
 * within a single cold-start window).
 */

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

interface RateLimitOptions {
  /** Maximum requests per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export function checkRateLimit(key: string, options: RateLimitOptions): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.lastRefill >= options.windowMs) {
    // Refill or create bucket
    buckets.set(key, { tokens: options.limit - 1, lastRefill: now })
    return { allowed: true, remaining: options.limit - 1 }
  }

  if (bucket.tokens <= 0) {
    return { allowed: false, remaining: 0 }
  }

  bucket.tokens -= 1
  return { allowed: true, remaining: bucket.tokens }
}

// Periodically clean up stale entries to prevent memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000 // 1 hour
    Array.from(buckets.entries()).forEach(([key, bucket]) => {
      if (bucket.lastRefill < cutoff) buckets.delete(key)
    })
  }, 5 * 60 * 1000)
}
