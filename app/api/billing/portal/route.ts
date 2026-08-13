import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { getBillingConfig } from "@/lib/billing/config"
import { logError } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"
import { getProfileBilling } from "@/services/billing-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const dynamic = "force-dynamic"

/**
 * Opens Stripe's hosted billing portal so a subscriber can change plan, update
 * their card, or cancel — without us building any of it, and without card data
 * ever touching our servers.
 *
 * Shipping this alongside checkout is deliberate: taking money with no
 * self-serve way to stop paying is the kind of thing that generates chargebacks
 * and, in several jurisdictions, isn't legal.
 */
export async function POST(request: Request) {
  const config = getBillingConfig()
  if (!config) {
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
    key: `billing-portal:${user.id}`,
    limit: 10,
    windowMs: 60_000,
  })
  if (!rate.allowed) {
    return NextResponse.json({ error: "Slow down." }, { status: 429 })
  }

  try {
    const profile = await syncProfileFromWorkOSUser({
      id: user.id,
      email: user.email,
    })
    const billing = await getProfileBilling(profile.id)

    if (!billing.stripeCustomerId) {
      // Never subscribed, so there's nothing to manage.
      return NextResponse.json(
        { error: "No billing account yet." },
        { status: 404 }
      )
    }

    const origin = new URL(request.url).origin
    const session = await config.stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${origin}/dashboard`,
      // Pin EnergyCurve's own portal configuration. Omitting this makes Stripe
      // fall back to the account default, which this account shares with
      // StageLink — see the note on `portalConfigurationId` in
      // lib/billing/config.ts for what that breaks in both directions.
      ...(config.portalConfigurationId
        ? { configuration: config.portalConfigurationId }
        : {}),
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logError("billing.portal.failed", error)
    return NextResponse.json(
      { error: "Unable to open the billing portal." },
      { status: 502 }
    )
  }
}
