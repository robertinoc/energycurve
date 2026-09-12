import "server-only"

import { logError } from "@/lib/observability/logger"
import {
  type RateLimitResult,
  windowStart,
} from "@/lib/rate-limit"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * The database half of rate limiting.
 *
 * It lives here rather than in `lib/` because of a convention the architecture
 * review of 11/09/2026 made explicit by counting: eighteen of the twenty-one
 * files that reach the database are services. The three that aren't are the
 * client's own definition, the health check, and — until this file — the rate
 * limiter, which I had put in `lib/` the same morning.
 *
 * The convention is load-bearing rather than tidy. The IDOR audit rests on the
 * claim that `services/` *is* the access-control surface, since RLS runs with
 * zero policies and everything reaches Postgres through the service-role key. A
 * query outside that directory is a query outside the audited set, and the value
 * of "we reviewed every service" drops to nothing the moment the sentence needs
 * an "and also".
 *
 * The pure part — window alignment, the result shape — stays in `lib/`, where it
 * can be tested without a database.
 */
export async function consumeRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: {
  key: string
  limit: number
  windowMs: number
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
