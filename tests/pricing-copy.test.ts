import { describe, expect, it } from "vitest"

import { getSiteCopy, supportedLocales } from "@/lib/content/site-copy"
import { buildPricingStructuredData } from "@/lib/seo"

const PRICES: Record<string, { monthly: RegExp; annual: RegExp | null }> = {
  free: { monthly: /0/, annual: null },
  pro: { monthly: /9[.,]99/, annual: /99/ },
  proPlus: { monthly: /19[.,]99/, annual: /199/ },
}

describe("pricing copy", () => {
  it.each(supportedLocales)("publishes the agreed price ladder (%s)", (locale) => {
    const { plans } = getSiteCopy(locale).pricing

    expect(plans.map((plan) => plan.id)).toEqual(["free", "pro", "proPlus"])

    for (const plan of plans) {
      const expected = PRICES[plan.id]
      expect(plan.price).toMatch(expected.monthly)

      if (expected.annual) {
        expect(plan.annual).not.toBeNull()
        expect(plan.annual as string).toMatch(expected.annual)
      } else {
        expect(plan.annual).toBeNull()
      }
    }
  })

  it.each(supportedLocales)(
    "only marks the free plan as buyable while billing is unbuilt (%s)",
    (locale) => {
      const { plans } = getSiteCopy(locale).pricing

      // Until Stripe ships, a paid card must not look purchasable.
      expect(plans.filter((plan) => plan.live).map((plan) => plan.id)).toEqual([
        "free",
      ])
      for (const plan of plans) {
        expect(plan.cta.trim()).not.toBe("")
        expect(plan.ctaHref.startsWith("/")).toBe(true)
      }
    }
  )

  // Roadmap-only capabilities, named precisely enough not to collide with the
  // import row (which legitimately mentions "audio files").
  const UNBUILT: Record<string, string[]> = {
    en: ["real audio analysis", "energy model v3", "gig mode"],
    es: ["análisis de audio real", "energy model v3", "gig mode"],
  }

  it.each(supportedLocales)(
    "never claims an unbuilt capability is included (%s)",
    (locale) => {
      const { rows } = getSiteCopy(locale).pricing

      // "yes" here would be a false promise on the page where people decide
      // to pay. Every one of these must read "soon" or "no".
      for (const needle of UNBUILT[locale]) {
        const row = rows.find((entry) =>
          entry.capability.toLowerCase().includes(needle)
        )
        expect(row, `expected a row mentioning "${needle}"`).toBeDefined()

        for (const cell of [row!.free, row!.pro, row!.proPlus]) {
          expect(cell.kind).not.toBe("yes")
        }
      }
    }
  )

  it.each(supportedLocales)("states who charges the card (%s)", (locale) => {
    expect(getSiteCopy(locale).pricing.billingBody).toContain("StageLink LLC")
  })
})

describe("pricing structured data", () => {
  it("exposes the price range as an AggregateOffer", () => {
    const graph = buildPricingStructuredData()["@graph"]
    const product = graph.find(
      (node) => (node as { "@type": string })["@type"] === "Product"
    ) as { offers: Record<string, unknown> }

    expect(product).toBeDefined()
    expect(product.offers).toMatchObject({
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "19.99",
      offerCount: 3,
    })
  })

  it("keeps paid tiers as PreOrder until checkout exists", () => {
    const graph = buildPricingStructuredData()["@graph"]
    const product = graph.find(
      (node) => (node as { "@type": string })["@type"] === "Product"
    ) as { offers: { offers: readonly { name: string; availability: string }[] } }

    const byName = Object.fromEntries(
      product.offers.offers.map((offer) => [offer.name, offer.availability])
    )

    expect(byName.Free).toBe("https://schema.org/InStock")
    expect(byName.PRO).toBe("https://schema.org/PreOrder")
    expect(byName["PRO+"]).toBe("https://schema.org/PreOrder")
  })

  it("includes a breadcrumb back to the landing page", () => {
    const graph = buildPricingStructuredData()["@graph"]
    const crumbs = graph.find(
      (node) => (node as { "@type": string })["@type"] === "BreadcrumbList"
    ) as { itemListElement: { position: number; item: string }[] }

    expect(crumbs.itemListElement.map((entry) => entry.position)).toEqual([1, 2])
    expect(crumbs.itemListElement[1].item).toContain("/pricing")
  })
})
