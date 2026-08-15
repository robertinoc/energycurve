/**
 * Naming what happened to a subscription.
 *
 * The webhook knows the plan a customer is on *now*. That alone can't tell
 * conversion from churn: "they're on PRO" is the same fact whether they just
 * bought it, just came back, or just stepped down from PRO+. The transition is
 * the event, so the classification lives here — pure, and tested, because
 * mislabelling a cancellation as a downgrade would quietly understate churn in
 * every dashboard built on top of it.
 */

import { PLANS, type Plan, type PlanStatus } from "@/lib/product/plans"

export type BillingTransition =
  /** Free (or nothing) → a paid plan. The conversion. */
  | "subscription_started"
  /** Paid → more expensive paid. */
  | "plan_upgraded"
  /** Paid → cheaper paid, but still paying. */
  | "plan_downgraded"
  /** Paid → free, by cancellation or by payment failure. The churn. */
  | "subscription_ended"
  /** Same plan, still paying — a renewal or an unrelated field changing. */
  | "plan_unchanged"

/** PLANS is declared cheapest-first, which is what makes this a ladder. */
function rank(plan: Plan): number {
  return PLANS.indexOf(plan)
}

/**
 * Classifies a plan change.
 *
 * `status` is the *new* subscription status, and it outranks the plan
 * comparison: a subscription that lapses while nominally still on PRO has
 * ended, whatever the plan column says. Reading the plan alone would file that
 * as "unchanged" and lose the churn entirely.
 */
export function classifyPlanTransition(
  before: Plan,
  after: Plan,
  status: PlanStatus | null
): BillingTransition {
  const paying = status === "active" || status === "trialing"

  if (!paying || after === "free") {
    // Never on a paid plan to begin with: nothing ended, so don't invent an
    // event that would show up as churn from a user who never converted.
    return before === "free" ? "plan_unchanged" : "subscription_ended"
  }

  if (before === "free") {
    return "subscription_started"
  }

  if (rank(after) > rank(before)) {
    return "plan_upgraded"
  }

  if (rank(after) < rank(before)) {
    return "plan_downgraded"
  }

  return "plan_unchanged"
}

/** The transitions that are also analytics events, by construction. */
export type ReportableTransition = Exclude<BillingTransition, "plan_unchanged">

/**
 * Whether a transition is worth sending.
 *
 * Stripe emits `customer.subscription.updated` for changes we don't care about
 * — a card being replaced, metadata edits, the period rolling over. Those all
 * classify as unchanged, and letting them through would bury the four events
 * that mean something under renewal noise.
 *
 * A type predicate rather than a plain boolean so the compiler, not a reviewer,
 * is what stops `plan_unchanged` reaching PostHog as an event name.
 */
export function isReportableTransition(
  transition: BillingTransition
): transition is ReportableTransition {
  return transition !== "plan_unchanged"
}
