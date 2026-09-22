import "server-only"

import { getBillingConfig } from "@/lib/billing/config"
import { periodEndOf } from "@/lib/billing/subscription-state"
import { logError, logInfo, logWarn } from "@/lib/observability/logger"

/**
 * Ending a subscription, for the two cases erasure creates.
 *
 * This file exists because of a gap found on 22/09/2026 while building
 * self-serve deletion: **`deleteUserEverywhere` never touched Stripe.** It
 * deleted the WorkOS user and the profile row, and the profile row is where
 * `stripe_subscription_id` lives — so after it ran, an active subscription kept
 * renewing against a customer with no account, and the person could not reach
 * the billing portal to stop it because they could no longer log in.
 *
 * That was already true of the admin delete button, so it is a pre-existing bug
 * rather than one this work introduced. But a self-serve delete would have
 * turned a rare admin action into something any subscriber could do to
 * themselves, which is why it gets fixed here rather than filed.
 *
 * Two operations, and they are not the same one:
 *
 * - `scheduleCancellationAtPeriodEnd` runs when deletion is *requested*. It
 *   stops the next charge and leaves the plan working for the period already
 *   paid for. Reversible, which matters: the request itself is reversible for
 *   thirty days, so anything it does to somebody's billing has to be too.
 * - `cancelSubscriptionNow` runs when the account is actually deleted. There is
 *   nothing left to attach a subscription to.
 */

/**
 * Whether Stripe is reachable at all.
 *
 * Every caller has to treat "not configured" as a normal state rather than an
 * error: it is what every local machine runs, and it is the same
 * `isXConfigured()` contract the rest of the product degrades through.
 */
export function isSubscriptionCancellationConfigured(): boolean {
  return getBillingConfig() !== null
}

/**
 * Stops the next renewal, keeping access to the end of the paid period.
 *
 * Returns the period end as an ISO string when Stripe reported one, so the
 * caller can tell the person the exact date their plan runs to. Returns null
 * when there is nothing to cancel, when billing is not configured, or when the
 * call failed — and the caller must not treat null as "it worked".
 */
export async function scheduleCancellationAtPeriodEnd(
  subscriptionId: string
): Promise<{ ok: boolean; periodEnd: string | null }> {
  const config = getBillingConfig()

  if (!config) {
    return { ok: false, periodEnd: null }
  }

  try {
    const subscription = await config.stripe.subscriptions.update(
      subscriptionId,
      { cancel_at_period_end: true }
    )

    // Through `periodEndOf` rather than reading the field, because Stripe moved
    // `current_period_end` from the subscription onto its items and that helper
    // already carries the fallback for older API versions. Re-deriving it here
    // would mean two places that have to learn the same thing twice.
    const seconds = periodEndOf(subscription)
    const periodEnd =
      seconds === null ? null : new Date(seconds * 1000).toISOString()

    logInfo("billing.cancel_at_period_end_set", { subscriptionId })

    return { ok: true, periodEnd }
  } catch (error) {
    logError("billing.cancel_at_period_end_failed", error, { subscriptionId })

    return { ok: false, periodEnd: null }
  }
}

/** Puts back a scheduled cancellation, for when a deletion request is withdrawn. */
export async function resumeSubscription(
  subscriptionId: string
): Promise<boolean> {
  const config = getBillingConfig()

  if (!config) {
    return false
  }

  try {
    await config.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    logInfo("billing.cancel_at_period_end_cleared", { subscriptionId })

    return true
  } catch (error) {
    logError("billing.resume_subscription_failed", error, { subscriptionId })

    return false
  }
}

/**
 * Ends the subscription immediately. Called on the way to deleting an account.
 *
 * Never throws, and the reason is about ordering rather than robustness: the
 * caller runs this **before** deleting the profile, because the profile row is
 * where `stripe_subscription_id` lives and after the delete nobody can find it
 * again. If this throwing aborted the deletion, a Stripe outage would block an
 * erasure request — so it reports and lets the deletion proceed.
 *
 * A failure here is the one case in this file worth an alert rather than a
 * warning: it leaves a subscription with no account behind it, which is the
 * exact state this file exists to prevent, and only a human can clean it up.
 */
export async function cancelSubscriptionNow(
  subscriptionId: string
): Promise<boolean> {
  const config = getBillingConfig()

  if (!config) {
    logWarn("billing.cancel_now_skipped", {
      subscriptionId,
      reason: "billing_not_configured",
    })

    return false
  }

  try {
    await config.stripe.subscriptions.cancel(subscriptionId)

    logInfo("billing.subscription_cancelled", { subscriptionId })

    return true
  } catch (error) {
    // Already gone is the success case, not a failure: it is the state we want.
    if ((error as { code?: string }).code === "resource_missing") {
      logInfo("billing.subscription_already_cancelled", { subscriptionId })

      return true
    }

    logError("billing.orphaned_subscription", error, { subscriptionId })

    return false
  }
}
