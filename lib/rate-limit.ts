import "server-only"

import { logError } from "@/lib/observability/logger"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * Rate limiting that holds across every server, not just the one you reached.
 *
 * This used to be a `Map` in module scope. On Vercel that makes the counter per
 * instance, resetting on every cold start, so "three exports an hour" really
 * meant "three per instance per hour, until the instance goes away". The limit
 * we advertised was never the limit that applied.
 *
 * ## Why the window had to change shape
 *
 * The old window started whenever an instance happened to see the first request.
 * Two instances would compute two different expiries for the same key and
 * neither could be the authority — that window is not shareable even in
 * principle. Windows are now **aligned to the epoch**: every instance floors the
 * clock the same way and lands on the same bucket without coordinating.
 *
 * The trade, stated rather than discovered later: a burst straddling a boundary
 * can reach up to 2× the limit across two adjacent windows. That is the same
 * trade the in-memory version already made, and it is fine for "don't hammer
 * this" limits. It would not be fine for a billing quota, which is why monthly
 * quotas live in `feature_usage` with a calendar period instead.
 */

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

/** Floors a timestamp to the start of its window, the same way on every server. */
export function windowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs
}

export async function checkRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: {
  key: string
  limit: number
  windowMs: number
  /** Injectable for tests; nothing in the app passes it. */
  now?: number
}): Promise<RateLimitResult> {
  const start = windowStart(now, windowMs)
  const retryAfterMs = start + windowMs - now

  try {
    const supabase = getSupabaseAdminClient()

    // No row back means the conditional update didn't fire, which is the refusal.
    // The caller never compares anything: Postgres decided, under the primary
    // key, so two requests arriving together cannot both see room for one.
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key: key,
      p_window_start: new Date(start).toISOString(),
      p_limit: limit,
    })

    if (error) {
      throw error
    }

    return { allowed: data !== null, retryAfterMs }
  } catch (error) {
    // Fails open, and that is safe for a specific reason rather than as a
    // general principle: every endpoint behind this limiter needs the same
    // database to do its work. If the counter can't be written, the thing being
    // protected can't be served either, so an open limiter grants nothing. A
    // limiter that fails closed would instead turn a database blip into a
    // sitewide outage.
    logError("rate_limit.unavailable", error, { key })
    return { allowed: true, retryAfterMs }
  }
}
