import "server-only"

import { logError } from "@/lib/observability/logger"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import type { CapabilityKey } from "@/lib/product/capabilities"
import { quotaState, currentPeriodStart, type QuotaState } from "@/lib/product/usage"

/**
 * Monthly quota accounting.
 *
 * Only reached for capabilities whose limit is a number. An unlimited plan skips
 * this file entirely rather than encoding "no limit" as a sentinel — see
 * `consumeQuota`.
 */

/** Current usage for a capability this month. Zero when there's no row yet. */
export async function getUsage(
  profileId: string,
  capability: CapabilityKey,
  now: Date = new Date()
): Promise<number> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("feature_usage")
    .select("used")
    .eq("profile_id", profileId)
    .eq("capability", capability)
    .eq("period_start", currentPeriodStart(now))
    .maybeSingle()

  if (error) {
    logError("usage.read_failed", error, { profileId, capability })
    // Fail open on a read: a database hiccup must not lock a paying customer out
    // of a feature they're entitled to. The conditional increment in
    // `consumeQuota` is what actually enforces the cap, and it can't be fooled.
    return 0
  }

  return data?.used ?? 0
}

/** Usage plus the limit it's measured against, for display. */
export async function readQuota(
  profileId: string,
  capability: CapabilityKey,
  limit: number | null,
  now: Date = new Date()
): Promise<QuotaState> {
  if (limit === null) {
    // Nothing to read: unlimited plans never accrue a row.
    return quotaState(0, null)
  }

  return quotaState(await getUsage(profileId, capability, now), limit)
}

/**
 * Claims one use, atomically.
 *
 * Returns `allowed: false` when the cap is already reached — the increment and
 * the check happen in a single statement (`on conflict … where used < limit`), so
 * two concurrent requests can't both pass at the boundary.
 *
 * **Call this after the work succeeds, not before.** Consuming up front means a
 * failed Claude call, or one that fell back to the local heuristic, still costs
 * the user a unit of something they didn't get. The trade is that a burst of
 * simultaneous requests can each get through the pre-check; bounded by how fast a
 * person clicks, and the counter itself stays correct either way.
 */
export async function consumeQuota(
  profileId: string,
  capability: CapabilityKey,
  limit: number | null,
  now: Date = new Date()
): Promise<QuotaState> {
  if (limit === null) {
    return quotaState(0, null)
  }

  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase.rpc("consume_feature_quota", {
    p_profile_id: profileId,
    p_capability: capability,
    p_period_start: currentPeriodStart(now),
    p_limit: limit,
  })

  if (error) {
    logError("usage.consume_failed", error, { profileId, capability, limit })
    // Fail open, deliberately: the user already received the result by the time
    // this runs, so refusing here would report a limit they didn't hit. An
    // uncounted use is cheaper than a false denial.
    return quotaState(0, limit)
  }

  // No row back means the `where used < limit` guard refused the update.
  const used = typeof data === "number" ? data : limit

  return quotaState(used, limit)
}
