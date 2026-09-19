import { describe, expect, it } from "vitest"

import { getSiteCopy, supportedLocales } from "@/lib/content/site-copy"
import { getLegalCopy } from "@/lib/content/legal-copy"
import { buildBrandedEmail } from "@/lib/email/build-email-html"
import {
  buildLandingStructuredData,
  buildRootMetadata,
  marketingMetadata,
  openGraphLocale,
  OPERATING_COMPANY,
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

  /**
   * Decision 28. The `<meta name="keywords">` tag is gone on purpose, and the
   * way it comes back is somebody adding `keywords:` to a metadata object
   * because the field exists and looks unfilled. Asserting its absence is what
   * makes that a failing test rather than a silent regression.
   */
  it.each(supportedLocales)(
    "emits no meta keywords, in either language (%s)",
    (locale) => {
      expect(buildRootMetadata(locale).keywords).toBeUndefined()

      for (const path of ["/", "/pricing", "/energy-tags"] as const) {
        expect(marketingMetadata(path, locale).keywords).toBeUndefined()
      }
    }
  )
})

/**
 * Decision 27 — the Open Graph dialect hint for Spanish.
 *
 * Pinned in one place because the SEO plan asks for `es_AR` and a future reader
 * of the plan will try to "fix" this. `es_AR` is not in Facebook's
 * supported-locale list; `es_LA` is. The test states the value and the reason
 * lives in `lib/seo.ts` and `docs/decisions.md`.
 */
describe("the Spanish Open Graph locale", () => {
  it("is es_LA, and never es_AR", () => {
    expect(openGraphLocale("es")).toBe("es_LA")
    expect(openGraphLocale("en")).toBe("en_US")
  })

  /**
   * The plan's gap #10 was that pages said `es_LA` while articles said `es_AR`.
   * Both now come through `openGraphLocale`, so the only way they can disagree
   * again is if one of them stops calling it — which is what this asserts.
   */
  it.each(supportedLocales)(
    "is the same value on every marketing page (%s)",
    (locale) => {
      const expected = openGraphLocale(locale)

      for (const path of ["/", "/pricing", "/energy-tags", "/blog"] as const) {
        expect(marketingMetadata(path, locale).openGraph?.locale).toBe(expected)
      }
    }
  )
})

describe("StageLink LLC billing transparency", () => {
  // Users pay a card statement that reads "StageLink LLC". Saying so up front
  // is a deliberate trust decision — these assertions keep it from being
  // quietly dropped in a future copy edit.
  it.each(supportedLocales)("states the billing name on the landing (%s)", (locale) => {
    const copy = getSiteCopy(locale)

    // The landing states it in the footer, which is on every marketing page;
    // /pricing repeats it as a footnote beside the prices. The StageLink
    // section used to carry a third copy of it — one panel explaining a
    // non-problem — and dropping it must not drop the guarantee.
    expect(copy.footer.billing).toContain("StageLink LLC")
    expect(copy.pricing.billingBody).toContain("StageLink LLC")
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

describe("privacy policy names every processor we actually use", () => {
  // A subprocessor that isn't listed is the kind of omission nobody notices
  // until it matters. These two arrived with AI ordering and Stripe checkout.
  it.each(supportedLocales)("names Anthropic and Stripe (%s)", (locale) => {
    const privacy = getLegalCopy(locale, "privacy")
    const allText = privacy.sections
      .flatMap((section) => [section.heading, ...section.body])
      .join(" ")

    expect(allText).toContain("Anthropic")
    expect(allText).toContain("Stripe")
  })

  it.each(supportedLocales)(
    "states that audio never leaves the device (%s)",
    (locale) => {
      const privacy = getLegalCopy(locale, "privacy")
      const allText = privacy.sections
        .flatMap((section) => [section.heading, ...section.body])
        .join(" ")
        .toLowerCase()

      // The product's loudest privacy claim belongs in the policy, not only
      // in marketing copy.
      expect(allText).toMatch(/never uploaded|nunca se suben/)
    }
  )
})

describe("pricing copy matches what can actually be bought", () => {
  // schema.org availability, the plan badges and this copy have to move in the
  // same change. They didn't: checkout shipped and the copy still said the
  // paid plans couldn't be bought yet.
  it.each(supportedLocales)(
    "never claims paid plans are unbuyable while offers are InStock (%s)",
    (locale) => {
      const { pricing } = getSiteCopy(locale)
      const surfaces = [pricing.subtitle, pricing.teaserBody].join(" ")

      expect(surfaces).not.toMatch(/in development|en desarrollo/i)
      expect(surfaces).not.toMatch(/can't buy|no es algo que ya puedas comprar/i)
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

/**
 * SEO-E21 — every FAQ answer opens with a sentence that survives being quoted
 * on its own.
 *
 * This is how an answer engine uses the page: it lifts the first sentence and
 * shows it beside the question, with none of the paragraph around it. "Sí." and
 * "De todo el set." are perfectly good conversation and useless quotations — the
 * reader sees an answer that answers nothing.
 *
 * The rule is mechanical enough to assert: the opening sentence has to carry its
 * own subject, which in practice means it is longer than a bare yes or no and
 * names something from the question.
 */
describe("the landing FAQ answers stand on their own", () => {
  /** The first sentence, by the punctuation a reader sees. */
  function opening(answer: string): string {
    return answer.split(/(?<=[.!?])\s/)[0]!
  }

  it.each(supportedLocales)(
    "never opens with a bare yes or no (%s)",
    (locale) => {
      const bare = getSiteCopy(locale)
        .faq.items.map((item) => opening(item.answer))
        .filter((first) => /^(s[íi]|yes|no|todos|all of them)[.!]?$/i.test(first))

      expect(bare).toEqual([])
    }
  )

  it.each(supportedLocales)(
    "opens with a sentence long enough to mean something (%s)",
    (locale) => {
      for (const item of getSiteCopy(locale).faq.items) {
        const first = opening(item.answer)

        /**
         * Five words, not more. "EnergyCurve works with every genre." is
         * exactly five and is a complete answer; the shapes this is aimed at —
         * "Yes.", "For the whole set.", "Yes, it does." — are four or fewer.
         * A higher bar would reject good writing for being short, which is the
         * opposite of what SEO-E21 asks for.
         */
        expect(
          first.split(/\s+/).length,
          `${item.question} opens with: ${first}`
        ).toBeGreaterThan(4)
      }
    }
  )

  /**
   * The count is asserted because the plan says eleven and there are more. The
   * number moved while nobody was looking, which is exactly the kind of drift a
   * rewrite is asked to respect and can silently undo.
   */
  it("still has every question it had", () => {
    expect(getSiteCopy("es").faq.items).toHaveLength(13)
    expect(getSiteCopy("en").faq.items).toHaveLength(13)
  })
})
