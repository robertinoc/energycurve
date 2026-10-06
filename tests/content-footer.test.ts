import { readFileSync } from "node:fs"
import { join } from "node:path"

import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ContentFooter } from "@/components/marketing/content-footer"

/**
 * The footer under content pages (lote 18).
 *
 * Two things it must not get wrong. On a page that is not the landing, the
 * landing's in-page anchors (`#features`, `#faq`) point at nothing unless they
 * carry the landing's path; and a content page that forgets to pass the footer
 * to `PageShell` silently goes back to having no way to pricing or the tools —
 * which is the whole reason the footer is there.
 */

function render(locale: "en" | "es") {
  return renderToStaticMarkup(createElement(ContentFooter, { locale }))
}

describe("the footer under a content page", () => {
  it("points the landing's sections at the landing, in each language", () => {
    expect(render("en")).toContain('href="/#features"')
    expect(render("en")).toContain('href="/#faq"')
    expect(render("es")).toContain('href="/es#features"')
    expect(render("es")).toContain('href="/es#faq"')
  })

  it("leaves no bare in-page anchor behind", () => {
    for (const locale of ["en", "es"] as const) {
      expect(render(locale), locale).not.toMatch(/href="#/)
    }
  })

  it("links pricing and the free tool in the reader's language", () => {
    expect(render("en")).toContain('href="/pricing"')
    expect(render("es")).toContain('href="/es/pricing"')
    expect(render("es")).toContain('href="/es/herramientas/curva-de-energia"')
  })
})

describe("every content page passes it", () => {
  // The pages built on PageShell, by file. The auth pages also use PageShell
  // and deliberately do not get the footer: a sign-in form is not where
  // somebody goes looking for the rest of the site.
  const CONTENT = [
    "components/content/comparison-page.tsx",
    "components/content/glossary-pages.tsx",
    "components/content/guide-pages.tsx",
    "components/marketing/blog-shell.tsx",
    "components/marketing/harmonic-cheat-sheet-page.tsx",
    "components/tools/energy-curve-tool-page.tsx",
    "components/tools/harmonic-tool-page.tsx",
    "components/tools/playlist-converter-page.tsx",
    "components/tools/tools-hub-page.tsx",
  ]

  for (const file of CONTENT) {
    it(file, () => {
      const source = readFileSync(join(process.cwd(), file), "utf8")
      const shells = source.match(/<PageShell\b[^>]*>/gs) ?? []

      expect(shells.length, "PageShell usages").toBeGreaterThan(0)
      for (const shell of shells) {
        expect(shell).toContain("footer={<ContentFooter")
      }
    })
  }
})
