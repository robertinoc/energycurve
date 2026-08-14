import "server-only"

import { getSupabaseAdminClient } from "@/lib/supabase/server"
import type { ResolvedSubscription } from "@/lib/billing/subscription-state"
import {
  effectivePlan,
  isComplimentaryProPlus,
  isPlan,
  isPlanStatus,
  limitsFor,
  type Plan,
  type PlanLimits,
  type PlanStatus,
} from "@/lib/product/plans"
import type { Json } from "@/types/database"

/**
 * Persistence for subscription state.
 *
 * Every write here is driven by a signature-verified Stripe webhook. Nothing in
 * this file may be reachable from client input — the client can ask to *start* a
 * checkout, never to set a plan.
 */

export interface ProfileBilling {
  plan: Plan
  status: PlanStatus | null
  /** Limits already resolved through entitlement (a lapsed PRO reads as free). */
  limits: PlanLimits
  /** The plan actually in force, after status is taken into account. */
  entitledPlan: Plan
  currentPeriodEnd: Date | null
  stripeCustomerId: string | null
  /** Set when a cancellation is scheduled: the date access actually ends. */
  cancelAt: Date | null
  /** Why they cancelled, as Stripe's portal recorded it. */
  cancellationFeedback: string | null
}

/** Free-tier defaults, used for a missing profile or an unrecognised value. */
function freeBilling(stripeCustomerId: string | null = null): ProfileBilling {
  return {
    plan: "free",
    status: null,
    limits: limitsFor("free", null),
    entitledPlan: "free",
    currentPeriodEnd: null,
    stripeCustomerId,
    cancelAt: null,
    cancellationFeedback: null,
  }
}

export async function getProfileBilling(
  profileId: string
): Promise<ProfileBilling> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "email, plan, plan_status, plan_current_period_end, stripe_customer_id, plan_cancel_at, plan_cancellation_feedback"
    )
    .eq("id", profileId)
    .maybeSingle()

  if (error) {
    throw new Error("Unable to load billing state for this profile.")
  }

  if (!data) {
    return freeBilling()
  }

  // Defensive: the DB has a CHECK constraint, but a value we don't recognise
  // must degrade to free rather than throw on a page render.
  const storedPlan = isPlan(data.plan) ? data.plan : "free"
  const storedStatus = isPlanStatus(data.plan_status) ? data.plan_status : null

  // A comped account reads as an active PRO+ subscription everywhere, so the
  // gates it passes are the same code paths a paying PRO+ user goes through —
  // testing a bypass would prove nothing about the real thing.
  // Emails listed in COMP_PRO_PLUS_EMAILS get PRO+ without a subscription: the
  // owner's own account, plus anything comped for a demo. Kept in the environment
  // rather than in source so a comp can be revoked without a deploy of code, and
  // so personal emails stay out of git history. Unset means nobody is comped.
  // The list is matched against the profile row's email, which only WorkOS
  // writes — it is not reachable from client input.
  const comped = isComplimentaryProPlus(
    data.email,
    process.env.COMP_PRO_PLUS_EMAILS
  )
  const plan: Plan = comped ? "pro_plus" : storedPlan
  const status: PlanStatus | null = comped ? "active" : storedStatus

  return {
    plan,
    status,
    limits: limitsFor(plan, status),
    entitledPlan: effectivePlan(plan, status),
    currentPeriodEnd: data.plan_current_period_end
      ? new Date(data.plan_current_period_end)
      : null,
    stripeCustomerId: data.stripe_customer_id,
    cancelAt: data.plan_cancel_at ? new Date(data.plan_cancel_at) : null,
    cancellationFeedback: data.plan_cancellation_feedback ?? null,
  }
}

/** Links a Stripe customer to a profile. Idempotent. */
export async function attachStripeCustomer(
  profileId: string,
  stripeCustomerId: string
): Promise<void> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", profileId)

  if (error) {
    throw new Error("Unable to attach the Stripe customer to this profile.")
  }
}

export async function findProfileIdByStripeCustomer(
  stripeCustomerId: string
): Promise<string | null> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle()

  if (error) {
    throw new Error("Unable to resolve a profile from the Stripe customer.")
  }

  return data?.id ?? null
}

/** Writes resolved subscription state onto the profile. */
export async function applySubscription(
  profileId: string,
  subscription: ResolvedSubscription
): Promise<void> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: subscription.plan,
      plan_status: subscription.status,
      plan_current_period_end:
        subscription.currentPeriodEnd?.toISOString() ?? null,
      stripe_subscription_id: subscription.stripeSubscriptionId,
      plan_cancel_at: subscription.cancelAt?.toISOString() ?? null,
      // Written unconditionally, including back to null: a customer who clicks
      // "don't cancel" must stop looking like a churn statistic.
      plan_cancellation_feedback: subscription.cancellationFeedback,
    })
    .eq("id", profileId)

  if (error) {
    throw new Error("Unable to persist the subscription state.")
  }
}

/**
 * Records a webhook event, returning false when it was already processed.
 *
 * The event id is the table's primary key, so the insert itself is the
 * idempotency check — two concurrent deliveries of the same event can't both
 * win. Stripe retries on any non-2xx and may deliver twice even after a 2xx,
 * so every handler goes through here first.
 */
export async function claimBillingEvent(
  eventId: string,
  type: string,
  profileId: string | null,
  payload: Json | null
): Promise<boolean> {
  const supabase = getSupabaseAdminClient()

  const { error } = await supabase.from("billing_events").insert({
    id: eventId,
    type,
    profile_id: profileId,
    payload,
  })

  if (!error) {
    return true
  }

  // 23505 = unique_violation: this event has already been handled.
  if ((error as { code?: string }).code === "23505") {
    return false
  }

  throw new Error("Unable to record the billing event.")
}
