import { describe, expect, it } from "vitest"

import {
  classifyPlanTransition,
  isReportableTransition,
} from "@/lib/analytics/billing-events"

describe("classifyPlanTransition", () => {
  it("calls the first paid plan a conversion", () => {
    expect(classifyPlanTransition("free", "pro", "active")).toBe(
      "subscription_started"
    )
    expect(classifyPlanTransition("free", "pro_plus", "active")).toBe(
      "subscription_started"
    )
  })

  it("distinguishes moving up the ladder from moving down", () => {
    expect(classifyPlanTransition("pro", "pro_plus", "active")).toBe(
      "plan_upgraded"
    )
    expect(classifyPlanTransition("pro_plus", "pro", "active")).toBe(
      "plan_downgraded"
    )
  })

  it("treats a lapsed subscription as ended even while the plan still says PRO", () => {
    // The failure this exists for. A failed payment leaves `plan` untouched and
    // flips only the status; reading the plan alone would file it as "unchanged"
    // and the churn would never appear in any dashboard.
    for (const status of ["past_due", "canceled", "incomplete", null] as const) {
      expect(
        classifyPlanTransition("pro", "pro", status),
        String(status)
      ).toBe("subscription_ended")
    }
  })

  it("counts a drop to free as ended, not as a downgrade", () => {
    expect(classifyPlanTransition("pro_plus", "free", "active")).toBe(
      "subscription_ended"
    )
  })

  it("never reports churn for someone who never paid", () => {
    // A free user whose status goes nowhere must not surface as a cancellation:
    // that would inflate churn with people who never converted.
    expect(classifyPlanTransition("free", "free", null)).toBe("plan_unchanged")
    expect(classifyPlanTransition("free", "free", "canceled")).toBe(
      "plan_unchanged"
    )
  })

  it("treats a trial as paying", () => {
    expect(classifyPlanTransition("free", "pro", "trialing")).toBe(
      "subscription_started"
    )
  })

  it("says nothing changed on a renewal", () => {
    expect(classifyPlanTransition("pro", "pro", "active")).toBe(
      "plan_unchanged"
    )
  })
})

describe("isReportableTransition", () => {
  it("drops the renewal noise and keeps the four that mean something", () => {
    // Stripe fires customer.subscription.updated for card replacements, metadata
    // edits and period rollovers. Sending those would bury the real events.
    expect(isReportableTransition("plan_unchanged")).toBe(false)

    for (const transition of [
      "subscription_started",
      "plan_upgraded",
      "plan_downgraded",
      "subscription_ended",
    ] as const) {
      expect(isReportableTransition(transition), transition).toBe(true)
    }
  })
})
