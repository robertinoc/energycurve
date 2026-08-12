/**
 * Plan tiers and their limits — the single source of truth for gating.
 *
 * Prices live here as display strings only; **Stripe is the authority on what
 * someone actually pays and on which plan they're entitled to.** Never derive a
 * user's plan from anything the client sends: it comes from a Stripe webhook, is
 * stored on the profile, and is read back from there.
 *
 * The ladder (FREE $0 / PRO $9.99 / PRO+ $19.99, annual $99/$199) matches
 * StageLink's and is a settled decision — see AGENTS.md before changing a
 * number here, and note that `lib/content/site-copy.ts` renders the public
 * matrix, so the two must agree.
 */

export const PLANS = ["free", "pro", "pro_plus"] as const

export type Plan = (typeof PLANS)[number]

/**
 * Subscription health, mirrored from Stripe. Only `active` and `trialing` grant
 * paid entitlement; everything else falls back to free limits while keeping the
 * record so the UI can explain why.
 */
export const PLAN_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
] as const

export type PlanStatus = (typeof PLAN_STATUSES)[number]

/** Statuses that actually unlock paid features. */
const ENTITLED_STATUSES: readonly PlanStatus[] = ["active", "trialing"]

export interface PlanLimits {
  /** Playlists a user may keep. `null` = unlimited. */
  activePlaylists: number | null
  /** Fixes applied per calendar month. `null` = unlimited. */
  fixesPerMonth: number | null
  /** Claude-backed smart orderings per calendar month. `null` = unlimited. */
  aiOrderingsPerMonth: number | null
  /** Custom genres + set contexts combined. `null` = unlimited. */
  customTaxonomies: number | null
  /**
   * Real audio analysis in the browser. Gated because it's the headline paid
   * capability, not because it costs us anything to run.
   */
  audioAnalysis: boolean
  /** Set version history (original vs curated vs AI order). */
  versionHistory: boolean
  /** Gig Mode, global library, per-transition suggestions. */
  proWorkflow: boolean
}

/**
 * Limits per tier. Deliberately *not* including native export: Rekordbox XML,
 * Traktor NML, and M3U8 export are free on every tier, permanently. Exporting
 * the fixed order back to the booth is what makes the analysis actionable, so
 * paywalling it breaks the product loop. Do not add it here.
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    activePlaylists: 3,
    fixesPerMonth: 3,
    aiOrderingsPerMonth: 1,
    customTaxonomies: 2,
    audioAnalysis: false,
    versionHistory: false,
    proWorkflow: false,
  },
  pro: {
    activePlaylists: null,
    fixesPerMonth: null,
    aiOrderingsPerMonth: 3,
    customTaxonomies: null,
    audioAnalysis: true,
    versionHistory: true,
    proWorkflow: false,
  },
  pro_plus: {
    activePlaylists: null,
    fixesPerMonth: null,
    aiOrderingsPerMonth: null,
    customTaxonomies: null,
    audioAnalysis: true,
    versionHistory: true,
    proWorkflow: true,
  },
} as const

/** Display prices, in USD. Stripe holds the real ones. */
export const PLAN_PRICING: Record<Plan, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 9.99, yearly: 99 },
  pro_plus: { monthly: 19.99, yearly: 199 },
} as const

export type BillingInterval = "monthly" | "yearly"

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value)
}

export function isPlanStatus(value: unknown): value is PlanStatus {
  return (
    typeof value === "string" &&
    (PLAN_STATUSES as readonly string[]).includes(value)
  )
}

/**
 * The plan whose limits actually apply right now.
 *
 * A lapsed subscriber keeps their `plan` on the profile (so we can say "your
 * PRO subscription is past due" rather than silently demoting them) but is
 * entitled to free limits until Stripe says otherwise.
 */
export function effectivePlan(
  plan: Plan,
  status: PlanStatus | null
): Plan {
  if (plan === "free") {
    return "free"
  }

  return status !== null && ENTITLED_STATUSES.includes(status) ? plan : "free"
}

export function limitsFor(plan: Plan, status: PlanStatus | null): PlanLimits {
  return PLAN_LIMITS[effectivePlan(plan, status)]
}

/** True when `plan` sits above `required` (or equals it) in the ladder. */
export function planAtLeast(plan: Plan, required: Plan): boolean {
  return PLANS.indexOf(plan) >= PLANS.indexOf(required)
}

/**
 * Whether a quota allows one more use. `null` limits are unlimited, so this is
 * the only place the null-means-unlimited convention gets interpreted.
 */
export function withinLimit(used: number, limit: number | null): boolean {
  return limit === null || used < limit
}
