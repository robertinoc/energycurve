import "server-only"

/**
 * Rate limiting that holds across every server, not just the one you reached.
 *
 * This used to be a `Map` in module scope. On Vercel that makes the counter per
 * instance, resetting on every cold start, so "three exports an hour" really
 * meant "three per instance per hour, until the instance goes away". The limit
 * we advertised was never the limit that applied.
 *
 * This file holds only the pure half — window alignment and the result shape —
 * so it can be tested without a database. The query lives in
 * `services/rate-limit-service.ts`, because `services/` is where this codebase
 * keeps database access, and that convention is what lets the IDOR audit say
 * "we reviewed every service" without an "and also".
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
