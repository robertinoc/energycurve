/**
 * Capability → plan registry: the code-side mirror of the public plan matrix.
 *
 * Two things live here that `PLAN_LIMITS` can't express:
 *
 * 1. **Features that don't exist yet.** Gig Mode, version history and audio
 *    analysis are already sold as "soon" on `/pricing`, so their tier is already
 *    a promise. Recording it here means a feature arrives with its plan already
 *    decided, instead of the decision being improvised at merge time.
 * 2. **A joinable key.** Every row of the public matrix carries the same key, so
 *    `tests/capabilities.test.ts` can prove the two agree. Without that, the
 *    marketing page and the gate drift silently — which is exactly what happened
 *    with custom taxonomies: `/pricing` promised 2, the code enforced 12.
 *
 * Counted quotas keep their numbers in `PLAN_LIMITS` (one source of truth for
 * "how many"); this registry only says which tier unlocks a thing at all and
 * whether it's built. `limit` links the two.
 */

import { PLANS, type Plan, type PlanLimits, type PlanStatus } from "./plans"
import { effectivePlan, limitsFor, planAtLeast } from "./plans"

/** Whether the capability exists in the product today. */
export type CapabilityStatus = "shipped" | "planned"

export interface CapabilitySpec {
  /** Lowest plan that unlocks it. */
  minPlan: Plan
  status: CapabilityStatus
  /**
   * The `PlanLimits` key backing this capability, when there is one. Boolean
   * limits gate access; numeric limits cap usage at every tier.
   */
  limit?: keyof PlanLimits
  /** Why it sits where it does, when that isn't self-evident. */
  note?: string
}

/**
 * Keyed by the same string as the matching row in
 * `siteCopy.pricing.rows[].key`.
 */
export const CAPABILITIES = {
  // ── Free: everything needed to see a set's shape and act on it ────────────
  active_playlists: {
    minPlan: "free",
    status: "shipped",
    limit: "activePlaylists",
  },
  import_all_formats: { minPlan: "free", status: "shipped" },
  analysis_core: { minPlan: "free", status: "shipped" },
  applied_fixes: {
    minPlan: "free",
    status: "shipped",
    note: "Uncapped on every tier: applying a fix is local, instant and reversible, so there is no server boundary to meter. See docs/plan-gating.md.",
  },
  heuristic_reordering: { minPlan: "free", status: "shipped" },
  ai_ordering: {
    minPlan: "free",
    status: "shipped",
    limit: "aiOrderingsPerMonth",
    note: "Free tier gets one a month because it costs us a Claude call; the cap is the point, not the access.",
  },
  export_csv_txt: { minPlan: "free", status: "shipped" },
  native_export: {
    minPlan: "free",
    status: "shipped",
    note: "Rekordbox XML, Traktor NML and M3U8 stay free on every tier, permanently. Getting the fixed order back into the booth is what makes the analysis worth anything — paywalling it breaks the product loop. Do not move this.",
  },
  custom_taxonomies: {
    minPlan: "free",
    status: "shipped",
    limit: "customTaxonomies",
    note: "Counted across contexts and genres combined, not per kind.",
  },
  search_organization: { minPlan: "free", status: "shipped" },

  // ── PRO: the engine gets better ───────────────────────────────────────────
  audio_analysis: { minPlan: "pro", status: "shipped", limit: "audioAnalysis" },
  /**
   * Split from audio_analysis rather than folded into it: tempo detection is
   * production-ready (19/19 exact against tagged files) while key detection sits
   * at 21%, and one capability covering both would let the pricing page promise
   * the second on the strength of the first.
   */
  key_detection: { minPlan: "pro", status: "planned", limit: "audioAnalysis" },
  energy_model_v3: { minPlan: "pro", status: "planned" },
  version_history: { minPlan: "pro", status: "shipped", limit: "versionHistory" },
  slot_aware_planning: {
    minPlan: "pro",
    status: "shipped",
    note: "Declaring the slot is free — it's a fact about the gig. Reading the curve against it is what PRO buys. Gated in services/analysis-service.ts.",
  },
  named_curve_shapes: { minPlan: "pro", status: "shipped" },
  planned_vs_played: { minPlan: "pro", status: "shipped" },
  printable_set_sheet: { minPlan: "pro", status: "shipped" },

  // ── PRO+: professional workflow ───────────────────────────────────────────
  custom_curve_templates: { minPlan: "pro_plus", status: "shipped" },
  residency_mode: {
    minPlan: "pro_plus",
    status: "shipped",
    note: "Needs a venue on the playlist and a set marked as played at that same venue; without both it reports nothing. Gated in services/residency-service.ts, called from both the playlist page and the analysis workbench.",
  },
  b2b_sets: {
    minPlan: "pro_plus",
    status: "shipped",
    note: "First slice: share a set read-only with another DJ, who can leave suggestions. Not simultaneous editing. Gated on the OWNER's plan in services/collaboration-service.ts — a collaborator needs no plan, because requiring both parties to pay is a feature that mostly doesn't work.",
  },
  gig_mode: { minPlan: "pro_plus", status: "shipped", limit: "proWorkflow" },
  global_library: { minPlan: "pro_plus", status: "shipped", limit: "proWorkflow" },
  /**
   * The first shipped capability behind `proWorkflow`, which until now was a
   * limit nothing consulted — a switch with no lamp on it.
   */
  set_comparator: { minPlan: "pro_plus", status: "shipped", limit: "proWorkflow" },
  transition_suggestions: {
    minPlan: "pro_plus",
    status: "shipped",
    limit: "proWorkflow",
  },
} as const satisfies Record<string, CapabilitySpec>

export type CapabilityKey = keyof typeof CAPABILITIES

/**
 * Matrix rows that describe the offer without gating any code. They still need
 * a key so the row can be matched, but they have no registry entry — listing
 * them explicitly keeps the consistency test honest instead of letting it skip
 * anything it can't find.
 */
export const NON_GATED_MATRIX_ROWS = ["support"] as const

export function isCapabilityKey(value: string): value is CapabilityKey {
  return Object.hasOwn(CAPABILITIES, value)
}

/**
 * A registry entry widened to the interface.
 *
 * `as const satisfies` narrows each entry to its own literal shape, so entries
 * that don't declare `limit` don't have the property in their type at all.
 * Reading through here keeps every caller from having to annotate around that.
 */
export function specFor(capability: CapabilityKey): CapabilitySpec {
  return CAPABILITIES[capability]
}

/**
 * Whether this plan may use the capability *at all*.
 *
 * Deliberately ignores whether the feature is built: a `planned` capability is
 * unreachable because there's no code to reach, and pretending otherwise here
 * would mean the gate answers a different question than the one it's asked.
 * Use `isAvailable` when you need "can this person use it right now".
 */
export function can(
  plan: Plan,
  status: PlanStatus | null,
  capability: CapabilityKey
): boolean {
  // Widened to the interface on purpose: `as const satisfies` narrows each entry
  // to its own literal shape, so `limit` is absent from the type of entries that
  // don't declare one.
  const spec: CapabilitySpec = CAPABILITIES[capability]
  const entitled = effectivePlan(plan, status)

  if (!planAtLeast(entitled, spec.minPlan)) {
    return false
  }

  // A boolean limit is the authority when one exists, so a tier's limits and
  // this registry can't disagree about the same switch.
  if (spec.limit) {
    const value = limitsFor(plan, status)[spec.limit]
    if (typeof value === "boolean") {
      return value
    }
  }

  return true
}

/** `can`, plus the feature actually existing. */
export function isAvailable(
  plan: Plan,
  status: PlanStatus | null,
  capability: CapabilityKey
): boolean {
  return CAPABILITIES[capability].status === "shipped" && can(plan, status, capability)
}

/** The numeric cap for a counted capability — `null` when unlimited. */
export function quotaFor(
  plan: Plan,
  status: PlanStatus | null,
  capability: CapabilityKey
): number | null {
  const spec: CapabilitySpec = CAPABILITIES[capability]

  if (!spec.limit) {
    throw new Error(`${capability} is not a counted capability`)
  }

  const value = limitsFor(plan, status)[spec.limit]

  if (typeof value === "boolean") {
    throw new Error(`${capability} is a switch, not a quota — use can()`)
  }

  return value
}

/** The lowest plan that unlocks a capability, for "upgrade to X" copy. */
export function upgradeTargetFor(capability: CapabilityKey): Plan {
  return CAPABILITIES[capability].minPlan
}

/** Every capability a plan unlocks, in ladder order. Useful for plan screens. */
export function capabilitiesFor(plan: Plan): CapabilityKey[] {
  return (Object.keys(CAPABILITIES) as CapabilityKey[]).filter((key) =>
    planAtLeast(plan, CAPABILITIES[key].minPlan)
  )
}

/** Capabilities sold as "soon" — what a paying user is still waiting for. */
export function plannedCapabilities(): CapabilityKey[] {
  return (Object.keys(CAPABILITIES) as CapabilityKey[]).filter(
    (key) => CAPABILITIES[key].status === "planned"
  )
}

/** Sanity guard used by the tests: every minPlan must be a real plan. */
export function allCapabilityPlans(): Plan[] {
  return (Object.keys(CAPABILITIES) as CapabilityKey[])
    .map((key) => CAPABILITIES[key].minPlan)
    .filter((plan) => (PLANS as readonly string[]).includes(plan))
}
