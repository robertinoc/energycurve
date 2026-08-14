/**
 * Pure helpers for monthly quotas.
 *
 * Split from the service so the two things that are easy to get wrong — which
 * month a timestamp belongs to, and whether a count is under a limit — can be
 * tested without a database. The `null`-means-unlimited convention is the same
 * one `PlanLimits` uses, and this is the only place it gets interpreted for
 * counted usage.
 */

/**
 * First day of the UTC month a moment belongs to, as `YYYY-MM-DD`.
 *
 * UTC rather than local time on purpose: the server, the database and the user
 * can each be in a different zone, and a quota that resets at a different
 * instant depending on who asks is a bug that only shows up near midnight on the
 * 1st. The cost is that a DJ in Buenos Aires gets their reset at 21:00 on the
 * last day of the month, which nobody will notice.
 */
export function currentPeriodStart(now: Date = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}-01`
}

export interface QuotaState {
  /** Whether one more use is allowed. */
  allowed: boolean
  used: number
  /** `null` when unlimited. */
  limit: number | null
  /** Uses left, or `null` when unlimited. Never negative. */
  remaining: number | null
}

/**
 * Reads a count against a limit.
 *
 * Tolerates `used` above `limit`: that happens legitimately when a plan is
 * downgraded mid-month, or when a limit is tightened. The answer is "no more",
 * not a negative remaining or a crash.
 */
export function quotaState(used: number, limit: number | null): QuotaState {
  if (limit === null) {
    return { allowed: true, used, limit: null, remaining: null }
  }

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}
