import { describe, expect, it } from "vitest"

import {
  COMPARISONS,
  comparisonBySlug,
  type Comparison,
} from "@/lib/content/compare/comparisons"
import {
  comparisonAlternates,
  comparisonPath,
} from "@/lib/content/compare/paths"
import { buildComparisonStructuredData } from "@/lib/content/structured-data"
import { supportedLocales } from "@/lib/content/site-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The comparison pages, and the rules that make them publishable rather than
 * merely written.
 *
 * Most of this file is not about rendering. It is about the four constraints
 * SEO-E23 was blocked on, turned into assertions: sourced facts, no superiority
 * claims, a case named where the other product wins, and a date beside anything
 * that ages. A comparison page that quietly loses one of those is not a style
 * regression — it is the difference between a page we can publish and a claim
 * about a named company we cannot support.
 */

/** Every string a reader can see, flattened per locale. */
function visibleText(comparison: Comparison, locale: SiteLocale): string {
  const parts: string[] = [
    comparison.title[locale],
    comparison.description[locale],
    comparison.summary[locale],
  ]

  for (const section of comparison.sections) {
    parts.push(section.heading[locale])

    for (const node of section.nodes) {
      switch (node.kind) {
        case "prose":
          parts.push(node.markdown[locale])
          break
        case "callout":
          parts.push(node.title[locale], node.body[locale])
          break
        case "faq":
          for (const entry of node.entries) {
            parts.push(entry.question[locale], entry.answer[locale])
          }
          break
        case "comparacion":
          parts.push(node.caption[locale], node.leftHeading[locale], node.rightHeading[locale])
          for (const row of node.rows) {
            parts.push(row.label[locale], row.left[locale], row.right[locale])
          }
          break
        default:
          break
      }
    }
  }

  return parts.join("\n")
}

describe("the registry holds together", () => {
  it("has the four pages the plan asks for", () => {
    expect(COMPARISONS).toHaveLength(4)
  })

  it("gives every comparison a slug in both languages, and no two share one", () => {
    for (const locale of supportedLocales) {
      const slugs = COMPARISONS.map((comparison) => comparison.slug[locale])

      expect(slugs.every(Boolean)).toBe(true)
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })

  it("resolves a slug back to its comparison, per language", () => {
    for (const comparison of COMPARISONS) {
      for (const locale of supportedLocales) {
        expect(comparisonBySlug(comparison.slug[locale], locale)?.id).toBe(
          comparison.id
        )
      }
    }
  })

  it("puts the Spanish pages under /es and the English ones at the root", () => {
    for (const comparison of COMPARISONS) {
      expect(comparisonPath(comparison, "en")).toMatch(/^\/compare\//)
      expect(comparisonPath(comparison, "es")).toMatch(/^\/es\/comparar\//)
    }
  })

  it("keeps every description inside the 140–155 bound the guides use", () => {
    for (const comparison of COMPARISONS) {
      for (const locale of supportedLocales) {
        const length = comparison.description[locale].length

        expect(
          length,
          `${comparison.id} (${locale}) is ${length} characters`
        ).toBeGreaterThanOrEqual(140)
        expect(length).toBeLessThanOrEqual(155)
      }
    }
  })
})

describe("what makes these pages publishable", () => {
  it("dates every page, and links the competitor pages the facts came from", () => {
    for (const comparison of COMPARISONS) {
      expect(comparison.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(comparison.sources.length).toBeGreaterThan(0)

      for (const source of comparison.sources) {
        expect(source.url).toMatch(/^https:\/\//)
        expect(source.label.length).toBeGreaterThan(0)
      }

      // The sources have to be the competitor's own pages. A comparison
      // sourced to a review site is the thing the rule exists to prevent.
      const ourOwn = comparison.sources.filter((source) =>
        source.url.includes("energycurve.app")
      )

      expect(ourOwn).toHaveLength(0)
    }
  })

  /**
   * The rule that keeps the page from reading as a brochure.
   *
   * Phrased as "name the competitor next to a recommendation": every page has a
   * section that says, in one language or the other, that the *other* product
   * is the right call for some reader. Asserting the section exists is not
   * enough — a section headed "when each one is the right call" that only ever
   * recommends us is exactly the failure this is for.
   */
  it("names a case where the other product is the right choice", () => {
    for (const comparison of COMPARISONS) {
      const section = comparison.sections.find(
        (candidate) => candidate.id === "cuando-conviene-cada-uno"
      )

      expect(section, `${comparison.id} has no recommendation section`).toBeDefined()

      const english = visibleText(comparison, "en")
      const spanish = visibleText(comparison, "es")
      const name = comparison.competitor

      expect(
        english.includes(`**${name} is the right call**`),
        `${comparison.id} (en) never says ${name} is the right call for anyone`
      ).toBe(true)

      expect(
        spanish.includes(`**Conviene ${name}**`),
        `${comparison.id} (es) nunca dice que conviene ${name}`
      ).toBe(true)
    }
  })

  /**
   * No superiority claims, in either language.
   *
   * The comparison is what each product analyses, not which is better. These
   * are the constructions that turn one into the other, and they are banned
   * outright rather than reviewed case by case — a page arguing it is the best
   * has stopped being the inventory an answer engine quotes.
   *
   * **Blunt on purpose, and it already cost a sentence.** The Spanish SetFlow
   * copy said "ése es el mejor trato" about *SetFlow*, which is the opposite of
   * the claim being banned, and this still failed. Teaching the rule to find
   * the subject of the sentence would make it clever and unreliable; rewording
   * one line cost nothing. A guard that occasionally asks for a rewrite is
   * worth more than one that can be argued with.
   */
  it("makes no superiority claim about EnergyCurve", () => {
    const BANNED = [
      /\bbetter than\b/i,
      /\bthe best\b/i,
      /\bsuperior to\b/i,
      /\bbeats\b/i,
      /\bmejor que\b/i,
      /\bel mejor\b/i,
      /\bla mejor\b/i,
      /\bsuperior a\b/i,
    ]

    for (const comparison of COMPARISONS) {
      for (const locale of supportedLocales) {
        const text = visibleText(comparison, locale)

        for (const pattern of BANNED) {
          expect(
            pattern.test(text),
            `${comparison.id} (${locale}) matches ${pattern}`
          ).toBe(false)
        }
      }
    }
  })

  /**
   * Anything with a currency in it has to sit on a page that says when it was
   * read. Prices age; a price with no date is a claim with no expiry.
   */
  it("only quotes a price on a page that carries its verification date", () => {
    const CURRENCY = /(US\$|u\$s|£|€)\s?\d/

    for (const comparison of COMPARISONS) {
      for (const locale of supportedLocales) {
        if (CURRENCY.test(visibleText(comparison, locale))) {
          expect(comparison.verifiedAt).toBeTruthy()
        }
      }
    }
  })

  it("gives every page questions, so each one emits a FAQPage", () => {
    for (const comparison of COMPARISONS) {
      const questions = comparison.sections
        .flatMap((section) => section.nodes)
        .filter((node) => node.kind === "faq")
        .flatMap((node) => node.entries)

      expect(
        questions.length,
        `${comparison.id} has no FAQ, so its schema would carry no FAQPage`
      ).toBeGreaterThan(0)
    }
  })
})

describe("the structured data says what the page says", () => {
  it("emits WebPage, BreadcrumbList and FAQPage, with the sources as citations", () => {
    for (const comparison of COMPARISONS) {
      for (const locale of supportedLocales) {
        const data = buildComparisonStructuredData(comparison, locale) as {
          "@graph": Record<string, unknown>[]
        }
        const types = data["@graph"].map((node) => node["@type"])

        expect(types).toContain("WebPage")
        expect(types).toContain("BreadcrumbList")
        expect(types).toContain("FAQPage")

        const page = data["@graph"].find((node) => node["@type"] === "WebPage")!

        expect(page.lastReviewed).toBe(comparison.verifiedAt)
        expect(page.inLanguage).toBe(locale)
        expect((page.citation as unknown[]).length).toBe(
          comparison.sources.length
        )
      }
    }
  })

  /**
   * The safety property the guides' FAQ has, asserted here too: a question that
   * is not rendered cannot reach the markup.
   */
  it("takes every FAQ question from the page's own nodes", () => {
    for (const comparison of COMPARISONS) {
      const rendered = comparison.sections
        .flatMap((section) => section.nodes)
        .filter((node) => node.kind === "faq")
        .flatMap((node) => node.entries.map((entry) => entry.question.en))

      const data = buildComparisonStructuredData(comparison, "en") as {
        "@graph": Record<string, unknown>[]
      }
      const faq = data["@graph"].find((node) => node["@type"] === "FAQPage")!
      const inMarkup = (faq.mainEntity as { name: string }[]).map(
        (entry) => entry.name
      )

      expect(inMarkup).toEqual(rendered)
    }
  })

  it("points both languages at each other", () => {
    for (const comparison of COMPARISONS) {
      const alternates = comparisonAlternates(comparison)

      expect(alternates.en).toBe(comparisonPath(comparison, "en"))
      expect(alternates.es).toBe(comparisonPath(comparison, "es"))
    }
  })
})
