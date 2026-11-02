import type { SiteLocale } from "@/lib/content/site-copy"
import {
  PLAN_LIMITS,
  PLANS,
  effectivePlan,
  type Plan,
  type PlanStatus,
} from "@/lib/product/plans"

/**
 * The places inside the app that sell a plan at the moment it is worth
 * something (docs/conversion-plan.md, phase 3). Each one tells the DJ what the
 * plan would change right there, with the plan's badge and a way to the
 * pricing page — a wall, not an absence.
 *
 * The ids are stable: they are the `wall` property of `sales_wall_clicked`,
 * and a renamed id splits one wall's history in two.
 */
export const SALES_WALLS = [
  /** The fourth playlist on FREE (`active_playlists`). */
  "playlist_limit",
  /** The month's AI orderings are spent (`ai_ordering`). */
  "ai_ordering_limit",
  /** A re-analysis just raised the score: the one wall that is not a limit. */
  "score_improved",
  /** Splitting a long list into sets (PR #296). */
  "multi_set_split",
] as const

export type SalesWall = (typeof SALES_WALLS)[number]

export function isSalesWall(value: unknown): value is SalesWall {
  return typeof value === "string" && (SALES_WALLS as readonly string[]).includes(value)
}

/** The paid plans a wall can point at. */
export type UpsellPlan = Exclude<Plan, "free">

export const UPSELL_PLAN_LABEL: Record<UpsellPlan, string> = {
  pro: "PRO",
  pro_plus: "PRO+",
}

/**
 * Where a wall's button goes: through the counting redirect, which lands on
 * the pricing page in the DJ's language. A plain link on purpose (an `<a>`,
 * not next/link) — a prefetch would count a click nobody made.
 */
export function salesWallHref(wall: SalesWall, locale: SiteLocale): string {
  return `/api/sales-wall?wall=${wall}&locale=${locale}`
}

/**
 * The plan that gives this account more AI orderings, or null when none does.
 *
 * FREE → PRO (more a month), PRO → PRO+ (no monthly limit), PRO+ → null. Read
 * from PLAN_LIMITS rather than written down, so the wall can't name a plan
 * that stopped being the answer. Uses the effective plan: a lapsed PRO is on
 * FREE's allowance, and PRO is what restores it.
 */
export function aiOrderingUpgrade(plan: Plan, status: PlanStatus | null): UpsellPlan | null {
  const current = PLAN_LIMITS[effectivePlan(plan, status)].aiOrderingsPerMonth

  if (current === null) {
    return null
  }

  const better = PLANS.find((candidate): candidate is UpsellPlan => {
    if (candidate === "free") return false
    const allowance = PLAN_LIMITS[candidate].aiOrderingsPerMonth
    return allowance === null || allowance > current
  })

  return better ?? null
}
