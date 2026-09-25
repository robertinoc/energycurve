import { describe, expect, it } from "vitest"

import sitemap from "@/app/sitemap"
import {
  glossaryIndexPath,
  glossaryTermPath,
  guideIndexPath,
  guidePath,
} from "@/lib/content/glossary/paths"
import {
  glossaryTermMetadata,
  guideMetadata,
} from "@/lib/content/entry-metadata"
import { GLOSSARY_TERMS } from "@/lib/content/glossary/terms"
import { GUIDES, publishedGuides } from "@/lib/content/guides/guides"
import {
  buildGlossaryIndexStructuredData,
  buildGlossaryTermStructuredData,
  buildGuideIndexStructuredData,
  buildGuideStructuredData,
} from "@/lib/content/structured-data"
import { marketingMetadata, serializeStructuredData, SITE_URL } from "@/lib/seo"
import { allPublishedPosts, postUpdatedAt } from "@/lib/blog/posts"
import {
  LOCALIZED_PATHS,
  localizedPath,
} from "@/lib/content/locale-routing"
import { pageLastModified, pageMetadata } from "@/lib/content/page-metadata"
import { supportedLocales } from "@/lib/content/site-copy"
import type { Metadata } from "next"

/**
 * The metadata contract for the pages this branch adds, and only those.
 *
 * Scoped to the new pages on purpose: the older ones do not meet the
 * description band — `/install` in English is 89 characters and `/privacy` is
 * 62 — and widening this test to cover them would either fail the suite or
 * force a rewrite of copy nobody asked to change. New pages hold the line;
 * the old ones are a separate decision.
 */

type Alternates = NonNullable<Metadata["alternates"]>

function alternatesOf(metadata: Metadata): Alternates {
  expect(metadata.alternates).toBeDefined()
  return metadata.alternates as Alternates
}

/** Every JSON-LD graph has to survive the same trip the page sends it on. */
function parseGraph(graph: unknown): { "@graph": { "@type": string }[] } {
  const serialized = serializeStructuredData(graph)

  // The serializer escapes `<` so a string containing `</script>` cannot close
  // the tag early. Escaped or not, it still has to parse.
  expect(serialized).not.toContain("</script>")

  return JSON.parse(
    serialized.replace(/\\u003C/gi, "<").replace(/\\u003E/gi, ">")
  )
}

function types(graph: unknown): string[] {
  return parseGraph(graph)["@graph"].map((node) => node["@type"])
}

describe("the new content pages", () => {
  describe.each(supportedLocales)("in %s", (locale) => {
    it("gives the glossary index a title, a description Google renders whole, and a reciprocal hreflang set", () => {
      const meta = marketingMetadata("/glossary", locale)
      const { title, description } = pageMetadata("/glossary", locale)

      expect(meta.title).toBe(title)
      expect(description.length).toBeGreaterThanOrEqual(140)
      expect(description.length).toBeLessThanOrEqual(155)

      const alternates = alternatesOf(meta)
      expect(alternates.canonical).toBe(glossaryIndexPath(locale))
      expect(alternates.languages).toMatchObject({
        en: glossaryIndexPath("en"),
        es: glossaryIndexPath("es"),
        "x-default": glossaryIndexPath("en"),
      })
    })

    it("keeps the guide index's copy ready, but declares no alternates while it is empty", () => {
      // The description still has to be search-result shaped: the page comes
      // back the day a guide ships, and copy that only gets checked then is
      // copy nobody checks.
      //
      // What it must *not* do meanwhile is advertise itself. `publishedGuides()`
      // is empty, so the index lists nothing — and an `hreflang` pointing at a
      // page carrying `noindex` tells a crawler the site contradicts itself.
      const meta = marketingMetadata("/guide", locale)
      const { description } = pageMetadata("/guide", locale)

      expect(description.length).toBeGreaterThanOrEqual(140)
      expect(description.length).toBeLessThanOrEqual(155)

      const alternates = alternatesOf(meta)

      expect(alternates.canonical).toBe(guideIndexPath(locale))
      expect(alternates.languages).toBeUndefined()
      expect(meta.robots).toMatchObject({ index: false })
    })

    it.each(GLOSSARY_TERMS.map((term) => [term.id, term] as const))(
      "gives %s a canonical of its own and an hreflang pointing at its twin",
      (_id, term) => {
        const meta = glossaryTermMetadata(term, locale)

        expect(meta.title).toBe(term.title[locale])
        expect(meta.description).toBe(term.description[locale])

        const alternates = alternatesOf(meta)
        expect(alternates.canonical).toBe(glossaryTermPath(term, locale))

        // Reciprocal, like the blog's articles have been since SEO-E14: these
        // pages exist in both languages, so each one names the other. The
        // articles were the exception until 22/09/2026 and this comment said so
        // — a sentence about another part of the site, going stale in a test
        // nobody had reason to reopen.
        expect(alternates.languages).toEqual({
          en: glossaryTermPath(term, "en"),
          es: glossaryTermPath(term, "es"),
          "x-default": glossaryTermPath(term, "en"),
        })

        expect(meta.robots).toBeUndefined()
      }
    )

    it("emits DefinedTerm and BreadcrumbList on an entry, and DefinedTermSet on the index", () => {
      for (const term of GLOSSARY_TERMS) {
        expect(types(buildGlossaryTermStructuredData(term, locale))).toEqual([
          "DefinedTerm",
          "BreadcrumbList",
        ])
      }

      expect(types(buildGlossaryIndexStructuredData(locale))).toEqual([
        "DefinedTermSet",
        "BreadcrumbList",
      ])
    })

    it("lists every entry in the index's DefinedTermSet", () => {
      const graph = parseGraph(buildGlossaryIndexStructuredData(locale))
      const set = graph["@graph"][0] as unknown as {
        hasDefinedTerm: { url: string }[]
      }

      expect(set.hasDefinedTerm).toHaveLength(GLOSSARY_TERMS.length)
      expect(set.hasDefinedTerm.map((entry) => entry.url)).toEqual(
        GLOSSARY_TERMS.map((term) => `${SITE_URL}${glossaryTermPath(term, locale)}`)
      )
    })

    it.each(GUIDES.map((guide) => [guide.id, guide] as const))(
      "gives the guide %s a description in the band and an Article graph",
      (_id, guide) => {
        expect(guide.description[locale].length).toBeGreaterThanOrEqual(140)
        expect(guide.description[locale].length).toBeLessThanOrEqual(155)

        const emitted = types(buildGuideStructuredData(guide, locale))
        expect(emitted.slice(0, 2)).toEqual(["TechArticle", "BreadcrumbList"])
      }
    )

    it("builds the guide FAQ schema from the questions the page renders", () => {
      const guide = GUIDES[0]
      const graph = parseGraph(buildGuideStructuredData(guide, locale))
      const faq = graph["@graph"].find((node) => node["@type"] === "FAQPage") as
        | undefined
        | { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }

      const rendered = guide.sections
        .flatMap((section) => section.nodes)
        .filter((node) => node.kind === "faq")
        .flatMap((node) => node.entries)

      expect(faq?.mainEntity).toHaveLength(rendered.length)
      expect(faq?.mainEntity.map((entry) => entry.name)).toEqual(
        rendered.map((entry) => entry.question[locale])
      )
    })

    it("emits a CollectionPage for the guide index", () => {
      expect(types(buildGuideIndexStructuredData(publishedGuides(), locale))).toEqual(
        ["CollectionPage", "BreadcrumbList"]
      )
    })
  })

  /**
   * A draft has to do three things, not one. Two out of three is a draft that
   * is quietly published, and the one that leaks is never the one you checked.
   */
  describe("a draft guide", () => {
    const drafts = GUIDES.filter((guide) => guide.draft)

    it("exists, or this whole describe block is asserting nothing", () => {
      expect(drafts.length).toBeGreaterThan(0)
    })

    it.each(supportedLocales)("is noindex in %s", (locale) => {
      for (const guide of drafts) {
        const meta = guideMetadata(guide, locale)
        expect(meta.robots).toEqual({ index: false, follow: true })

        // No hreflang cluster either: a page asked out of the index cannot be
        // the answer for a language, and naming its twin invites a crawler to
        // treat the pair as one indexable set.
        expect(alternatesOf(meta).languages).toBeUndefined()
      }
    })

    it("is absent from the sitemap", () => {
      const urls = sitemap().map((entry) => entry.url)

      for (const guide of drafts) {
        for (const locale of supportedLocales) {
          expect(urls).not.toContain(`${SITE_URL}${guidePath(guide, locale)}`)
        }
      }
    })

    it("is absent from the list the index page renders", () => {
      for (const guide of drafts) {
        expect(publishedGuides().map((one) => one.id)).not.toContain(guide.id)
      }
    })
  })

  describe("the sitemap", () => {
    const entries = sitemap()
    const urls = entries.map((entry) => entry.url)

    it("lists both languages of every glossary entry, and neither of the empty guide index", () => {
      for (const locale of supportedLocales) {
        expect(urls).toContain(`${SITE_URL}${glossaryIndexPath(locale)}`)

        // The guide index used to be here. It lists nothing — the only entry in
        // `GUIDES` is the component draft — so offering a crawler two URLs of
        // empty page was thin content under our own name. It returns on its
        // own; `tests/empty-index.test.ts` asserts that direction.
        expect(urls).not.toContain(`${SITE_URL}${guideIndexPath(locale)}`)

        for (const term of GLOSSARY_TERMS) {
          expect(urls).toContain(`${SITE_URL}${glossaryTermPath(term, locale)}`)
        }
      }
    })

    it("gives each glossary entry a reciprocal alternates block", () => {
      for (const term of GLOSSARY_TERMS) {
        const entry = entries.find(
          (one) => one.url === `${SITE_URL}${glossaryTermPath(term, "es")}`
        )

        expect(entry?.alternates?.languages).toEqual({
          en: `${SITE_URL}${glossaryTermPath(term, "en")}`,
          es: `${SITE_URL}${glossaryTermPath(term, "es")}`,
          // Parity with the `<head>`, which has emitted `x-default` since the
          // locale split. English is the default wherever English is offered.
          "x-default": `${SITE_URL}${glossaryTermPath(term, "en")}`,
        })
      }
    })

    /**
     * SEO-E09. Every entry that declares alternates declares a default too —
     * the sitemap and the `<head>` used to disagree about whether one existed,
     * and a crawler reconciling them has no reason to prefer either.
     */
    it("declares x-default wherever it declares languages", () => {
      for (const entry of entries) {
        const languages = entry.alternates?.languages

        if (!languages) continue

        expect(
          languages["x-default"],
          `${entry.url} declares languages but no x-default`
        ).toBeDefined()
        expect(Object.values(languages)).toContain(languages["x-default"])
      }
    })

    it("has no duplicate URLs", () => {
      expect(new Set(urls).size).toBe(urls.length)
    })

    /**
     * The count is asserted because it is the one number that catches a whole
     * class of mistake at once — a locale dropped, an entry listed twice, a
     * draft leaking in. 32 before the content branch, 78 after it, 84 since
     * SEO-E14 on 22/09/2026, 87 since SEO-E13, and **85 since 25/09/2026**,
     * which is the arithmetic below.
     *
     * It went *down* by two, which is the unusual direction and the reason to
     * read the line: the guide index stopped listing itself in both languages
     * because it lists nothing. It is the first entry in this sitemap that is
     * decided by content rather than by a table, so the number now moves on its
     * own the day a guide ships.
     *
     * The six from SEO-E14 came from two different causes: five were the
     * English translations, and the sixth was `/blog` in English, which had
     * been held out of the sitemap by `NOINDEX_PAGES` for as long as it had no
     * articles to list.
     *
     * The three from SEO-E13 are English-only cornerstone articles with no
     * Spanish counterpart, so they add one URL each rather than two. That
     * asymmetry is the point of counting English and Spanish separately below:
     * a total alone would not show which side moved.
     */
    it("is 85 URLs, and the arithmetic says why", () => {
      const glossaryUrls = GLOSSARY_TERMS.length * supportedLocales.length
      // One index, not two: the glossary's. The guide index is absent while it
      // has nothing to list, and `publishedGuides()` being empty is also why
      // the third term below is zero — the same fact, counted once as a page
      // and once as its contents.
      const indexes = 1 * supportedLocales.length
      const guides = publishedGuides().length * supportedLocales.length

      expect(publishedGuides()).toHaveLength(0)
      expect(glossaryUrls + indexes + guides).toBe(44)

      // The articles, counted from the corpus rather than hardcoded: a number
      // typed in here would have to be edited by every article, and the whole
      // point of asserting a total is that it is the one number nobody edits
      // casually.
      expect(allPublishedPosts()).toHaveLength(13)
      expect(allPublishedPosts().filter((post) => post.locale === "en")).toHaveLength(8)
      expect(allPublishedPosts().filter((post) => post.locale === "es")).toHaveLength(5)

      expect(urls).toHaveLength(85)
    })
  })

  /**
   * SEO-E09 — `lastmod` says when the page changed, not when it was built.
   *
   * The acceptance criterion is that two static pages do not share a timestamp
   * unless they genuinely have not changed, so the test that matters is not
   * "each entry has a date" but "the dates distinguish pages from each other".
   */
  describe("sitemap lastmod", () => {
    const entries = sitemap()

    it("gives every entry a date", () => {
      for (const entry of entries) {
        expect(entry.lastModified, `${entry.url} has no lastmod`).toBeDefined()
      }
    })

    /**
     * The bug this replaced: `new Date()` at module scope, so all sixteen fixed
     * pages reported one identical build timestamp. Asserting that the fixed
     * pages carry several distinct dates is what fails if anyone reintroduces it.
     */
    it("does not give every fixed page the same timestamp", () => {
      const fixedPages = entries.filter((entry) =>
        LOCALIZED_PATHS.some(
          (path) =>
            entry.url === `${SITE_URL}${localizedPath(path, "en")}` ||
            entry.url === `${SITE_URL}${localizedPath(path, "es")}`
        )
      )

      const distinct = new Set(
        fixedPages.map((entry) => String(entry.lastModified))
      )

      expect(fixedPages.length).toBeGreaterThan(10)
      expect(distinct.size).toBeGreaterThan(1)
    })

    /** A build timestamp has a time of day on it; a content date does not. */
    it("reports dates rather than build clocks", () => {
      for (const path of LOCALIZED_PATHS) {
        const date = pageLastModified(path)

        expect(date.getUTCHours()).toBe(0)
        expect(date.getUTCMinutes()).toBe(0)
        expect(Number.isNaN(date.getTime())).toBe(false)
      }
    })

    /**
     * An article that has never been revised reports the day it was published,
     * which is the whole reason `postUpdatedAt` exists.
     */
    it("dates each article by its own revision, not the build", () => {
      for (const post of allPublishedPosts()) {
        const entry = entries.find(
          (one) =>
            one.url ===
            `${SITE_URL}${localizedPath(`/blog/${post.slug}`, post.locale)}`
        )

        expect(String(entry?.lastModified)).toBe(
          String(new Date(postUpdatedAt(post)))
        )
        // Revised or not, an article is a page we intend to edit this quarter.
        expect(entry?.changeFrequency).toBe("monthly")
      }
    })
  })
})
