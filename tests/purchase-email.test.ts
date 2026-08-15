import { describe, expect, it } from "vitest"

import { buildPurchaseEmail } from "@/lib/email/purchase-confirmation"

const build = (plan: "pro" | "pro_plus", isUpgrade = false) =>
  buildPurchaseEmail({
    plan,
    appUrl: "https://energycurve.app",
    isUpgrade,
  })!

describe("buildPurchaseEmail", () => {
  it("warns that the charge reads StageLink LLC", () => {
    // The sentence this email exists for. A recipient meeting that name for the
    // first time on their statement files a chargeback, which costs the fee, the
    // dispute and the customer.
    for (const plan of ["pro", "pro_plus"] as const) {
      const email = build(plan)

      expect(email.text, plan).toContain("STAGELINK LLC")
      expect(email.html, plan).toContain("STAGELINK LLC")
    }
  })

  it("names the plan in the subject", () => {
    expect(build("pro").subject).toContain("PRO")
    expect(build("pro_plus").subject).toContain("PRO+")
  })

  it("distinguishes a first purchase from an upgrade", () => {
    // "Welcome to PRO+" to someone who was already paying for PRO reads as if we
    // don't know who they are.
    expect(build("pro_plus", false).subject).toContain("Welcome")
    expect(build("pro_plus", true).subject).not.toContain("Welcome")
  })

  it("lists what the money actually bought, by name", () => {
    // A plan is an abstraction; the features are the purchase. Somebody who
    // pays and can't find what changed cancels in week two.
    const email = build("pro")

    expect(email.text).toContain("BPM")
    expect(email.text).toContain("set sheet")
    expect(email.text).toContain("01:00 to 03:00")
  })

  it("gives PRO+ its own headline before the shared list", () => {
    const proPlus = build("pro_plus").text

    expect(proPlus).toContain("Unlimited AI ordering")
    // and still tells them about everything PRO includes
    expect(proPlus).toContain("set sheet")
  })

  it("says how to cancel", () => {
    // Making it easy to leave is what makes it safe to join, and hiding it only
    // turns cancellations into disputes.
    expect(build("pro").text.toLowerCase()).toContain("cancel")
  })

  it("links into the app with an absolute URL", () => {
    expect(build("pro").html).toContain("https://energycurve.app/dashboard")
  })

  it("sends nothing for the free plan instead of throwing", () => {
    // The caller is a webhook branch: a plan that shouldn't produce an email is
    // a reason to send nothing, not to 500 and have Stripe retry forever.
    expect(
      buildPurchaseEmail({
        plan: "free",
        appUrl: "https://energycurve.app",
        isUpgrade: false,
      })
    ).toBeNull()
  })

  it("never renders an empty or undefined body", () => {
    for (const plan of ["pro", "pro_plus"] as const) {
      const email = build(plan)

      expect(email.text, plan).not.toContain("undefined")
      expect(email.html, plan).not.toContain("undefined")
      expect(email.text.length, plan).toBeGreaterThan(200)
    }
  })
})
