import { NextResponse } from "next/server"
import type Stripe from "stripe"

import {
  classifyPlanTransition,
  isReportableTransition,
} from "@/lib/analytics/billing-events"
import { captureServerEvent } from "@/lib/analytics/posthog-server"
import { getBillingConfig } from "@/lib/billing/config"
import {
  cancelAtOf,
  canceledSubscription,
  cancellationFeedbackOf,
  customerIdOf,
  isHandledEvent,
  periodEndOf,
  priceIdsOf,
  resolveSubscription,
} from "@/lib/billing/subscription-state"
import { logError, logInfo, logWarn } from "@/lib/observability/logger"
import { isPlan } from "@/lib/product/plans"
import {
  applySubscription,
  attachStripeCustomer,
  claimBillingEvent,
  findProfileIdByStripeCustomer,
  getProfileBilling,
} from "@/services/billing-service"
import type { Json } from "@/types/database"

export const dynamic = "force-dynamic"

/**
 * Stripe webhook — the **only** thing that grants or revokes paid entitlement.
 *
 * Three rules this file exists to enforce:
 *
 * 1. **Verify the signature before trusting a byte.** Anyone can POST here.
 * 2. **Be idempotent.** Stripe retries on any non-2xx and can deliver the same
 *    event twice even after a success.
 * 3. **Return 2xx for anything we understand**, including events we ignore —
 *    a non-2xx makes Stripe retry the same event for days.
 */

/**
 * Finds our profile for an event: the id we stamped on the object when creating
 * the checkout session, else a lookup by Stripe customer id.
 */
async function resolveProfileId(
  metadataProfileId: string | null | undefined,
  customerId: string | null
): Promise<string | null> {
  if (metadataProfileId) {
    return metadataProfileId
  }

  return customerId ? findProfileIdByStripeCustomer(customerId) : null
}

export async function POST(request: Request) {
  const config = getBillingConfig()
  if (!config) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 }
    )
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 })
  }

  // The raw body is required: signature verification is over exact bytes, so
  // it must be read as text and never parsed first.
  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = config.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.webhookSecret
    )
  } catch (error) {
    // A bad signature is either a misconfigured secret or a forgery. 400 tells
    // Stripe not to bother retrying.
    logWarn("billing.webhook.bad_signature", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }

  if (!isHandledEvent(event.type)) {
    // Acknowledged on purpose: Stripe sends dozens of types we don't care about
    // and would retry each one until it got a 2xx.
    return NextResponse.json({ received: true, ignored: event.type })
  }

  try {
    let profileId: string | null = null

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = customerIdOf(session.customer)

      profileId = await resolveProfileId(
        session.client_reference_id ?? session.metadata?.profile_id,
        customerId
      )

      if (!profileId) {
        // Nothing to attribute this to. Acknowledge so Stripe stops retrying,
        // but make it loud — it means checkout was created without our metadata.
        logError(
          "billing.webhook.unattributable",
          new Error("checkout.session.completed without a resolvable profile"),
          { eventId: event.id }
        )
        return NextResponse.json({ received: true, unattributed: true })
      }

      if (!(await claimBillingEvent(event.id, event.type, profileId, event as unknown as Json))) {
        return NextResponse.json({ received: true, duplicate: true })
      }

      // Persist the customer link; the subscription.* events that follow carry
      // the authoritative plan and will land through the branch below.
      if (customerId) {
        await attachStripeCustomer(profileId, customerId)
      }

      logInfo("billing.webhook.checkout_completed", { profileId })
      return NextResponse.json({ received: true })
    }

    const subscription = event.data.object as Stripe.Subscription
    const customerId = customerIdOf(subscription.customer)

    profileId = await resolveProfileId(
      subscription.metadata?.profile_id,
      customerId
    )

    if (!profileId) {
      logError(
        "billing.webhook.unattributable",
        new Error(`${event.type} without a resolvable profile`),
        { eventId: event.id }
      )
      return NextResponse.json({ received: true, unattributed: true })
    }

    if (!(await claimBillingEvent(event.id, event.type, profileId, event as unknown as Json))) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    if (event.type === "customer.subscription.deleted") {
      const current = await getProfileBilling(profileId)
      const purchased = isPlan(current.plan) ? current.plan : "free"
      const feedback =
        cancellationFeedbackOf(subscription) ?? current.cancellationFeedback

      // The only churn signal we ever get, and it arrives once. Captured before
      // the write so a failure to persist still leaves the event recorded.
      captureServerEvent(profileId, "subscription_ended", {
        plan: purchased,
        reason: feedback,
      })
      // Carry the reason across: the deleted event may not repeat it, and it's
      // the only churn signal we ever get.
      await applySubscription(
        profileId,
        canceledSubscription(purchased, feedback)
      )
      logInfo("billing.webhook.subscription_canceled", { profileId })
      return NextResponse.json({ received: true })
    }

    const resolved = resolveSubscription(
      {
        id: subscription.id,
        status: subscription.status,
        priceIds: priceIdsOf(subscription),
        currentPeriodEnd: periodEndOf(subscription),
        cancelAt: cancelAtOf(subscription),
        cancellationFeedback: cancellationFeedbackOf(subscription),
      },
      config.prices
    )

    // Read before the write: after applySubscription the previous plan is gone,
    // and without it "they're on PRO" can't be told apart from "they just bought
    // PRO", "they came back", or "they stepped down from PRO+".
    const previous = await getProfileBilling(profileId)
    const transition = classifyPlanTransition(
      isPlan(previous.plan) ? previous.plan : "free",
      resolved.plan,
      resolved.status
    )

    await applySubscription(profileId, resolved)

    if (isReportableTransition(transition)) {
      captureServerEvent(profileId, transition, {
        plan: resolved.plan,
        previousPlan: previous.plan,
        status: resolved.status,
      })
    }

    logInfo("billing.webhook.subscription_applied", {
      profileId,
      plan: resolved.plan,
      status: resolved.status,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    // A 500 here is deliberate: Stripe will retry, which is what we want when
    // the failure was ours (a DB blip) rather than the payload's.
    logError("billing.webhook.failed", error, { eventId: event.id })
    return NextResponse.json({ error: "Handler failed." }, { status: 500 })
  }
}
