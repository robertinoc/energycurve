import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Checkout and the customer portal. Both are session-gated and both answer 503
 * rather than crashing when billing is unconfigured, which is what lets a
 * deployment without Stripe keys run the rest of the product.
 *
 * The property worth pinning hardest: **the client never names a price.** It
 * sends a plan and an interval; the route resolves the Stripe price id from the
 * server's own environment. A route that accepted a price id would let anyone
 * check out at any price in the account — including StageLink's, since the
 * Stripe account is shared.
 */

let billingConfigured = true
let sessionUser: { id: string; email: string } | null = null

// Typed with their parameter so `mock.calls[0][0]` is the payload we sent to
// Stripe rather than an empty tuple — the assertions below read it.
const createSession = vi.fn<(params: unknown) => Promise<{ id: string; url: string }>>(
  async () => ({ id: "cs_1", url: "https://checkout.stripe.test/1" })
)
const createPortalSession = vi.fn<(params: unknown) => Promise<{ url: string }>>(
  async () => ({ url: "https://portal.stripe.test/1" })
)

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: sessionUser }),
}))
const PRICES: Record<string, string> = {
  "pro:monthly": "price_pro_m",
  "pro:yearly": "price_pro_y",
  "pro_plus:monthly": "price_plus_m",
  "pro_plus:yearly": "price_plus_y",
}

vi.mock("@/lib/billing/config", () => ({
  // The real resolver, reduced to its contract: plan + interval in, price id
  // out. Nothing the client sends reaches it.
  priceIdFor: (plan: string, interval: string) => PRICES[`${plan}:${interval}`] ?? null,
  isBillingConfigured: () => billingConfigured,
  getBillingConfig: () =>
    billingConfigured
      ? {
          stripe: {
            checkout: { sessions: { create: createSession } },
            billingPortal: { sessions: { create: createPortalSession } },
          },
          webhookSecret: "whsec_x",
          prices: {
            pro_monthly: "price_pro_m",
            pro_yearly: "price_pro_y",
            pro_plus_monthly: "price_plus_m",
            pro_plus_yearly: "price_plus_y",
          },
          portalConfigurationId: "bpc_1",
        }
      : null,
}))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "profile-1", email: "dj@example.com" }),
}))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => ({
    plan: "pro",
    status: "active",
    stripeCustomerId: "cus_1",
  }),
  attachStripeCustomer: vi.fn(async () => undefined),
}))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({ captureServerEvent: vi.fn() }))

const checkout = await import("@/app/api/billing/checkout/route")
const portal = await import("@/app/api/billing/portal/route")

function post(route: { POST: (r: Request) => Promise<Response> }, body: unknown) {
  return route.POST(
    new Request("https://energycurve.app/api/billing/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  billingConfigured = true
  // A distinct id per test keeps the module-level rate-limit buckets, which
  // have no reset, from leaking between them.
  sessionUser = { id: `user-${Math.random().toString(36).slice(2)}`, email: "dj@example.com" }
})

describe("when billing is not configured", () => {
  it("checkout answers 503 instead of throwing", async () => {
    billingConfigured = false

    expect((await post(checkout, { plan: "pro", interval: "monthly" })).status).toBe(503)
  })

  it("the portal answers 503 too", async () => {
    billingConfigured = false

    expect((await post(portal, {})).status).toBe(503)
  })

  it("neither reaches Stripe", async () => {
    billingConfigured = false

    await post(checkout, { plan: "pro", interval: "monthly" })
    await post(portal, {})

    expect(createSession).not.toHaveBeenCalled()
    expect(createPortalSession).not.toHaveBeenCalled()
  })
})

describe("the session gate", () => {
  it("checkout answers 401 with no session", async () => {
    sessionUser = null

    expect((await post(checkout, { plan: "pro", interval: "monthly" })).status).toBe(401)
    expect(createSession).not.toHaveBeenCalled()
  })

  it("the portal answers 401 with no session", async () => {
    sessionUser = null

    expect((await post(portal, {})).status).toBe(401)
    expect(createPortalSession).not.toHaveBeenCalled()
  })
})

describe("what checkout will and will not sell", () => {
  it("refuses the free plan", async () => {
    const response = await post(checkout, { plan: "free", interval: "monthly" })

    expect(response.status).toBe(400)
    expect(createSession).not.toHaveBeenCalled()
  })

  it("refuses a plan name it does not know", async () => {
    const response = await post(checkout, { plan: "enterprise", interval: "monthly" })

    expect(response.status).toBe(400)
    expect(createSession).not.toHaveBeenCalled()
  })

  it("refuses a body that is not JSON", async () => {
    const response = await checkout.POST(
      new Request("https://energycurve.app/api/billing/checkout", {
        method: "POST",
        body: "{",
      })
    )

    expect(response.status).toBe(400)
    expect(createSession).not.toHaveBeenCalled()
  })

  it("resolves the price id server-side and ignores one sent by the client", async () => {
    // The attack this forecloses: the Stripe account is shared with StageLink,
    // so a route that trusted a client-supplied price could be pointed at any
    // price in either product — including a $0 one.
    await post(checkout, {
      plan: "pro",
      interval: "monthly",
      price: "price_attacker_chosen",
      priceId: "price_attacker_chosen",
      amount: 0,
    })

    expect(createSession).toHaveBeenCalledOnce()

    const sent = JSON.stringify(createSession.mock.calls[0]?.[0] ?? {})
    expect(sent).toContain("price_pro_m")
    expect(sent).not.toContain("price_attacker_chosen")
  })

  it("stamps the profile id so the webhook can attribute the payment", async () => {
    await post(checkout, { plan: "pro_plus", interval: "yearly" })

    const sent = JSON.stringify(createSession.mock.calls[0]?.[0] ?? {})
    expect(sent).toContain("profile-1")
    expect(sent).toContain("price_plus_y")
  })
})
