import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { captureServerEvent } from "@/lib/analytics/posthog-server"
import { getBillingConfig, priceIdFor } from "@/lib/billing/config"
import { logError, logInfo } from "@/lib/observability/logger"
import { isPlan, type BillingInterval } from "@/lib/product/plans"
import { checkRateLimit } from "@/lib/rate-limit"
import {
  attachStripeCustomer,
  getProfileBilling,
} from "@/services/billing-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const dynamic = "force-dynamic"

/**
 * Starts a Stripe Checkout session for a plan + interval.
 *
 * The client picks *what to buy*, never what it costs: the price id is resolved
 * server-side from the environment, so a tampered request can't buy PRO+ at the
 * PRO price. Entitlement is granted only by the webhook, never here — a user who
 * abandons the hosted page has no session to "confirm".
 */
export async function POST(request: Request) {
  const config = getBillingConfig()
  if (!config) {
    // Billing is optional; a deployment without keys simply can't sell.
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 }
    )
  }

  const { user } = await withAuth()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const rate = checkRateLimit({
    key: `billing-checkout:${user.id}`,
    limit: 10,
    windowMs: 60_000,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
      }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  }

  const { plan, interval } = (body ?? {}) as {
    plan?: unknown
    interval?: unknown
  }

  if (!isPlan(plan) || plan === "free") {
    return NextResponse.json(
      { error: "Choose a paid plan." },
      { status: 400 }
    )
  }

  if (interval !== "monthly" && interval !== "yearly") {
    return NextResponse.json({ error: "Invalid interval." }, { status: 400 })
  }

  const priceId = priceIdFor(plan, interval as BillingInterval)
  if (!priceId) {
    return NextResponse.json(
      { error: "That plan isn't available right now." },
      { status: 503 }
    )
  }

  try {
    const profile = await syncProfileFromWorkOSUser({
      id: user.id,
      email: user.email,
    })
    const billing = await getProfileBilling(profile.id)

    const origin = new URL(request.url).origin

    const session = await config.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the customer when we already have one so a second purchase
      // doesn't create a duplicate in Stripe.
      ...(billing.stripeCustomerId
        ? { customer: billing.stripeCustomerId }
        : { customer_email: user.email }),
      // The webhook resolves the profile from this, so it must always be set.
      client_reference_id: profile.id,
      metadata: { profile_id: profile.id },
      subscription_data: { metadata: { profile_id: profile.id } },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    })

    if (!session.url) {
      throw new Error("Stripe returned a session without a URL.")
    }

    // If Stripe created the customer for us, remember it now rather than
    // waiting for the webhook — it makes the portal work immediately.
    if (!billing.stripeCustomerId && typeof session.customer === "string") {
      await attachStripeCustomer(profile.id, session.customer)
    }

    logInfo("billing.checkout.created", {
      profileId: profile.id,
      plan,
      interval,
    })

    // The top of the funnel. The gap between this and `subscription_started` is
    // abandonment at Stripe's page — a number nothing in our database can
    // reconstruct after the fact, because an abandoned checkout leaves no trace
    // on our side at all.
    captureServerEvent(profile.id, "checkout_started", {
      plan,
      interval,
      fromPlan: billing.plan,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logError("billing.checkout.failed", error)
    return NextResponse.json(
      { error: "Unable to start checkout." },
      { status: 502 }
    )
  }
}
