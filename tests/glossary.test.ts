import { describe, expect, it } from "vitest"

import { parseMarkdown } from "@/lib/blog/markdown"
import {
  GLOSSARY_BY_ID,
  GLOSSARY_TERMS,
  groupedByLetter,
  termBySlug,
} from "@/lib/content/glossary/terms"
import { supportedLocales } from "@/lib/content/site-copy"

/**
 * The glossary is content, and content rots in ways types cannot see: an entry
 * that quietly became forty words, a description that grew past what Google
 * renders, a cross-reference to a term somebody removed.
 *
 * Every assertion here is about something that would ship silently otherwise.
 */

/** Words as a reader meets them: the rendered prose, with markup taken out. */
function wordCount(markdown: string): number {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_]/g, "")
    .split(/\s+/)
    .filter(Boolean).length
}

describe("the glossary", () => {
  it("has the twenty-one terms that were agreed, and not the three that were dropped", () => {
    expect(GLOSSARY_TERMS).toHaveLength(21)

    // Compás, tracklist and residencia came off the list on purpose: none of
    // them reached 150 useful words. Re-adding one should fail here first.
    const ids = GLOSSARY_TERMS.map((term) => term.id)
    expect(ids).not.toContain("compas")
    expect(ids).not.toContain("tracklist")
    expect(ids).not.toContain("residencia")
  })

  it("gives every term a unique id, and a unique slug in each language", () => {
    const ids = GLOSSARY_TERMS.map((term) => term.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const locale of supportedLocales) {
      const slugs = GLOSSARY_TERMS.map((term) => term.slug[locale])
      expect(new Set(slugs).size).toBe(slugs.length)

      for (const slug of slugs) {
        expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      }
    }
  })

  describe.each(supportedLocales)("in %s", (locale) => {
    it.each(GLOSSARY_TERMS.map((term) => [term.id, term] as const))(
      "%s has a body of 150–300 words",
      (_id, term) => {
        const words = wordCount(term.body[locale])

        // The floor is the point of the entry: under 150 words it is a
        // dictionary stub competing for a query it cannot answer. The ceiling
        // is where it stops being a glossary entry and becomes an article.
        expect(words).toBeGreaterThanOrEqual(150)
        expect(words).toBeLessThanOrEqual(300)
      }
    )

    it.each(GLOSSARY_TERMS.map((term) => [term.id, term] as const))(
      "%s has a description Google will render whole",
      (_id, term) => {
        expect(term.description[locale].length).toBeGreaterThanOrEqual(140)
        expect(term.description[locale].length).toBeLessThanOrEqual(155)
      }
    )

    it.each(GLOSSARY_TERMS.map((term) => [term.id, term] as const))(
      "%s has a short definition short enough for a tooltip",
      (_id, term) => {
        expect(term.short[locale].length).toBeGreaterThan(0)
        expect(term.short[locale].length).toBeLessThanOrEqual(200)
      }
    )

    it.each(GLOSSARY_TERMS.map((term) => [term.id, term] as const))(
      "%s parses with the restricted markdown parser",
      (_id, term) => {
        expect(() => parseMarkdown(term.body[locale])).not.toThrow()
      }
    )
  })

  it("points every cross-reference at a term that exists", () => {
    for (const term of GLOSSARY_TERMS) {
      for (const id of term.see ?? []) {
        expect(GLOSSARY_BY_ID.has(id), `${term.id} → ${id}`).toBe(true)
        expect(id, `${term.id} refers to itself`).not.toBe(term.id)
      }
    }
  })

  /**
   * The bodies link to other entries by URL, which means a renamed slug breaks
   * a link the type checker is happy with. This walks the prose.
   */
  it("points every in-body glossary link at a term that exists, in its own language", () => {
    const prefix = { es: "/es/glosario/", en: "/glossary/" } as const

    for (const term of GLOSSARY_TERMS) {
      for (const locale of supportedLocales) {
        const hrefs = [...term.body[locale].matchAll(/\]\((\/[^)]+)\)/g)].map(
          (match) => match[1]
        )

        for (const href of hrefs) {
          if (!href.startsWith(prefix[locale])) continue

          const slug = href.slice(prefix[locale].length)
          expect(
            termBySlug(slug, locale),
            `${term.id} (${locale}) → ${href}`
          ).not.toBeNull()
        }
      }
    }
  })

  it("never links a Spanish body to an English glossary URL, or the reverse", () => {
    for (const term of GLOSSARY_TERMS) {
      expect(term.body.es, term.id).not.toContain("](/glossary/")
      expect(term.body.en, term.id).not.toContain("](/es/glosario/")
    }
  })

  it("finds a term by its slug in each language", () => {
    for (const term of GLOSSARY_TERMS) {
      for (const locale of supportedLocales) {
        expect(termBySlug(term.slug[locale], locale)?.id).toBe(term.id)
      }
    }

    expect(termBySlug("no-such-term", "es")).toBeNull()
  })

  describe.each(supportedLocales)("the %s index", (locale) => {
    it("groups every term under exactly one letter", () => {
      const groups = groupedByLetter(locale)
      const total = groups.reduce((sum, group) => sum + group.terms.length, 0)

      expect(total).toBe(GLOSSARY_TERMS.length)
      expect(groups.map((group) => group.letter)).toEqual(
        [...groups.map((group) => group.letter)].sort()
      )
    })
  })
})
