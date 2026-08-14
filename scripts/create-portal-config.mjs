/**
 * Creates (or updates) the EnergyCurve-specific Stripe Customer Portal
 * configuration.
 *
 * Why this exists instead of the dashboard's settings page: this Stripe account
 * is shared with StageLink, and both apps called
 * `billingPortal.sessions.create` without a `configuration` — which means both
 * fell back to the account's single *default* configuration. Configuring that
 * page for EnergyCurve would offer EnergyCurve plans to StageLink's customers
 * and break StageLink's plan-switch deep link (see the fallback it logs in
 * `apps/api/src/modules/billing/billing.service.ts`). So EnergyCurve gets its
 * own configuration and references it explicitly.
 *
 * Run:  node scripts/create-portal-config.mjs
 * Then: put the printed bpc_… id in STRIPE_PORTAL_CONFIGURATION_ID.
 *
 * Re-running with STRIPE_PORTAL_CONFIGURATION_ID already set updates that
 * configuration in place rather than creating a duplicate. Test and live mode
 * each need their own run — configurations are per-mode, like every other
 * Stripe object.
 */

import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import Stripe from "stripe"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

function loadEnvLocal() {
  const env = {}
  try {
    const raw = readFileSync(path.join(ROOT, ".env.local"), "utf8")
    for (const line of raw.split("\n")) {
      const match = /^([A-Z_]+)=(.*)$/.exec(line.trim())
      if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "")
    }
  } catch {
    // Fall through to process.env — CI and production pass real env vars.
  }
  // Empty strings are dropped rather than merged. `vercel env pull` returns
  // variables marked Sensitive with no value, and an empty string in process.env
  // would silently override a real one from .env.local — which reads as "the key
  // is missing" when it isn't.
  const fromProcess = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined && value !== "")
  )

  return { ...env, ...fromProcess }
}

/** test vs live, from the key itself. Printed before anything is written. */
function modeOf(secretKey) {
  if (secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")) return "LIVE"
  if (secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_")) return "test"
  return "unknown"
}

async function main() {
  const env = loadEnvLocal()
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set (looked in .env.local and the environment)"
    )
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY)
  const appUrl = env.NEXT_PUBLIC_APP_URL || "https://energycurve.app"

  // Said out loud because the failure this guards against is writing to the wrong
  // mode: the two catalogues are separate, and a test id with a live key (or the
  // reverse) is easy to arrive at by mixing an .env file with a shell variable.
  console.log(`mode: ${modeOf(env.STRIPE_SECRET_KEY)}  (from the secret key prefix)`)

  const priceIds = [
    env.STRIPE_PRICE_PRO_MONTHLY,
    env.STRIPE_PRICE_PRO_YEARLY,
    env.STRIPE_PRICE_PRO_PLUS_MONTHLY,
    env.STRIPE_PRICE_PRO_PLUS_YEARLY,
  ].filter(Boolean)

  if (priceIds.length === 0) {
    throw new Error(
      "No STRIPE_PRICE_* ids configured — nothing to offer in the portal"
    )
  }

  // Group prices by product, read from the environment rather than hardcoded,
  // so this script can't drift from what checkout actually sells.
  const byProduct = new Map()
  for (const id of priceIds) {
    const price = await stripe.prices.retrieve(id)
    const product =
      typeof price.product === "string" ? price.product : price.product.id
    if (!byProduct.has(product)) byProduct.set(product, [])
    byProduct.get(product).push(id)
  }
  const products = [...byProduct.entries()].map(([product, prices]) => ({
    product,
    prices,
  }))

  const params = {
    business_profile: {
      // Names the billing entity up front — the same disclosure the landing
      // page, the FAQ and the terms make, at the moment it matters most.
      headline: "EnergyCurve — billed by StageLink LLC",
      terms_of_service_url: `${appUrl}/terms`,
      privacy_policy_url: `${appUrl}/privacy`,
    },
    // Fallback only: our portal route sets return_url per session. This covers
    // sessions created outside the app (e.g. from a Stripe email).
    default_return_url: `${appUrl}/dashboard`,
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: {
        enabled: true,
        allowed_updates: ["name", "email", "address"],
      },
      subscription_cancel: {
        enabled: true,
        // They already paid for the period; cancelling mid-cycle invites refund
        // disputes we'd have to settle by hand.
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "missing_features",
            "switched_service",
            "unused",
            "customer_service",
            "too_complex",
            "other",
          ],
        },
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        products,
        proration_behavior: "create_prorations",
      },
    },
  }

  // An id set for one mode is meaningless in the other, and the ids give no hint
  // which mode they belong to. So confirm it resolves before updating, and create
  // instead of failing when it doesn't — that's the case of running against live
  // with a test id still in .env.local.
  let existing = env.STRIPE_PORTAL_CONFIGURATION_ID || null

  if (existing) {
    try {
      await stripe.billingPortal.configurations.retrieve(existing)
    } catch {
      console.log(
        `note: ${existing} does not exist in this mode — creating a new configuration`
      )
      existing = null
    }
  }

  const config = existing
    ? await stripe.billingPortal.configurations.update(existing, params)
    : await stripe.billingPortal.configurations.create(params)

  console.log(existing ? "updated" : "created", config.id)
  console.log("  livemode:  ", config.livemode)
  console.log("  is_default:", config.is_default)
  console.log("  headline:  ", config.business_profile.headline)
  console.log("  tos:       ", config.business_profile.terms_of_service_url)
  console.log("  privacy:   ", config.business_profile.privacy_policy_url)

  // Stripe makes the first configuration in a mode the default one; there's no
  // API field to opt out. Harmless while we pass `configuration` explicitly,
  // but it means any *other* product on this account that doesn't pass one
  // would now land in EnergyCurve's portal.
  if (config.is_default) {
    console.log(
      "\n! This configuration is the account default for this mode, because no\n" +
        "  default existed yet. StageLink also opens portal sessions without a\n" +
        "  configuration, so in this mode it would now get EnergyCurve's portal.\n" +
        "  Check this before trusting it in live mode."
    )
  }

  // The redesigned-portal beta accepts `features.subscription_update.products`
  // but does not echo it back, so there's nothing to assert here. Verify which
  // plans are offered by opening the portal and looking.
  if (!config.features.subscription_update.products) {
    console.log(
      "\n! Stripe did not return subscription_update.products, so the plan\n" +
        "  restriction could not be confirmed from the API. Open the portal and\n" +
        "  check that only EnergyCurve plans are offered."
    )
  }

  console.log("\nSet this in .env.local and Vercel:")
  console.log(`  STRIPE_PORTAL_CONFIGURATION_ID=${config.id}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
