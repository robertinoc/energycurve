import { describe, expect, it, vi } from "vitest"

import { supportedLocales } from "@/lib/content/site-copy"

/**
 * An index page with nothing in it should not be indexed, and should not be
 * linked — and the day it has something in it, it should come back on its own.
 *
 * `/guide` listed nothing from PR #237 until 26/09/2026: the only entry in
 * `GUIDES` was the component draft, and drafts are excluded on purpose. So two
 * URLs of empty index sat in the sitemap and in the footer, under our own name,
 * until lote 8 derived the rule from `publishedGuides()` instead of writing it
 * into `NOINDEX_PAGES`.
 *
 * Lote 11 published the first real guide, and this file flipped exactly the
 * way its own comment said it would: the real registry now describes the
 * published state, and the *empty* direction is the one that has to be mocked.
 * Nothing in the routing logic was touched to make the index return — which is
 * the property lote 8 built, and the reason both directions stay asserted.
 */

describe("now that a guide is published", () => {
  it("is offered to a search engine, in both languages", async () => {
    const { isIndexable } = await import("@/lib/content/locale-routing")
    const { publishedGuides } = await import("@/lib/content/guides/guides")

    // The premise, asserted rather than assumed: if every guide is ever
    // unpublished and this line is not updated, the tests below start
    // describing a different world.
    expect(publishedGuides().length).toBeGreaterThan(0)

    for (const locale of supportedLocales) {
      expect(isIndexable("/guide", locale), locale).toBe(true)
    }
  })

  it("is in the sitemap, once per language", async () => {
    const { default: sitemap } = await import("@/app/sitemap")
    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls.filter((url) => /\/(guide|guia)$/.test(url))).toHaveLength(2)
  })

  it("is advertised as an hreflang alternate in both languages", async () => {
    const { indexableLocales } = await import("@/lib/content/locale-routing")

    expect(indexableLocales("/guide")).toEqual([...supportedLocales])
  })

  it("is linked from the footer", async () => {
    const { isEmptyIndex } = await import("@/lib/content/locale-routing")

    expect(isEmptyIndex("/guide")).toBe(false)
  })
})

describe("the day the last guide is unpublished", () => {
  /**
   * The direction a hardcoded list cannot express, now the other way round.
   *
   * `publishedGuides` is mocked rather than the real guide being withdrawn,
   * because the claim is about the *rule*, not about any particular guide:
   * whatever the reason the list goes empty, the index has to hide on its own.
   */
  it("hides on its own, in both languages and from the sitemap", async () => {
    vi.resetModules()
    vi.doMock("@/lib/content/guides/guides", async () => {
      const actual = await vi.importActual<
        typeof import("@/lib/content/guides/guides")
      >("@/lib/content/guides/guides")

      return { ...actual, publishedGuides: () => [] }
    })

    const { isIndexable, indexableLocales, isEmptyIndex } = await import(
      "@/lib/content/locale-routing"
    )

    for (const locale of supportedLocales) {
      expect(isIndexable("/guide", locale), locale).toBe(false)
    }

    expect(indexableLocales("/guide")).toEqual([])
    expect(isEmptyIndex("/guide")).toBe(true)

    const { default: sitemap } = await import("@/app/sitemap")
    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls.filter((url) => /\/(guide|guia)$/.test(url))).toEqual([])

    vi.doUnmock("@/lib/content/guides/guides")
    vi.resetModules()
  })
})
