import { activityStatus, type BackstageUserRow } from "@/lib/backstage/users"
import { splitLocalePath } from "@/lib/content/locale-routing"

/**
 * Where users come from, and what they do next — the backstage's acquisition
 * section (lote 20, tasks 4–8). Pure: the service reads, this counts, and the
 * tests feed it rows.
 *
 * ## Three rules every number here follows
 *
 * 1. **Every number says its denominator.** A rate is returned with both of
 *    the counts it came from, and the UI prints them.
 * 2. **Unknown is a category, never a zero.** A user with no first touch is
 *    `unknown`, counted, listed first, and split by *why*: registered before
 *    the measurement existed, or after it and without a touch (no analytics
 *    consent, or a touch lost on the way — `docs/seo/primer-contacto.md`).
 * 3. **Below the minimum sample, no rate.** A source with 3 signups and 2
 *    analyses is not "67%". The count is shown, the rate is null, and the UI
 *    says "too few". The minimums are constants here and printed on screen.
 */

/** Signups a source needs before its conversion rate is shown. */
export const MIN_SAMPLE_FOR_RATE = 20

/** Values a median needs before it is shown. */
export const MIN_SAMPLE_FOR_MEDIAN = 5

/**
 * Paid conversions with a known source needed before splitting them by
 * source. Below it, the split is not shown and the UI says so.
 */
export const MIN_PAID_FOR_SOURCE_SPLIT = 20

/** How many weekly cohorts the table shows; older signups go in one row. */
export const COHORT_WEEKS = 12

export const UNKNOWN_SOURCE = "unknown"

export type UnknownReason =
  /** Migration 0034 is not applied in this environment, or no touch exists yet. */
  | "not_measured"
  /** Registered before the first touch was ever recorded. */
  | "before_measurement"
  /** Registered after, with no touch: no consent, or the touch was lost. */
  | "no_touch"

export interface AcquisitionMeasurement {
  /** False when the first_touch_* columns could not be read. */
  available: boolean
  /** The earliest first_touch_recorded_at, or null when there is none. */
  since: string | null
}

/**
 * What the acquisition section can stand on (lote 20). Each read fails on its
 * own: an environment without migration 0034 still lists its users, and says
 * the measurement has not started instead of showing everyone as "direct".
 */
export interface BackstageAcquisitionStatus {
  measurement: AcquisitionMeasurement
  /** False when billing_events could not be read: no paid column at all. */
  paidLogAvailable: boolean
  /**
   * Counted by the database (`count: exact, head: true`), not from the rows
   * read — so the panel can show both and a truncated read cannot pass for
   * the whole table. Null when the count itself failed.
   */
  counts: { profiles: number | null; recordedTouches: number | null }
}

export interface AcquisitionUserInput {
  id: string
  createdAt: string
  /** Entitled plan today. */
  plan: "free" | "pro" | "pro_plus"
  firstTouchSource: string | null
  firstTouchMedium: string | null
  firstTouchLanding: string | null
  firstAnalysisAt: string | null
  /** The first checkout that completed, from billing_events. */
  paidAt: string | null
}

export const TOOLS = [
  "energy_curve",
  "camelot_wheel",
  "key_bpm",
  "playlist_converter",
] as const

export type ToolId = (typeof TOOLS)[number]

export const TOOL_LABELS: Record<ToolId, string> = {
  energy_curve: "Energy curve",
  camelot_wheel: "Camelot wheel",
  key_bpm: "Key & BPM compatibility",
  playlist_converter: "Traktor ↔ Rekordbox converter",
}

const TOOL_BY_PATH: Record<string, ToolId> = {
  "/tools/energy-curve": "energy_curve",
  "/tools/camelot-wheel": "camelot_wheel",
  "/tools/key-bpm-compatibility": "key_bpm",
  "/tools/traktor-rekordbox-converter": "playlist_converter",
}

/** The free tool a landing path is, in either language, or null. */
export function toolOfLanding(landing: string | null): ToolId | null {
  if (!landing) {
    return null
  }

  return TOOL_BY_PATH[splitLocalePath(landing).path] ?? null
}

/** `unknown`, or the source. */
export function sourceOf(user: AcquisitionUserInput): string {
  return user.firstTouchSource ?? UNKNOWN_SOURCE
}

export function unknownReason(
  user: AcquisitionUserInput,
  measurement: AcquisitionMeasurement
): UnknownReason | null {
  if (user.firstTouchSource) {
    return null
  }

  if (!measurement.available || !measurement.since) {
    return "not_measured"
  }

  return user.createdAt < measurement.since ? "before_measurement" : "no_touch"
}

/** Middle value, or the mean of the two middle ones. Null below the minimum. */
export function median(values: number[], minimum = MIN_SAMPLE_FOR_MEDIAN): number | null {
  if (values.length < minimum || values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/** A count over a denominator, with the rate only when the sample allows it. */
export interface Ratio {
  count: number
  of: number
  /** 0–1, or null when `of` is below the minimum sample. */
  rate: number | null
}

export function ratio(count: number, of: number, minimum = MIN_SAMPLE_FOR_RATE): Ratio {
  return { count, of, rate: of >= minimum && of > 0 ? count / of : null }
}

/** Sources by number of users, `unknown` always first whatever its size. */
function orderSources(counts: Map<string, number>): string[] {
  const known = [...counts.entries()]
    .filter(([source]) => source !== UNKNOWN_SOURCE)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([source]) => source)

  return [UNKNOWN_SOURCE, ...known]
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Monday 00:00 UTC of the week `iso` falls in, as YYYY-MM-DD. */
export function weekStart(iso: string): string {
  const date = new Date(iso)
  const day = (date.getUTCDay() + 6) % 7 // Monday = 0
  const monday = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - day * DAY_MS

  return new Date(monday).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Task 4 — users by source, by weekly signup cohort
// ---------------------------------------------------------------------------

export interface CohortRow {
  /** Monday of the week, or "earlier" for everything before the window. */
  week: string
  total: number
  bySource: Record<string, number>
}

export interface CohortTable {
  sources: string[]
  rows: CohortRow[]
  /** Unknown, split by why. Sums to the unknown column's total. */
  unknownByReason: Record<UnknownReason, number>
  total: number
}

export function cohortsBySource(
  users: AcquisitionUserInput[],
  measurement: AcquisitionMeasurement,
  now: Date,
  weeks = COHORT_WEEKS
): CohortTable {
  const firstWeek = weekStart(new Date(now.getTime() - (weeks - 1) * 7 * DAY_MS).toISOString())
  const rows = new Map<string, CohortRow>()

  for (let w = 0; w < weeks; w++) {
    const week = weekStart(new Date(now.getTime() - w * 7 * DAY_MS).toISOString())

    rows.set(week, { week, total: 0, bySource: {} })
  }

  rows.set("earlier", { week: "earlier", total: 0, bySource: {} })

  const totals = new Map<string, number>([[UNKNOWN_SOURCE, 0]])
  const unknownByReason: Record<UnknownReason, number> = {
    not_measured: 0,
    before_measurement: 0,
    no_touch: 0,
  }

  for (const user of users) {
    const week = weekStart(user.createdAt)
    const row = rows.get(week < firstWeek ? "earlier" : week)

    if (!row) {
      // A signup dated in the future: counted in the total, not in a week.
      continue
    }

    const source = sourceOf(user)

    row.total += 1
    row.bySource[source] = (row.bySource[source] ?? 0) + 1
    totals.set(source, (totals.get(source) ?? 0) + 1)

    const reason = unknownReason(user, measurement)

    if (reason) {
      unknownByReason[reason] += 1
    }
  }

  return {
    sources: orderSources(totals),
    rows: [...rows.values()].sort((a, b) =>
      a.week === "earlier" ? 1 : b.week === "earlier" ? -1 : b.week.localeCompare(a.week)
    ),
    unknownByReason,
    total: users.length,
  }
}

// ---------------------------------------------------------------------------
// Task 5 — signup → first analysis, by source
// ---------------------------------------------------------------------------

export interface ConversionRow {
  source: string
  analysed: Ratio
}

export function conversionBySource(users: AcquisitionUserInput[]): {
  rows: ConversionRow[]
  overall: Ratio
} {
  const signups = new Map<string, number>()
  const analysed = new Map<string, number>()

  for (const user of users) {
    const source = sourceOf(user)

    signups.set(source, (signups.get(source) ?? 0) + 1)

    if (user.firstAnalysisAt) {
      analysed.set(source, (analysed.get(source) ?? 0) + 1)
    }
  }

  signups.set(UNKNOWN_SOURCE, signups.get(UNKNOWN_SOURCE) ?? 0)

  return {
    rows: orderSources(signups).map((source) => ({
      source,
      analysed: ratio(analysed.get(source) ?? 0, signups.get(source) ?? 0),
    })),
    overall: ratio(
      users.filter((user) => user.firstAnalysisAt).length,
      users.length
    ),
  }
}

// ---------------------------------------------------------------------------
// Task 6 — the free tools as a bridge
// ---------------------------------------------------------------------------

export interface ToolLandingRow {
  tool: ToolId
  /** Signups whose first page was this tool. */
  signups: number
  /** Of them, how many ran an analysis in the app. */
  analysed: Ratio
}

/**
 * Signups by the free tool they first landed on. Landed, not used: the first
 * touch records the page, and a person can land on a tool and never touch it.
 * Use comes from PostHog (`ToolUsage`), counted over different people — the
 * ones who accepted analytics — so the two are shown side by side, never
 * divided into each other.
 */
export function signupsByToolLanding(users: AcquisitionUserInput[]): {
  rows: ToolLandingRow[]
  /** Signups with any known landing page — the denominator for "landed on a tool". */
  withLanding: number
} {
  const rows = TOOLS.map((tool) => {
    const landed = users.filter((user) => toolOfLanding(user.firstTouchLanding) === tool)

    return {
      tool,
      signups: landed.length,
      analysed: ratio(landed.filter((user) => user.firstAnalysisAt).length, landed.length),
    }
  })

  return {
    rows,
    withLanding: users.filter((user) => user.firstTouchLanding).length,
  }
}

/** From PostHog: people who used each tool, and of them, who signed up after. */
export interface ToolUsage {
  windowDays: number
  rows: Array<{ tool: ToolId; users: number; signedUpAfter: number }>
}

// ---------------------------------------------------------------------------
// Task 7 — Free → Pro
// ---------------------------------------------------------------------------

export interface PaidConversion {
  /** Every signup: the denominator. */
  signups: number
  /** With a completed checkout on record. */
  paid: Ratio
  /** On a paid plan today with no checkout on record (granted by hand, or older than the log). */
  paidWithoutCheckout: number
  /** Days from signup to the first completed checkout. Null below the minimum. */
  medianDays: number | null
  /** Null when there are too few paid conversions with a known source to split. */
  bySource: Array<{ source: string; paid: number; medianDays: number | null }> | null
  /** Paid conversions whose source is known — what the split would rest on. */
  paidWithKnownSource: number
}

export function paidConversion(users: AcquisitionUserInput[]): PaidConversion {
  const paidUsers = users.filter((user) => user.paidAt)
  const days = (user: AcquisitionUserInput) =>
    (new Date(user.paidAt!).getTime() - new Date(user.createdAt).getTime()) / DAY_MS
  const withKnownSource = paidUsers.filter((user) => user.firstTouchSource)

  let bySource: PaidConversion["bySource"] = null

  if (withKnownSource.length >= MIN_PAID_FOR_SOURCE_SPLIT) {
    const groups = new Map<string, AcquisitionUserInput[]>()

    for (const user of paidUsers) {
      const source = sourceOf(user)

      groups.set(source, [...(groups.get(source) ?? []), user])
    }

    const counts = new Map([...groups.entries()].map(([source, list]) => [source, list.length]))

    counts.set(UNKNOWN_SOURCE, counts.get(UNKNOWN_SOURCE) ?? 0)

    bySource = orderSources(counts).map((source) => {
      const list = groups.get(source) ?? []

      return { source, paid: list.length, medianDays: median(list.map(days)) }
    })
  }

  return {
    signups: users.length,
    paid: ratio(paidUsers.length, users.length),
    paidWithoutCheckout: users.filter((user) => !user.paidAt && user.plan !== "free").length,
    medianDays: median(paidUsers.map(days)),
    bySource,
    paidWithKnownSource: withKnownSource.length,
  }
}

// ---------------------------------------------------------------------------
// Task 8 — time to first analysis
// ---------------------------------------------------------------------------

export interface FirstAnalysisTiming {
  signups: number
  reached: Ratio
  /** Hours from signup to first analysis. Null below the minimum. */
  medianHours: number | null
  /** Never ran an analysis. Splits exactly into the three below. */
  never: number
  /**
   * Of `never`: no playlist and no analysis — the same people the "Never used"
   * KPI counts, by the same rule (`activityStatus`), so the two cannot differ.
   */
  neverUsed: number
  /** Of `never`: imported a set and stopped there. */
  importedOnly: number
  /** Of `never`: suspended, which the KPI counts apart. */
  suspended: number
}

/**
 * Counted from the analyses that exist today. Deleting a set deletes its
 * analyses, so a person who analysed and then deleted everything reads as
 * "never" — the UI says so.
 */
export function firstAnalysisTiming(
  users: Array<BackstageUserRow & { firstAnalysisAt: string | null }>,
  now: Date = new Date()
): FirstAnalysisTiming {
  const reached = users.filter((user) => user.firstAnalysisAt)
  const never = users.filter((user) => !user.firstAnalysisAt)
  const statusOf = (user: BackstageUserRow) => activityStatus(user, now)

  return {
    signups: users.length,
    reached: ratio(reached.length, users.length),
    medianHours: median(
      reached.map(
        (user) =>
          (new Date(user.firstAnalysisAt!).getTime() - new Date(user.createdAt).getTime()) /
          (60 * 60 * 1000)
      )
    ),
    never: never.length,
    neverUsed: never.filter((user) => statusOf(user) === "never").length,
    importedOnly: never.filter(
      (user) => statusOf(user) !== "suspended" && statusOf(user) !== "never"
    ).length,
    suspended: never.filter((user) => statusOf(user) === "suspended").length,
  }
}
