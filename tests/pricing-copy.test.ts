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
    "marks every plan buyable now that checkout ships (%s)",
    (locale) => {
      const { plans } = getSiteCopy(locale).pricing

      // This assertion used to be the opposite: only `free` could be live,
      // because a paid card that looked purchasable when nothing could take money
      // was the failure to guard against. Checkout now exists for both paid
      // tiers, so the guard flips — and the availability test below keeps the
      // schema.org offers honest about it either way.
      expect(plans.filter((plan) => plan.live).map((plan) => plan.id)).toEqual([
        "free",
        "pro",
        "proPlus",
      ])
      for (const plan of plans) {
        expect(plan.cta.trim()).not.toBe("")
        // Still required even for the paid plans: the checkout button replaces the
        // link, but a visitor without JS has to land somewhere sensible.
        expect(plan.ctaHref.startsWith("/")).toBe(true)
      }
    }
  )

  it.each(supportedLocales)("recommends exactly PRO (%s)", (locale) => {
    const { plans } = getSiteCopy(locale).pricing

    expect(plans.filter((plan) => plan.recommended).map((plan) => plan.id)).toEqual(
      ["pro"]
    )
  })

  it.each(supportedLocales)(
    "keeps native export on the free tier (%s)",
    (locale) => {
      const { plans, rows } = getSiteCopy(locale).pricing

      // Exporting back to the booth is what makes the tool usable at all, so
      // it ships free forever — it must never become a paid upgrade, and it
      // must not be sold as a PRO differentiator.
      const exportRow = rows.find((row) =>
        row.capability.toLowerCase().includes("nativ")
      )
      expect(exportRow, "expected a native-export row").toBeDefined()
      expect(exportRow!.free.kind).toBe("yes")
      expect(exportRow!.pro.kind).toBe("yes")
      expect(exportRow!.proPlus.kind).toBe("yes")

      const free = plans.find((plan) => plan.id === "free")!
      const pro = plans.find((plan) => plan.id === "pro")!
      const mentionsExport = (plan: typeof free) =>
        plan.highlights.some((highlight) =>
          /rekordbox|traktor|m3u8/i.test(highlight.text)
        )

      expect(mentionsExport(free)).toBe(true)
      expect(mentionsExport(pro)).toBe(false)
    }
  )

  it.each(supportedLocales)(
    "flags roadmap highlights instead of implying they ship today (%s)",
    (locale) => {
      const { plans } = getSiteCopy(locale).pricing
      const pro = plans.find((plan) => plan.id === "pro")!

      const audio = pro.highlights.find((highlight) =>
        /audio/i.test(highlight.text)
      )
      expect(audio, "expected an audio-analysis highlight on PRO").toBeDefined()
      expect(audio!.soon).toBe(true)

      // The free plan promises nothing that isn't already shipped.
      const free = plans.find((plan) => plan.id === "free")!
      expect(free.highlights.every((highlight) => !highlight.soon)).toBe(true)
    }
  )

  // Roadmap-only capabilities, named precisely enough not to collide with the
  // import row (which legitimately mentions "audio files").
  const UNBUILT: Record<string, string[]> = {
    // "real audio analysis" used to sit here and no longer does: tempo detection
    // ships. Key detection took its place rather than the row simply leaving,
    // because that is the half still unbuilt (21% against tagged files) and it
    // is the half a DJ assumes when they read "audio analysis".
    en: ["musical key read", "energy model v3", "gig mode"],
    es: ["tonalidad leída", "energy model v3", "gig mode"],
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

  it("advertises availability that matches what the page can actually sell", () => {
    // These two moved together when checkout shipped, and they have to keep
    // moving together: InStock on a plan whose button can't take money is a lie
    // to search engines, and PreOrder on one that can undersells it. Derived from
    // the copy's `live` flag rather than hardcoded, so flipping a plan back
    // without updating the offer fails here.
    const graph = buildPricingStructuredData()["@graph"]
    const product = graph.find(
      (node) => (node as { "@type": string })["@type"] === "Product"
    ) as { offers: { offers: readonly { name: string; availability: string }[] } }

    const byName = Object.fromEntries(
      product.offers.offers.map((offer) => [offer.name, offer.availability])
    )
    const plans = getSiteCopy("en").pricing.plans

    for (const plan of plans) {
      const expected = plan.live
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder"

      expect(
        byName[plan.name],
        `${plan.name}: live=${plan.live} on /pricing, availability says ` +
          `${byName[plan.name]}`
      ).toBe(expected)
    }
  })

  it("has all three plans live, with a buyable CTA on the paid ones", () => {
    const plans = getSiteCopy("en").pricing.plans

    expect(plans).toHaveLength(3)
    for (const plan of plans) {
      expect(plan.live, `${plan.name} should be live`).toBe(true)
    }

    // A paid plan still saying "tell me when it's ready" while its button opens
    // Stripe would be the worst of both readings.
    for (const locale of supportedLocales) {
      for (const plan of getSiteCopy(locale).pricing.plans) {
        expect(plan.cta.toLowerCase()).not.toContain("tell me when")
        expect(plan.cta.toLowerCase()).not.toContain("avisame cuando")
      }
    }
  })

  it("gives the interval switch copy in both locales", () => {
    // The switch decides which price is charged, so a missing label would ship a
    // control with no name on the page where money is taken.
    for (const locale of supportedLocales) {
      const copy = getSiteCopy(locale).pricing
      for (const key of [
        "intervalMonthly",
        "intervalYearly",
        "intervalYearlyNote",
        "checkoutStarting",
        "checkoutError",
        "perYear",
      ] as const) {
        expect(copy[key], `${key}.${locale}`).toBeTruthy()
      }
    }
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
