import { describe, expect, it } from "vitest"

import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"

/**
 * H-16 (lote 21): two texts sent people to a «Manage billing» button that is
 * labelled «Manage subscription» — at the moment somebody is trying to stop
 * paying. The texts now read the button's own label, and this fails the day
 * either side is renamed without the other.
 */

const button = DASHBOARD_COPY.billing.manage

describe("the texts that point at the subscription button name it as it is", () => {
  for (const locale of ["en", "es"] as const) {
    it(`deleting an account with a plan (${locale})`, () => {
      expect(DASHBOARD_COPY.account.deletePlanWarning[locale]).toContain(button[locale])
    })

    it(`the renewal that could not be stopped (${locale})`, () => {
      expect(DASHBOARD_COPY.account.deleteSubscriptionWarning[locale]).toContain(
        button[locale]
      )
    })
  }

  it("no text names a button that does not exist", () => {
    const all = JSON.stringify(DASHBOARD_COPY)
    expect(all).not.toContain("Manage billing")
    expect(all).not.toContain("Gestionar facturación")
  })
})
