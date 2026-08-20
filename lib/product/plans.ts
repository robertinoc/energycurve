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
  "unpaid",
  "canceled",
  "incomplete",
] as const

export type PlanStatus = (typeof PLAN_STATUSES)[number]

/**
 * Statuses that actually unlock paid features.
 *
 * `past_due` is in here, and it is the whole point of the dunning change: it means
 * a payment failed and **Stripe is still retrying**, over a window of days. Cutting
 * a paying customer off the moment their bank declines once — while the retry is
 * very likely to succeed — is punishing them for their card issuer's hiccup, and
 * it was already contrary to the stated intent of the status map, which says in
 * `subscription-state.ts` that past_due means "we haven't been paid, don't revoke
 * yet". The code did revoke. Now it doesn't.
 *
 * `unpaid` is deliberately NOT in here, and is now a status of its own rather than
 * folded into past_due. It means Stripe exhausted its retries: the grace window is
 * over and access ends. Without that split, entitling past_due would have entitled
 * a dead subscription forever.
 */
const ENTITLED_STATUSES: readonly PlanStatus[] = [
  "active",
  "trialing",
  "past_due",
]

export interface PlanLimits {
  /** Playlists a user may keep. `null` = unlimited. */
  activePlaylists: number | null
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
 * Limits per tier.
 *
 * Two things deliberately absent. **Native export** — Rekordbox XML, Traktor NML and M3U8 — is free on
 * every tier, permanently: exporting the fixed order back to the booth is what
 * makes the analysis actionable, so paywalling it breaks the product loop.
 * **Applied fixes** are uncapped for the same family of reason plus a practical
 * one: applying a fix is local, instant and reversible, with no server boundary
 * to meter. A cap that can't be enforced is a promise we'd be breaking.
 * Do not add either here.
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    activePlaylists: 3,
    aiOrderingsPerMonth: 1,
    customTaxonomies: 2,
    audioAnalysis: false,
    versionHistory: false,
    proWorkflow: false,
  },
  pro: {
    activePlaylists: null,
    aiOrderingsPerMonth: 3,
    customTaxonomies: null,
    audioAnalysis: true,
    versionHistory: true,
    proWorkflow: false,
  },
  pro_plus: {
    activePlaylists: null,
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

/**
 * Whether an email is on the complimentary PRO+ list.
 *
 * Pure and separately tested because it *grants* a paid plan: the risk isn't that
 * it fails to match, it's that it matches too much. Exact, case-insensitive
 * comparison on trimmed entries — never a substring or domain check, which would
 * hand PRO+ to anyone who could register a lookalike address.
 */
export function isComplimentaryProPlus(
  email: string | null | undefined,
  rawList: string | undefined
): boolean {
  if (!email || !rawList) {
    return false
  }

  const allowed = rawList
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  return allowed.includes(email.trim().toLowerCase())
}
