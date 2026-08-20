import { describe, expect, it } from "vitest"

import { buildPaymentFailedEmail } from "@/lib/email/payment-failed"

const build = (over: Partial<Parameters<typeof buildPaymentFailedEmail>[0]> = {}) =>
  buildPaymentFailedEmail({
    plan: "pro",
    appUrl: "https://energycurve.app",
    retriesExhausted: false,
    ...over,
  })

describe("buildPaymentFailedEmail", () => {
  it("tells a customer mid-retry that nothing has changed yet", () => {
    // The only question the reader has. Getting it wrong in this direction
    // announces a loss that hasn't happened.
    const email = build()!

    expect(email.text).toMatch(/keeps working while we retry/i)
    expect(email.text).not.toMatch(/is off for now/i)
  })

  it("tells a customer the plan is off once the retries ran out", () => {
    // And wrong in the other direction promises access that's already gone.
    const email = build({ retriesExhausted: true })!

    expect(email.text).toMatch(/is off for now/i)
    expect(email.text).not.toMatch(/keeps working while we retry/i)
  })

  it("names the plan in the subject so it isn't mistaken for spam", () => {
    expect(build({ plan: "pro_plus" })!.subject).toContain("PRO+")
    expect(build({ plan: "pro" })!.subject).toContain("PRO")
  })

  it("warns about the statement name", () => {
    // A recipient meeting "StageLink LLC" for the first time on a statement is
    // how a declined card becomes a chargeback.
    expect(build()!.text).toContain("StageLink LLC")
  })

  it("links straight to the card update, not to the dashboard", () => {
    // A hop through the dashboard is a hop where people give up.
    expect(build()!.html).toContain("https://energycurve.app/dashboard?billing=update")
  })

  it("says nothing accusatory", () => {
    // A failed payment is almost never the customer's mistake, and copy that
    // reads like an accusation gets resented or ignored.
    const text = build()!.text.toLowerCase()

    for (const word of ["failed to", "you must", "immediately", "urgent"]) {
      expect(text).not.toContain(word)
    }
  })

  it("offers a way out for someone who meant to cancel", () => {
    expect(build()!.text).toMatch(/meant to cancel/i)
  })

  it("writes Spanish for a Spanish reader", () => {
    const email = build({ locale: "es" })!

    expect(email.subject).toMatch(/no se pudo procesar/i)
    expect(email.text).toMatch(/tu banco rechazó/i)
  })

  it("returns null for the free plan instead of throwing", () => {
    // The caller is a webhook branch: a plan that shouldn't produce an email is a
    // reason to send nothing, not a reason to 500 and have Stripe retry forever.
    expect(build({ plan: "free" })).toBeNull()
  })
})
