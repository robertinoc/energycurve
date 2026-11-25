import "server-only"

import {
  SMART_ORDER_WINDOW_DAYS,
  toSmartOrderRuns,
  type SmartOrderRunsRead,
} from "@/lib/backstage/smart-order-health"
import { logError, logWarn } from "@/lib/observability/logger"
import type { SmartOrderFallbackReason } from "@/lib/smart-order/stream"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * Who made each smart ordering: the AI, or the heuristic and why.
 *
 * The backstage reads this to say whether smart ordering is working (see
 * `lib/backstage/smart-order-health.ts`). Before it existed, the only record was
 * a log line, and the feature that carries the paid plans fell back for weeks
 * without anything noticing.
 */

/**
 * Records one ordering. Never throws, and never changes what the DJ gets: the
 * order is already decided when this runs, and a monitoring write that failed
 * must not turn into a failed ordering. A failure is logged instead — and the
 * panel can't see it, which is the one gap this leaves.
 */
export async function recordSmartOrderRun(run: {
  source: "claude" | "fallback"
  reason: SmartOrderFallbackReason | null
}): Promise<void> {
  try {
    const { error } = await getSupabaseAdminClient()
      .from("smart_order_runs")
      .insert({
        source: run.source,
        reason: run.source === "claude" ? null : (run.reason ?? "error"),
      })

    if (error) {
      logError("smart_order.run_record_failed", error, { source: run.source })
    }
  } catch (error) {
    logError("smart_order.run_record_failed", error, { source: run.source })
  }
}

/**
 * Postgres says 42P01 for a missing relation; PostgREST says PGRST205 when the
 * table isn't in its schema cache. Either way the migration hasn't run here.
 */
function isMissingTable(error: { code?: unknown; message?: unknown }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/smart_order_runs/.test(String(error.message ?? "")) &&
      /does not exist|could not find/i.test(String(error.message ?? "")))
  )
}

/** The runs inside the panel's window, or why they can't be read. */
export async function readRecentSmartOrderRuns(
  now: Date = new Date(),
  windowDays: number = SMART_ORDER_WINDOW_DAYS
): Promise<SmartOrderRunsRead> {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)

  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("smart_order_runs")
      .select("created_at, source, reason")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      // Far above any real week: one row per ordering, and orderings are
      // rate-limited per person. Capped so a runaway can't load the panel.
      .limit(5000)

    if (error) {
      const notMigrated = isMissingTable(error)
      logWarn("backstage.smart_order_runs_unavailable", {
        reason: String(error.message ?? error),
        notMigrated,
      })
      return { available: false, cause: notMigrated ? "not_migrated" : "read_failed" }
    }

    return { available: true, runs: toSmartOrderRuns(data ?? []) }
  } catch (error) {
    logWarn("backstage.smart_order_runs_unavailable", {
      reason: error instanceof Error ? error.message : String(error),
      notMigrated: false,
    })
    return { available: false, cause: "read_failed" }
  }
}
