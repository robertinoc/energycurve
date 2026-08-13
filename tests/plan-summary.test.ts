import { describe, expect, it } from "vitest"

import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { supportedLocales } from "@/lib/content/site-copy"
import {
  canManageBilling,
  formatPlanDate,
  planNeedsAttention,
  planNotice,
  type BillingSnapshot,
  type PlanNoticeKind,
} from "@/lib/product/plan-summary"
import { PLANS } from "@/lib/product/plans"

const NOW = new Date("2026-08-13T20:00:00Z")
const NEXT_MONTH = new Date("2026-09-13T14:48:35Z")
const LAST_MONTH = new Date("2026-07-13T14:48:35Z")

function billing(overrides: Partial<BillingSnapshot> = {}): BillingSnapshot {
  return {
    plan: "free",
    status: null,
    currentPeriodEnd: null,
    cancelAt: null,
    stripeCustomerId: null,
    ...overrides,
  }
}

describe("planNotice", () => {
  it("invites rather than warns on the free plan", () => {
    const notice = planNotice(billing(), NOW)

    expect(notice.kind).toBe("free")
    expect(notice.actionable).toBe(false)
  })

  it("reports a healthy subscription with its renewal date", () => {
    const notice = planNotice(
      billing({ plan: "pro", status: "active", currentPeriodEnd: NEXT_MONTH }),
      NOW
    )

    expect(notice.kind).toBe("active")
    expect(notice.date).toEqual(NEXT_MONTH)
    expect(notice.actionable).toBe(false)
  })

  it("announces a scheduled cancellation without revoking anything", () => {
    // The real case: status stays active for the rest of the paid period.
    const notice = planNotice(
      billing({
        plan: "pro",
        status: "active",
        currentPeriodEnd: NEXT_MONTH,
        cancelAt: NEXT_MONTH,
      }),
      NOW
    )

    expect(notice.kind).toBe("ending")
    expect(notice.date).toEqual(NEXT_MONTH)
    expect(notice.entitledPlan).toBe("pro")
    // Nothing for them to do; they already did it.
    expect(notice.actionable).toBe(false)
  })

  it("does not promise access past a cancellation date that already passed", () => {
    // Means the subscription.deleted webhook never arrived. Claiming the plan is
    // still active would be the one lie that costs us trust.
    const notice = planNotice(
      billing({ plan: "pro", status: "active", cancelAt: LAST_MONTH }),
      NOW
    )

    expect(notice.kind).toBe("ended")
    expect(notice.actionable).toBe(true)
  })

  it("distinguishes a failed payment from being on the free plan", () => {
    const notice = planNotice(
      billing({ plan: "pro", status: "past_due", currentPeriodEnd: NEXT_MONTH }),
      NOW
    )

    expect(notice.kind).toBe("pastDue")
    expect(notice.actionable).toBe(true)
    // Entitlement is gone, but the purchased plan is still named so the message
    // can say *which* subscription needs fixing.
    expect(notice.plan).toBe("pro")
    expect(notice.entitledPlan).toBe("free")
  })

  it("keeps naming the plan after it ended, so we can offer it back", () => {
    const notice = planNotice(
      billing({ plan: "pro_plus", status: "canceled", cancelAt: LAST_MONTH }),
      NOW
    )

    expect(notice.kind).toBe("ended")
    expect(notice.plan).toBe("pro_plus")
    expect(notice.entitledPlan).toBe("free")
  })

  it("says nothing was charged when checkout was abandoned", () => {
    expect(planNotice(billing({ status: "incomplete" }), NOW).kind).toBe(
      "incomplete"
    )
    expect(
      planNotice(billing({ plan: "pro", status: "incomplete" }), NOW).kind
    ).toBe("incomplete")
  })

  it("fails towards not-entitled when a paid plan has no status", () => {
    // Shouldn't happen — the webhook writes both. Guessing "active" here would
    // hand out paid features on missing data.
    const notice = planNotice(billing({ plan: "pro", status: null }), NOW)

    expect(notice.kind).toBe("ended")
    expect(notice.entitledPlan).toBe("free")
  })

  it("treats a trial as a live subscription", () => {
    expect(
      planNotice(
        billing({ plan: "pro", status: "trialing", currentPeriodEnd: NEXT_MONTH }),
        NOW
      ).kind
    ).toBe("active")
  })
})

describe("planNeedsAttention", () => {
  it("raises a failed payment and a pending end, not a healthy plan", () => {
    const cases: [BillingSnapshot, boolean][] = [
      [billing(), false],
      [billing({ plan: "pro", status: "active" }), false],
      [billing({ plan: "pro", status: "active", cancelAt: NEXT_MONTH }), true],
      [billing({ plan: "pro", status: "past_due" }), true],
      [billing({ plan: "pro", status: "canceled" }), true],
      [billing({ status: "incomplete" }), true],
    ]

    for (const [snapshot, expected] of cases) {
      expect(planNeedsAttention(snapshot, NOW), JSON.stringify(snapshot)).toBe(
        expected
      )
    }
  })
})

describe("canManageBilling", () => {
  it("is false without a Stripe customer", () => {
    // The portal 404s without one, so the button must not render.
    expect(canManageBilling(billing())).toBe(false)
    expect(canManageBilling(billing({ stripeCustomerId: "cus_1" }))).toBe(true)
  })
})

describe("formatPlanDate", () => {
  it("reads as a date, not an ISO string", () => {
    expect(formatPlanDate(NEXT_MONTH, "en")).toBe("13 September 2026")
    expect(formatPlanDate(NEXT_MONTH, "es")).toBe("13 de septiembre de 2026")
  })
})

describe("copy coverage", () => {
  const KINDS: PlanNoticeKind[] = [
    "free",
    "active",
    "ending",
    "pastDue",
    "ended",
    "incomplete",
  ]

  it("has a title and body for every state, in every locale", () => {
    // A missing key renders `undefined` in the UI rather than throwing, so it
    // has to be asserted.
    for (const kind of KINDS) {
      for (const locale of supportedLocales) {
        expect(DASHBOARD_COPY.billing[kind].title[locale], `${kind}.title.${locale}`)
          .toBeTruthy()
        expect(DASHBOARD_COPY.billing[kind].body[locale], `${kind}.body.${locale}`)
          .toBeTruthy()
      }
    }
  })

  it("names every plan in every locale", () => {
    for (const plan of PLANS) {
      for (const locale of supportedLocales) {
        expect(DASHBOARD_COPY.billing.planName[plan][locale]).toBeTruthy()
      }
    }
  })

  it("interpolates the slots each state actually uses", () => {
    // A `{date}` left in a string the card renders without a date would ship the
    // literal braces to a paying customer.
    for (const locale of supportedLocales) {
      expect(DASHBOARD_COPY.billing.active.body[locale]).toContain("{date}")
      expect(DASHBOARD_COPY.billing.ending.title[locale]).toContain("{date}")
      expect(DASHBOARD_COPY.billing.ending.title[locale]).toContain("{plan}")

      // These render with no date available, so they must not ask for one.
      expect(DASHBOARD_COPY.billing.free.body[locale]).not.toContain("{date}")
      expect(DASHBOARD_COPY.billing.incomplete.body[locale]).not.toContain("{date}")
      expect(DASHBOARD_COPY.billing.ended.body[locale]).not.toContain("{date}")
    }
  })

  it("names StageLink LLC in the purchase confirmation", () => {
    // The moment the charge lands is when an unrecognised name becomes a
    // dispute. Same disclosure as the landing page, at the point of sale.
    for (const locale of supportedLocales) {
      expect(DASHBOARD_COPY.billing.checkoutSuccess.body[locale]).toContain(
        "StageLink LLC"
      )
    }
  })
})
