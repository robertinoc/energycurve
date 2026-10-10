import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// The shell is a client component that needs the app router; the entry's own
// content is what this file asserts on.
vi.mock("@/components/marketing/page-shell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => children,
}))

import { GlossaryTermPage } from "@/components/content/glossary-pages"
import { GLOSSARY_BY_ID, GLOSSARY_TERMS } from "@/lib/content/glossary/terms"
import { GUIDES, publishedGuides } from "@/lib/content/guides/guides"

/**
 * The orphans the lote 19 census found, and the links that fixed them —
 * docs/seo/enlazado-interno-2026-10.md has the before and after.
 *
 * Measured over the build with `scripts/inbound-links.mjs`: crowd reading had
 * one inbound page in each language (the glossary index) and the energy-curve
 * guide one in English (the guides index). Each fix is one link from the page
 * that is actually about the same thing, not a link from everywhere.
 */

/**
 * Entries no other entry points at, on purpose. B2B is about two people
 * sharing a set; no other entry's subject leads there, and the English article
 * that names it (`what-is-a-dj-set`) links it now that bold links render.
 */
const UNREFERENCED_ON_PURPOSE = new Set(["b2b"])

describe("glossary cross-references", () => {
  it("every entry is in another entry's see-also, unless listed with a reason", () => {
    const referenced = new Set(GLOSSARY_TERMS.flatMap((term) => term.see ?? []))
    const missing = GLOSSARY_TERMS.map((term) => term.id).filter(
      (id) => !referenced.has(id) && !UNREFERENCED_ON_PURPOSE.has(id)
    )
    expect(missing).toEqual([])
  })

  it("names only real, published guides", () => {
    const published = new Set(publishedGuides().map((guide) => guide.id))
    for (const term of GLOSSARY_TERMS) {
      for (const id of term.guides ?? []) {
        expect(published.has(id), `${term.id} → ${id}`).toBe(true)
      }
    }
  })
})

describe("the energy-curve entry links the energy-curve guide", () => {
  const term = GLOSSARY_BY_ID.get("curva-de-energia")!
  const guide = GUIDES.find((g) => g.id === "curva-de-energia")!

  it.each([
    ["en", `/guide/${guide.slug.en}`],
    ["es", `/es/guia/${guide.slug.es}`],
  ] as const)("%s", (locale, href) => {
    const html = renderToStaticMarkup(
      createElement(GlossaryTermPage, { term, locale })
    )
    expect(html).toContain(`href="${href}"`)
  })
})

describe("further reading in the reader's language", () => {
  it("sends an English reader to the English twin", async () => {
    const { articleLinkFor } = await import("@/lib/blog/posts")
    expect(articleLinkFor("esta-bien-el-orden-de-mi-set", "en")).toEqual({
      href: "/blog/is-my-dj-set-in-the-right-order",
      locale: "en",
    })
  })

  it("keeps the Spanish original when there is no twin, and says it is Spanish", async () => {
    const { articleLinkFor } = await import("@/lib/blog/posts")
    // `como-cerrar-un-set-de-dj` (lote 18) has no English translation.
    expect(articleLinkFor("como-cerrar-un-set-de-dj", "en")).toEqual({
      href: "/es/blog/como-cerrar-un-set-de-dj",
      locale: "es",
    })
  })

  it("leaves a Spanish reader on the Spanish article", async () => {
    const { articleLinkFor } = await import("@/lib/blog/posts")
    expect(articleLinkFor("esta-bien-el-orden-de-mi-set", "es")).toEqual({
      href: "/es/blog/esta-bien-el-orden-de-mi-set",
      locale: "es",
    })
  })

  it("the English energy-curve entry links the English article, unmarked", () => {
    const html = renderToStaticMarkup(
      createElement(GlossaryTermPage, {
        term: GLOSSARY_BY_ID.get("curva-de-energia")!,
        locale: "en",
      })
    )
    expect(html).toContain('href="/blog/is-my-dj-set-in-the-right-order"')
    expect(html).not.toContain('href="/es/blog/esta-bien-el-orden-de-mi-set"')
    expect(html).not.toContain("(en español)")
  })
})
