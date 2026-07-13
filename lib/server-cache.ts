type CacheEntry<T> = { data: T; expires: number }

const store = new Map<string, CacheEntry<unknown>>()

/** Short-lived in-memory cache for admin aggregate endpoints (per serverless instance). */
export async function withServerCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) {
    return hit.data as T
  }
  const data = await fetcher()
  store.set(key, { data, expires: Date.now() + ttlMs })
  return data
}

export function cacheHeaders(ttlSeconds: number): HeadersInit {
  return {
    'Cache-Control': `private, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`,
  }
}
