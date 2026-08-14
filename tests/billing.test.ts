import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  cancelAtOf,
  canceledSubscription,
  cancellationFeedbackOf,
  customerIdOf,
  isHandledEvent,
  mapStripeStatus,
  periodEndOf,
  priceIdsOf,
  resolveSubscription,
} from "@/lib/billing/subscription-state"
import {
  effectivePlan,
  limitsFor,
  PLAN_LIMITS,
  PLAN_PRICING,
  PLANS,
  planAtLeast,
  withinLimit,
  type Plan,
} from "@/lib/product/plans"

const PRICES = {
  price_pro_m: { plan: "pro" as Plan },
  price_pro_y: { plan: "pro" as Plan },
  price_plus_m: { plan: "pro_plus" as Plan },
}

describe("plan ladder", () => {
  it("publishes the agreed prices", () => {
    // Settled decision (AGENTS.md); the public matrix in site-copy renders the
    // same numbers, so a change here without one there is a bug.
    expect(PLAN_PRICING.free).toEqual({ monthly: 0, yearly: 0 })
    expect(PLAN_PRICING.pro).toEqual({ monthly: 9.99, yearly: 99 })
    expect(PLAN_PRICING.pro_plus).toEqual({ monthly: 19.99, yearly: 199 })
  })

  it("orders tiers so planAtLeast works", () => {
    expect(PLANS).toEqual(["free", "pro", "pro_plus"])
    expect(planAtLeast("pro_plus", "pro")).toBe(true)
    expect(planAtLeast("pro", "pro")).toBe(true)
    expect(planAtLeast("free", "pro")).toBe(false)
  })

  it("never gates native export", () => {
    // Export stays free on every tier, permanently — paywalling it breaks the
    // product loop. If a limit named after export appears here, that's the bug.
    for (const plan of PLANS) {
      const keys = Object.keys(PLAN_LIMITS[plan])
      expect(keys.some((key) => /export/i.test(key))).toBe(false)
    }
  })

  it("loosens every quota as the tier rises", () => {
    // Applied fixes deliberately absent: uncapped on every tier, because
    // applying one is local and instant with no server boundary to meter.
    const quotas = [
      "activePlaylists",
      "aiOrderingsPerMonth",
      "customTaxonomies",
    ] as const

    for (const quota of quotas) {
      const free = PLAN_LIMITS.free[quota]
      const pro = PLAN_LIMITS.pro[quota]
      const plus = PLAN_LIMITS.pro_plus[quota]

      // null = unlimited, so it's the ceiling.
      const rank = (value: number | null) => (value === null ? Infinity : value)
      expect(rank(pro)).toBeGreaterThanOrEqual(rank(free))
      expect(rank(plus)).toBeGreaterThanOrEqual(rank(pro))
    }
  })

  it("treats null as unlimited", () => {
    expect(withinLimit(0, 3)).toBe(true)
    expect(withinLimit(2, 3)).toBe(true)
    expect(withinLimit(3, 3)).toBe(false)
    expect(withinLimit(9_999, null)).toBe(true)
  })
})

describe("entitlement", () => {
  it("grants paid limits while active or trialing", () => {
    expect(effectivePlan("pro", "active")).toBe("pro")
    expect(effectivePlan("pro", "trialing")).toBe("pro")
    expect(effectivePlan("pro_plus", "active")).toBe("pro_plus")
  })

  it("falls back to free limits when a subscription lapses", () => {
    // The purchased plan is kept on the profile so the UI can explain the
    // lapse; entitlement is what drops.
    for (const status of ["past_due", "canceled", "incomplete"] as const) {
      expect(effectivePlan("pro_plus", status)).toBe("free")
      expect(limitsFor("pro_plus", status)).toEqual(PLAN_LIMITS.free)
    }
  })

  it("does not grant anything on a missing status", () => {
    expect(effectivePlan("pro", null)).toBe("free")
  })

  it("leaves free users on free regardless of status", () => {
    expect(effectivePlan("free", "active")).toBe("free")
  })
})

describe("Stripe status mapping", () => {
  it("maps the statuses Stripe actually sends", () => {
    expect(mapStripeStatus("active")).toBe("active")
    expect(mapStripeStatus("trialing")).toBe("trialing")
    expect(mapStripeStatus("past_due")).toBe("past_due")
    expect(mapStripeStatus("canceled")).toBe("canceled")
    expect(mapStripeStatus("incomplete")).toBe("incomplete")
  })

  it("folds unpaid into past_due and paused into canceled", () => {
    // unpaid still means "don't revoke yet"; paused means no access.
    expect(mapStripeStatus("unpaid")).toBe("past_due")
    expect(mapStripeStatus("paused")).toBe("canceled")
    expect(mapStripeStatus("incomplete_expired")).toBe("canceled")
  })

  it("denies access on an unrecognised status", () => {
    // Fail closed: a value we don't understand must not unlock a paid tier.
    expect(mapStripeStatus("something_new")).toBe("incomplete")
    expect(effectivePlan("pro", mapStripeStatus("something_new"))).toBe("free")
  })
})

describe("resolveSubscription", () => {
  it("resolves a configured price to its plan", () => {
    const result = resolveSubscription(
      {
        id: "sub_1",
        status: "active",
        priceIds: ["price_pro_m"],
        currentPeriodEnd: 1_800_000_000,
      },
      PRICES
    )

    expect(result.plan).toBe("pro")
    expect(result.status).toBe("active")
    expect(result.stripeSubscriptionId).toBe("sub_1")
    expect(result.currentPeriodEnd?.getTime()).toBe(1_800_000_000 * 1000)
  })

  it("picks the highest plan when a mid-cycle change shows both prices", () => {
    const result = resolveSubscription(
      { status: "active", priceIds: ["price_pro_m", "price_plus_m"] },
      PRICES
    )

    // The customer is paying for the upgrade — grant it.
    expect(result.plan).toBe("pro_plus")
  })

  it("refuses to guess on an unrecognised price", () => {
    // Happens when a price id is removed from the env. Granting the top tier
    // would be worse than granting nothing.
    const result = resolveSubscription(
      { status: "active", priceIds: ["price_deleted"] },
      PRICES
    )

    expect(result.plan).toBe("free")
    expect(result.status).toBe("incomplete")
    expect(effectivePlan(result.plan, result.status)).toBe("free")
  })

  it("handles a subscription with no items at all", () => {
    const result = resolveSubscription({ status: "active", priceIds: [] }, PRICES)

    expect(result.plan).toBe("free")
    expect(result.status).toBe("incomplete")
  })

  it("leaves the period end null when Stripe omits it", () => {
    for (const value of [null, undefined, 0]) {
      const result = resolveSubscription(
        { status: "active", priceIds: ["price_pro_m"], currentPeriodEnd: value },
        PRICES
      )
      expect(result.currentPeriodEnd).toBeNull()
    }
  })

  it("keeps the purchased plan on cancellation", () => {
    const result = canceledSubscription("pro_plus")

    expect(result.plan).toBe("pro_plus")
    expect(result.status).toBe("canceled")
    expect(result.stripeSubscriptionId).toBeNull()
    // …but entitlement is gone.
    expect(effectivePlan(result.plan, result.status)).toBe("free")
  })
})

describe("handled webhook events", () => {
  it("acts on checkout completion and the subscription lifecycle", () => {
    expect(isHandledEvent("checkout.session.completed")).toBe(true)
    expect(isHandledEvent("customer.subscription.created")).toBe(true)
    expect(isHandledEvent("customer.subscription.updated")).toBe(true)
    expect(isHandledEvent("customer.subscription.deleted")).toBe(true)
  })

  it("ignores the rest", () => {
    // Ignored events still get a 2xx in the route; Stripe retries non-2xx.
    expect(isHandledEvent("invoice.created")).toBe(false)
    expect(isHandledEvent("payment_intent.succeeded")).toBe(false)
  })
})

describe("reading Stripe payload shapes", () => {
  it("collects price ids from subscription items", () => {
    expect(
      priceIdsOf({
        items: { data: [{ price: { id: "price_a" } }, { price: { id: "price_b" } }] },
      })
    ).toEqual(["price_a", "price_b"])
  })

  it("survives missing or malformed items", () => {
    expect(priceIdsOf({})).toEqual([])
    expect(priceIdsOf({ items: { data: [] } })).toEqual([])
    expect(priceIdsOf({ items: { data: [{ price: null }, { price: { id: "" } }] } })).toEqual([])
  })

  it("reads the period end from items, taking the furthest", () => {
    // Stripe moved current_period_end onto items; a staggered multi-item
    // subscription should report the last date the customer has paid through.
    expect(
      periodEndOf({
        items: {
          data: [
            { current_period_end: 1_700_000_000 },
            { current_period_end: 1_800_000_000 },
          ],
        },
      })
    ).toBe(1_800_000_000)
  })

  it("falls back to the legacy top-level period end", () => {
    // Older API versions put it here — both shapes have to work.
    expect(periodEndOf({ current_period_end: 1_650_000_000 })).toBe(1_650_000_000)
    expect(
      periodEndOf({ items: { data: [{ current_period_end: null }] }, current_period_end: 42 })
    ).toBe(42)
  })

  it("returns null when no period end is present", () => {
    expect(periodEndOf({})).toBeNull()
    expect(periodEndOf({ current_period_end: 0 })).toBeNull()
  })

  it("normalises a customer field that may be an id or an expanded object", () => {
    expect(customerIdOf("cus_123")).toBe("cus_123")
    expect(customerIdOf({ id: "cus_456" })).toBe("cus_456")
    expect(customerIdOf(null)).toBeNull()
    expect(customerIdOf(undefined)).toBeNull()
    expect(customerIdOf("")).toBeNull()
    expect(customerIdOf({})).toBeNull()
    expect(customerIdOf({ id: 7 })).toBeNull()
  })
})

describe("portal configuration is pinned", () => {
  // This Stripe account is shared with StageLink, and an account has exactly
  // one *default* Customer Portal configuration. If the portal route stops
  // passing `configuration`, EnergyCurve silently inherits StageLink's portal:
  // subscribers would be offered the wrong products, and StageLink's
  // plan-switch deep link breaks in the other direction. Nothing fails loudly
  // when that happens, which is why it's asserted here rather than left to
  // review.
  const routeSource = readFileSync(
    join(process.cwd(), "app/api/billing/portal/route.ts"),
    "utf8"
  )

  it("passes an explicit configuration to billingPortal.sessions.create", () => {
    expect(routeSource).toContain("portalConfigurationId")
    expect(routeSource).toMatch(/configuration:\s*config\.portalConfigurationId/)
  })

  it("reads the id from the environment rather than hardcoding it", () => {
    // Test and live mode need different ids, so a literal bpc_… in the source
    // would be wrong in one of them.
    const configSource = readFileSync(
      join(process.cwd(), "lib/billing/config.ts"),
      "utf8"
    )
    expect(configSource).toContain("STRIPE_PORTAL_CONFIGURATION_ID")
    expect(routeSource).not.toMatch(/bpc_[A-Za-z0-9]/)
  })
})

describe("scheduled cancellation", () => {
  // Fixture taken from a real cancellation through the portal on 2026-08-13,
  // API version 2026-07-29.dahlia. Note what Stripe actually sent: `cancel_at`
  // is set and `cancel_at_period_end` is **false**. Code that reads the boolean
  // sees nothing and concludes the customer never cancelled.
  const CANCEL_AT = Math.floor(Date.UTC(2026, 8, 13, 14, 48, 35) / 1000)

  const realSubscription = {
    items: { data: [{ price: { id: "price_pro_m" }, current_period_end: CANCEL_AT }] },
    cancel_at: CANCEL_AT,
    cancel_at_period_end: false,
    cancellation_details: { feedback: "too_complex" },
  }

  it("reads cancel_at even though cancel_at_period_end is false", () => {
    expect(cancelAtOf(realSubscription)).toBe(CANCEL_AT)
  })

  it("still honours the legacy boolean for older API versions", () => {
    // There it means "at the end of the current period", so the effective date
    // is that period's end.
    expect(
      cancelAtOf({
        items: { data: [{ current_period_end: CANCEL_AT }] },
        cancel_at_period_end: true,
      })
    ).toBe(CANCEL_AT)
  })

  it("reports no cancellation when neither field says so", () => {
    expect(cancelAtOf({ items: { data: [{ current_period_end: CANCEL_AT }] } })).toBeNull()
    expect(cancelAtOf({ cancel_at: 0, cancel_at_period_end: false })).toBeNull()
  })

  it("extracts the reason the customer picked", () => {
    expect(cancellationFeedbackOf(realSubscription)).toBe("too_complex")
    expect(cancellationFeedbackOf({})).toBeNull()
    expect(cancellationFeedbackOf({ cancellation_details: { feedback: "" } })).toBeNull()
    expect(cancellationFeedbackOf({ cancellation_details: null })).toBeNull()
  })

  it("keeps the subscription entitled until the date arrives", () => {
    // The whole point: status stays active for the rest of the paid period, so
    // access must not be revoked — only announced.
    const resolved = resolveSubscription(
      {
        id: "sub_1",
        status: "active",
        priceIds: ["price_pro_m"],
        currentPeriodEnd: CANCEL_AT,
        cancelAt: cancelAtOf(realSubscription),
        cancellationFeedback: cancellationFeedbackOf(realSubscription),
      },
      PRICES
    )

    expect(resolved.plan).toBe("pro")
    expect(resolved.status).toBe("active")
    expect(resolved.cancelAt?.toISOString()).toBe("2026-09-13T14:48:35.000Z")
    expect(resolved.cancellationFeedback).toBe("too_complex")
  })

  it("clears the pending date once the subscription actually ends", () => {
    // Otherwise the UI renders "ends on <date in the past>" forever.
    const ended = canceledSubscription("pro", "too_complex")

    expect(ended.status).toBe("canceled")
    expect(ended.plan).toBe("pro")
    expect(ended.cancelAt).toBeNull()
    // The reason outlives the subscription — it's the only churn signal we get.
    expect(ended.cancellationFeedback).toBe("too_complex")
  })

  it("resolves to no pending cancellation when Stripe reports none", () => {
    const resolved = resolveSubscription(
      { id: "sub_1", status: "active", priceIds: ["price_pro_m"], currentPeriodEnd: CANCEL_AT },
      PRICES
    )

    // A customer who clicks "don't cancel" must stop looking like one who did.
    expect(resolved.cancelAt).toBeNull()
    expect(resolved.cancellationFeedback).toBeNull()
  })
})
