import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PlanCard } from "@/components/dashboard/plan-card"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { supportedLocales, type SiteLocale } from "@/lib/content/site-copy"
import type { BillingSnapshot } from "@/lib/product/plan-summary"

/**
 * H-25 (lote 22): an active plan with no renewal date on record rendered
 * «Se renueva el .» — the sentence with its date missing. It is what a
 * complimentary PRO+ account (`COMP_PRO_PLUS_EMAILS`) sees on Account and on
 * the dashboard, and any subscription whose period end never arrived from
 * Stripe would see it too.
 */

function render(billing: BillingSnapshot, locale: SiteLocale) {
  return renderToStaticMarkup(
    createElement(PlanCard, { billing, locale, billingConfigured: false })
  )
}

const ACTIVE = {
  plan: "pro_plus",
  status: "active",
  cancelAt: null,
  stripeCustomerId: null,
} as const

describe("an active plan with no renewal date", () => {
  for (const locale of supportedLocales) {
    it(`does not promise a renewal it cannot date (${locale})`, () => {
      const html = render({ ...ACTIVE, currentPeriodEnd: null }, locale)
      const dated = DASHBOARD_COPY.billing.active.body[locale].split("{date}")[0]

      expect(html).not.toContain(dated)
      expect(html).toContain(DASHBOARD_COPY.billing.activeNoDate.body[locale])
    })

    it(`still gives the date when there is one (${locale})`, () => {
      const html = render(
        { ...ACTIVE, currentPeriodEnd: new Date("2026-11-21T12:00:00Z") },
        locale
      )

      expect(html).toContain(DASHBOARD_COPY.billing.active.body[locale].split("{date}")[0])
      expect(html).not.toContain(DASHBOARD_COPY.billing.activeNoDate.body[locale])
    })
  }

  it("asks for no date in the sentence that has none", () => {
    for (const locale of supportedLocales) {
      expect(DASHBOARD_COPY.billing.activeNoDate.body[locale]).not.toContain("{date}")
    }
  })
})
