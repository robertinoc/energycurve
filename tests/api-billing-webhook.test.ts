import { beforeEach, describe, expect, it, vi } from "vitest"
import Stripe from "stripe"

import {
  createFakeSupabase,
  type FakeSupabase,
} from "./helpers/supabase-fake"

/**
 * The Stripe webhook is the only thing in the product that grants paid
 * entitlement, and until now it had no test.
 *
 * The signature check here is **real**: a genuine `Stripe` instance verifies a
 * header produced by `generateTestHeaderString`, so these tests exercise the
 * same code path production does. Mocking `constructEvent` would have tested
 * that the route calls a function, which is the part nobody doubts — the part
 * worth pinning is that a forged body is rejected.
 */

const WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests"
const stripe = new Stripe("sk_test_not_a_real_key")

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => fake,
}))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({ captureServerEvent: vi.fn() }))
vi.mock("@/services/purchase-email-service", () => ({
  sendPurchaseConfirmation: vi.fn(async () => undefined),
}))
vi.mock("@/services/payment-failed-email-service", () => ({
  sendPaymentFailedNotice: vi.fn(async () => undefined),
}))
vi.mock("@/lib/billing/config", () => ({
  getBillingConfig: () => ({
    stripe,
    webhookSecret: WEBHOOK_SECRET,
    prices: { pro_monthly: "price_pro_m" },
    portalConfigurationId: null,
  }),
}))

const { POST } = await import("@/app/api/billing/webhook/route")

function signedRequest(event: unknown, { secret = WEBHOOK_SECRET } = {}) {
  const payload = JSON.stringify(event)
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret })

  return new Request("https://energycurve.app/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    body: payload,
  })
}

function checkoutCompleted(id = "evt_checkout_1") {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        client_reference_id: "profile-buyer",
        customer: "cus_test_1",
        metadata: { profile_id: "profile-buyer" },
      },
    },
  }
}

beforeEach(() => {
  fake = createFakeSupabase({ billing_events: [], profiles: [{ id: "profile-buyer" }] })
})

describe("rejecting what it cannot trust", () => {
  it("refuses a request with no signature header", async () => {
    const response = await POST(
      new Request("https://energycurve.app/api/billing/webhook", {
        method: "POST",
        body: JSON.stringify(checkoutCompleted()),
      })
    )

    expect(response.status).toBe(400)
    expect(fake.log).toHaveLength(0)
  })

  it("refuses a body signed with the wrong secret", async () => {
    const response = await POST(
      signedRequest(checkoutCompleted(), { secret: "whsec_someone_elses_secret" })
    )

    expect(response.status).toBe(400)
    expect(fake.log).toHaveLength(0)
  })

  it("refuses a body that was altered after signing", async () => {
    // The exact attack the raw-body rule exists for: sign a cheap plan, then
    // swap the payload for an expensive one before it arrives.
    const honest = JSON.stringify(checkoutCompleted())
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: honest,
      secret: WEBHOOK_SECRET,
    })
    const tampered = honest.replace("profile-buyer", "profile-attacker")

    const response = await POST(
      new Request("https://energycurve.app/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": signature },
        body: tampered,
      })
    )

    expect(response.status).toBe(400)
    expect(fake.log).toHaveLength(0)
  })

  it("accepts a genuinely signed body, so the three refusals mean something", async () => {
    const response = await POST(signedRequest(checkoutCompleted()))

    expect(response.status).toBe(200)
  })
})

describe("staying idempotent under Stripe's retries", () => {
  it("claims the event once and reports the second delivery as a duplicate", async () => {
    const first = await POST(signedRequest(checkoutCompleted("evt_same")))
    const second = await POST(signedRequest(checkoutCompleted("evt_same")))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    await expect(second.json()).resolves.toMatchObject({ duplicate: true })

    // One row, not two: the primary key is the idempotency check.
    expect(fake.tables.billing_events).toHaveLength(1)
  })
})

describe("acknowledging what it does not handle", () => {
  it("answers 2xx for an event type it ignores, so Stripe stops retrying", async () => {
    const response = await POST(
      signedRequest({
        id: "evt_ignored",
        type: "customer.discount.created",
        data: { object: {} },
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      ignored: "customer.discount.created",
    })
    // Nothing was written for an event we do not act on.
    expect(fake.tables.billing_events).toHaveLength(0)
  })
})
