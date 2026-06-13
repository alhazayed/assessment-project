/**
 * Redis-backed sliding-window rate limiter using Upstash Redis REST API.
 *
 * Required environment variables (when Redis is enabled):
 *   UPSTASH_REDIS_REST_URL    — https://<region>.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN  — Upstash REST token
 *
 * Falls back to the Supabase DB rate limiter when env vars are absent.
 * This lets the same calling code work in dev (DB) and production (Redis).
 */

import { checkRateLimit as dbCheckRateLimit } from '@/lib/rate-limit'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  source: 'redis' | 'db'
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function redisCommand<T = unknown>(command: unknown[]): Promise<T> {
  const res = await fetch(REDIS_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`)
  const json = await res.json()
  return json.result as T
}

/**
 * Sliding-window rate limit via Redis MULTI/EXEC pipeline.
 * Uses a sorted set keyed by `ratelimit:<key>` with scores = timestamps.
 * Window size and limit are enforced atomically.
 */
async function redisCheckRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - options.windowMs
  const redisKey = `ratelimit:${key}`

  // Pipeline: ZREMRANGEBYSCORE (expire old), ZADD (add current), ZCARD (count)
  const pipeline = [
    ['ZREMRANGEBYSCORE', redisKey, '-inf', String(windowStart)],
    ['ZADD', redisKey, String(now), `${now}-${Math.random()}`],
    ['ZCARD', redisKey],
    ['PEXPIRE', redisKey, String(options.windowMs)],
  ]

  const pipelineRes = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pipeline),
  })

  if (!pipelineRes.ok) throw new Error(`Redis pipeline HTTP ${pipelineRes.status}`)
  const results: Array<{ result: unknown }> = await pipelineRes.json()

  const count = results[2]?.result as number
  const allowed = count <= options.limit
  const remaining = Math.max(0, options.limit - count)

  if (!allowed) {
    // Undo the ZADD we just did — remove the entry we added
    await redisCommand(['ZREMRANGEBYSCORE', redisKey, String(now), String(now)])
  }

  return { allowed, remaining, source: 'redis' }
}

/**
 * Unified rate limit check. Uses Redis when configured, DB otherwise.
 */
export async function checkRateLimitRedis(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      return await redisCheckRateLimit(key, options)
    } catch (err) {
      console.error('[redis-rate-limit] Redis error, falling back to DB:', err)
    }
  }

  // DB fallback
  const result = await dbCheckRateLimit(key, options)
  return { ...result, source: 'db' }
}
