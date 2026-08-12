import { describe, expect, it } from "vitest"

import { getSiteCopy, supportedLocales } from "@/lib/content/site-copy"
import { getLegalCopy } from "@/lib/content/legal-copy"
import { buildBrandedEmail } from "@/lib/email/build-email-html"
import {
  buildLandingStructuredData,
  OPERATING_COMPANY,
  SEO_KEYWORDS,
  SITE_URL,
} from "@/lib/seo"

type Graph = ReturnType<typeof buildLandingStructuredData>["@graph"]

function nodeOfType(graph: Graph, type: string) {
  const node = graph.find(
    (entry) => (entry as { "@type": string })["@type"] === type
  )
  expect(node, `expected a ${type} node in the structured data`).toBeDefined()
  return node as Record<string, unknown>
}

describe("landing structured data", () => {
  it("publishes Organization, SoftwareApplication, and FAQPage", () => {
    const graph = buildLandingStructuredData()["@graph"]

    expect(nodeOfType(graph, "Organization").name).toBe("EnergyCurve")
    expect(nodeOfType(graph, "SoftwareApplication").url).toBe(SITE_URL)
    expect(nodeOfType(graph, "FAQPage")).toBeDefined()
  })

  it("names StageLink LLC as the parent organization", () => {
    const organization = nodeOfType(
      buildLandingStructuredData()["@graph"],
      "Organization"
    )

    expect(organization.parentOrganization).toMatchObject({
      "@type": "Organization",
      name: "StageLink LLC",
    })
    expect(OPERATING_COMPANY.name).toBe("StageLink LLC")
  })

  it("publishes the three plan price points", () => {
    const offers = nodeOfType(
      buildLandingStructuredData()["@graph"],
      "SoftwareApplication"
    ).offers as { name: string; price: string; priceCurrency: string }[]

    expect(offers.map((offer) => [offer.name, offer.price])).toEqual([
      ["Free", "0"],
      ["PRO", "9.99"],
      ["PRO+", "19.99"],
    ])
    for (const offer of offers) {
      expect(offer.priceCurrency).toBe("USD")
    }
  })

  it.each(supportedLocales)(
    "mirrors the rendered FAQ copy into the markup (%s)",
    (locale) => {
      const copy = getSiteCopy(locale)
      const faq = nodeOfType(
        buildLandingStructuredData({ locale })["@graph"],
        "FAQPage"
      )
      const entities = faq.mainEntity as {
        name: string
        acceptedAnswer: { text: string }
      }[]

      // The markup must never say something the page doesn't — same source.
      expect(entities).toHaveLength(copy.faq.items.length)
      expect(entities.map((entity) => entity.name)).toEqual(
        copy.faq.items.map((item) => item.question)
      )
      expect(entities.map((entity) => entity.acceptedAnswer.text)).toEqual(
        copy.faq.items.map((item) => item.answer)
      )
    }
  )

  it("keeps a non-empty keyword set", () => {
    expect(SEO_KEYWORDS.length).toBeGreaterThan(4)
    for (const keyword of SEO_KEYWORDS) {
      expect(keyword.trim()).not.toBe("")
    }
  })
})

describe("StageLink LLC billing transparency", () => {
  // Users pay a card statement that reads "StageLink LLC". Saying so up front
  // is a deliberate trust decision — these assertions keep it from being
  // quietly dropped in a future copy edit.
  it.each(supportedLocales)("states the billing name on the landing (%s)", (locale) => {
    const copy = getSiteCopy(locale)

    expect(copy.suite.billingBody).toContain("StageLink LLC")
    expect(copy.footer.billing).toContain("StageLink LLC")
  })

  it.each(supportedLocales)("answers it in the FAQ (%s)", (locale) => {
    const { faq } = getSiteCopy(locale)
    const billingAnswers = faq.items.filter((item) =>
      item.answer.includes("StageLink LLC")
    )

    expect(billingAnswers.length).toBeGreaterThan(0)
  })

  it.each(supportedLocales)("names the operator in the terms (%s)", (locale) => {
    const terms = getLegalCopy(locale, "terms")
    const allText = [
      terms.intro,
      ...terms.sections.flatMap((section) => [section.heading, ...section.body]),
    ].join(" ")

    expect(allText).toContain("StageLink LLC")
  })

  it.each(supportedLocales)("names the operator in the privacy policy (%s)", (locale) => {
    const privacy = getLegalCopy(locale, "privacy")

    expect(privacy.intro).toContain("StageLink LLC")
  })
})

describe("landing copy accuracy", () => {
  it.each(supportedLocales)(
    "never promises that we host the user's audio (%s)",
    (locale) => {
      const copy = getSiteCopy(locale)
      const claims = [
        copy.hero.title,
        copy.hero.subtitle,
        copy.hero.support,
        ...copy.how.steps.map((step) => `${step.title} ${step.description}`),
      ]
        .join(" ")
        .toLowerCase()

      // We read tags locally; "upload your mix" was never true.
      expect(claims).not.toContain("upload a mix")
      expect(claims).not.toContain("subí un mix")
    }
  )
})

describe("transactional email identifies the operator", () => {
  it("names StageLink LLC in both the HTML and text footers", () => {
    const { html, text } = buildBrandedEmail({
      preview: "Reset your EnergyCurve password",
      heading: "Reset your password",
      paragraphs: ["Click the button below."],
      button: { label: "Reset", url: "https://energycurve.app/reset-password" },
    })

    // A recipient who later sees "StageLink LLC" on a statement should have
    // met the name here first.
    expect(html).toContain("StageLink LLC")
    expect(text).toContain("StageLink LLC")
  })
})
