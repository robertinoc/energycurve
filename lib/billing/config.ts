import "server-only"

import Stripe from "stripe"

import type { BillingInterval, Plan } from "@/lib/product/plans"

/**
 * Stripe wiring. Billing is **optional**, the same way the Claude integration
 * is: with no keys set the app runs exactly as before and every billing route
 * answers 503 instead of crashing. That keeps local dev and preview deploys
 * working without anyone holding live credentials.
 *
 * These are read straight from `process.env` rather than through
 * `lib/env.ts` on purpose: that schema is strict and throws when a variable is
 * missing, which would break every deployment that doesn't sell anything.
 *
 * Setup runbook: docs/billing.md
 */

/** Price ids for the four purchasable combinations, from the environment. */
function priceIds(): Record<string, { plan: Plan; interval: BillingInterval }> {
  const map: Record<string, { plan: Plan; interval: BillingInterval }> = {}

  const entries: [string | undefined, Plan, BillingInterval][] = [
    [process.env.STRIPE_PRICE_PRO_MONTHLY, "pro", "monthly"],
    [process.env.STRIPE_PRICE_PRO_YEARLY, "pro", "yearly"],
    [process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY, "pro_plus", "monthly"],
    [process.env.STRIPE_PRICE_PRO_PLUS_YEARLY, "pro_plus", "yearly"],
  ]

  for (const [id, plan, interval] of entries) {
    if (id) {
      map[id] = { plan, interval }
    }
  }

  return map
}

export interface BillingConfig {
  stripe: Stripe
  webhookSecret: string
  /** price id → what buying it grants. */
  prices: Record<string, { plan: Plan; interval: BillingInterval }>
  /**
   * Customer Portal configuration to open sessions with, or null to use the
   * Stripe account's default.
   *
   * This matters because the Stripe account is shared with StageLink, and an
   * account has exactly one *default* portal configuration. Without an explicit
   * id, both products open the same portal — which would offer EnergyCurve
   * plans to StageLink's subscribers and replace the products StageLink's
   * plan-switch deep link depends on. Create ours with
   * `scripts/create-portal-config.mjs`.
   */
  portalConfigurationId: string | null
}

let cached: BillingConfig | null = null

/**
 * Returns the billing config, or null when Stripe isn't configured.
 *
 * Requires the secret key, the webhook signing secret, and at least one price
 * id — a deployment with a key but no prices can't sell anything, and failing
 * loudly here beats a checkout that 500s.
 */
export function getBillingConfig(): BillingConfig | null {
  if (cached) {
    return cached
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secretKey || !webhookSecret) {
    return null
  }

  const prices = priceIds()
  if (Object.keys(prices).length === 0) {
    return null
  }

  cached = {
    // No explicit apiVersion: the SDK's type only accepts the one version it
    // was built against (currently 2026-07-29.dahlia) and defaults to it, so
    // hardcoding the string only adds a value to update on every SDK bump.
    // The pin comes from the dependency range in package.json.
    stripe: new Stripe(secretKey),
    webhookSecret,
    prices,
    // Optional: a deployment without it still works, it just inherits the
    // account default. Kept optional rather than required so envs that don't
    // sell aren't forced to create a portal configuration.
    portalConfigurationId: process.env.STRIPE_PORTAL_CONFIGURATION_ID || null,
  }

  return cached
}

/** True when checkout can actually be offered. Safe to call anywhere server-side. */
export function isBillingConfigured(): boolean {
  return getBillingConfig() !== null
}

/** Resolves the price id for a plan + interval, or null if it isn't configured. */
export function priceIdFor(
  plan: Plan,
  interval: BillingInterval
): string | null {
  const config = getBillingConfig()
  if (!config) {
    return null
  }

  for (const [id, target] of Object.entries(config.prices)) {
    if (target.plan === plan && target.interval === interval) {
      return id
    }
  }

  return null
}

/** Test-only: clears the memoised client so env changes take effect. */
export function resetBillingConfigCache(): void {
  cached = null
}
