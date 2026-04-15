type RateLimitEntry = {
  count: number
  expiresAt: number
}

const buckets = new Map<string, RateLimitEntry>()

export function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string
  limit: number
  windowMs: number
}) {
  const now = Date.now()
  const current = buckets.get(key)

  if (!current || current.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs })
    return { allowed: true, retryAfterMs: windowMs }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(current.expiresAt - now, 0),
    }
  }

  current.count += 1
  buckets.set(key, current)

  return {
    allowed: true,
    retryAfterMs: Math.max(current.expiresAt - now, 0),
  }
}
