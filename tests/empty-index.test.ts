import { describe, expect, it, vi } from "vitest"

import { supportedLocales } from "@/lib/content/site-copy"

/**
 * An index page with nothing in it should not be indexed, and should not be
 * linked.
 *
 * `/guide` has listed nothing since PR #237 — the only entry in `GUIDES` is the
 * component draft, and drafts are excluded on purpose. So two URLs of empty
 * index sat in the sitemap and in the footer, under our own name.
 *
 * The rule is derived from `publishedGuides()` rather than written into
 * `NOINDEX_PAGES`, and these tests assert **both directions**. A list would
 * have been correct today and wrong on the day the first guide ships, in the
 * direction nothing catches: an empty page being visible is something you
 * notice, a finished page staying hidden is not.
 */

describe("while the guides index has nothing to list", () => {
  it("is not offered to a search engine, in either language", async () => {
    const { isIndexable } = await import("@/lib/content/locale-routing")
    const { publishedGuides } = await import("@/lib/content/guides/guides")

    // The premise, asserted rather than assumed: if a guide ships and this line
    // is not updated, the test below starts describing a different world.
    expect(publishedGuides()).toHaveLength(0)

    for (const locale of supportedLocales) {
      expect(isIndexable("/guide", locale), locale).toBe(false)
    }
  })

  it("is left out of the sitemap", async () => {
    const { default: sitemap } = await import("@/app/sitemap")
    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls.filter((url) => /\/(guide|guia)$/.test(url))).toEqual([])
  })

  it("is not advertised as an hreflang alternate", async () => {
    const { indexableLocales } = await import("@/lib/content/locale-routing")

    expect(indexableLocales("/guide")).toEqual([])
  })

  it("is not linked from the footer", async () => {
    const { isEmptyIndex } = await import("@/lib/content/locale-routing")

    expect(isEmptyIndex("/guide")).toBe(true)
  })
})

describe("the day a guide is published", () => {
  /**
   * The direction a hardcoded list cannot express.
   *
   * `publishedGuides` is mocked rather than a real guide being added, because
   * the claim is about the *rule*, not about any particular guide: whatever
   * ships first, the index has to come back on its own.
   */
  it("comes back on its own, in both languages and in the sitemap", async () => {
    vi.resetModules()
    vi.doMock("@/lib/content/guides/guides", async () => {
      const actual = await vi.importActual<
        typeof import("@/lib/content/guides/guides")
      >("@/lib/content/guides/guides")

      return {
        ...actual,
        publishedGuides: () => [
          { ...actual.GUIDES[0], draft: false } as never,
        ],
      }
    })

    const { isIndexable, indexableLocales, isEmptyIndex } = await import(
      "@/lib/content/locale-routing"
    )

    for (const locale of supportedLocales) {
      expect(isIndexable("/guide", locale), locale).toBe(true)
    }

    expect(indexableLocales("/guide")).toEqual([...supportedLocales])
    expect(isEmptyIndex("/guide")).toBe(false)

    const { default: sitemap } = await import("@/app/sitemap")
    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls.filter((url) => /\/(guide|guia)$/.test(url))).toHaveLength(2)

    vi.doUnmock("@/lib/content/guides/guides")
    vi.resetModules()
  })
})
