import {
  isFallbackReason,
  type SmartOrderFallbackReason,
} from "@/lib/smart-order/stream"

/**
 * Is smart ordering working? Read from `smart_order_runs` (migration 0035).
 *
 * Smart ordering fell back to the local heuristic for weeks — the Anthropic
 * account had no credit — and nothing said so: the DJ got a usable order and a
 * polite banner, which is the right behaviour, and which is why nobody noticed
 * that the feature carrying the paid plans was down. This turns the log line
 * that already recorded it into something the backstage shows.
 *
 * Pure, so every state can be tested without a database.
 */

/** How far back the panel looks. Traffic is low: a week can easily be empty. */
export const SMART_ORDER_WINDOW_DAYS = 14

/**
 * Reasons that do not clear by retrying. Each one needs somebody to do
 * something — pay an invoice, set a variable, fix a key, change the model — and
 * until then every smart ordering falls back. One of these on the latest run is
 * an outage, not a statistic.
 *
 * `timeout`, `rate_limited`, `upstream_down` and the answer problems are left
 * out on purpose: they come and go, so they read as a share, not an alarm.
 */
export const STRUCTURAL_REASONS = [
  "unfunded",
  "not_configured",
  "not_authorized",
  "model_unavailable",
] as const satisfies readonly SmartOrderFallbackReason[]

export type StructuralReason = (typeof STRUCTURAL_REASONS)[number]

export function isStructuralReason(
  reason: SmartOrderFallbackReason | null
): reason is StructuralReason {
  return (STRUCTURAL_REASONS as readonly string[]).includes(reason ?? "")
}

/** Below this share of AI-made orders, the window reads as degraded. */
export const DEGRADED_FALLBACK_SHARE = 0.5

export interface SmartOrderRun {
  createdAt: string
  source: "claude" | "fallback"
  /** Null when the AI made the order. */
  reason: SmartOrderFallbackReason | null
}

export interface SmartOrderSummary {
  total: number
  claude: number
  fallback: number
  /** Fallbacks by reason, most frequent first. */
  byReason: Array<{ reason: SmartOrderFallbackReason; count: number }>
  /** The latest order the AI made inside the window, or null if none. */
  lastClaudeAt: string | null
}

/**
 * What the panel says. "No orderings" and "can't know" are separate states on
 * purpose: zero fallbacks because nobody asked and zero because there is
 * nothing to read from look the same as a number, and mean opposite things.
 */
export type SmartOrderHealth =
  /** Can't read the runs: the migration isn't applied, or the read failed. */
  | { state: "unknown"; cause: "not_migrated" | "read_failed" }
  /** The read worked and nobody asked for a smart ordering in the window. */
  | { state: "idle"; windowDays: number }
  /** The latest ordering fell back for a reason that won't clear on its own. */
  | {
      state: "down"
      reason: StructuralReason
      /** Consecutive latest orderings that fell back for this same reason. */
      streak: number
      /** When the streak started, inside the window. */
      since: string
      summary: SmartOrderSummary
      windowDays: number
    }
  /** At least half the window's orderings fell back, for passing reasons. */
  | { state: "degraded"; summary: SmartOrderSummary; windowDays: number }
  | { state: "healthy"; summary: SmartOrderSummary; windowDays: number }

export type SmartOrderRunsRead =
  | { available: true; runs: SmartOrderRun[] }
  | { available: false; cause: "not_migrated" | "read_failed" }

/** Rows as they come from the table, defended against anything unexpected. */
export function toSmartOrderRuns(
  rows: Array<{ created_at: unknown; source: unknown; reason: unknown }>
): SmartOrderRun[] {
  const runs: SmartOrderRun[] = []

  for (const row of rows) {
    if (typeof row.created_at !== "string") continue

    if (row.source === "claude") {
      runs.push({ createdAt: row.created_at, source: "claude", reason: null })
    } else if (row.source === "fallback") {
      runs.push({
        createdAt: row.created_at,
        source: "fallback",
        // A reason this build doesn't know (a newer deploy wrote it) still
        // counts as a fallback; it just can't be named.
        reason: isFallbackReason(row.reason) ? row.reason : "error",
      })
    }
  }

  return runs
}

export function summarizeSmartOrderRuns(runs: SmartOrderRun[]): SmartOrderSummary {
  const counts = new Map<SmartOrderFallbackReason, number>()
  let claude = 0
  let lastClaudeAt: string | null = null

  for (const run of runs) {
    if (run.source === "claude") {
      claude += 1
      if (lastClaudeAt === null || run.createdAt > lastClaudeAt) {
        lastClaudeAt = run.createdAt
      }
    } else if (run.reason) {
      counts.set(run.reason, (counts.get(run.reason) ?? 0) + 1)
    }
  }

  const byReason = [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))

  return {
    total: runs.length,
    claude,
    fallback: runs.length - claude,
    byReason,
    lastClaudeAt,
  }
}

export function smartOrderHealth(
  read: SmartOrderRunsRead,
  windowDays: number = SMART_ORDER_WINDOW_DAYS
): SmartOrderHealth {
  if (!read.available) {
    return { state: "unknown", cause: read.cause }
  }

  if (read.runs.length === 0) {
    return { state: "idle", windowDays }
  }

  // Newest first. ISO timestamps from Postgres sort correctly as strings.
  const runs = [...read.runs].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
  )
  const summary = summarizeSmartOrderRuns(runs)
  const latest = runs[0]

  if (latest.source === "fallback" && isStructuralReason(latest.reason)) {
    let streak = 0
    for (const run of runs) {
      if (run.source !== "fallback" || run.reason !== latest.reason) break
      streak += 1
    }

    return {
      state: "down",
      reason: latest.reason,
      streak,
      since: runs[streak - 1].createdAt,
      summary,
      windowDays,
    }
  }

  if (summary.fallback / summary.total >= DEGRADED_FALLBACK_SHARE) {
    return { state: "degraded", summary, windowDays }
  }

  return { state: "healthy", summary, windowDays }
}
