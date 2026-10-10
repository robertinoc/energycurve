import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ContentBody } from "@/components/content/content-body"
import {
  parseInline,
  type BlogBlock,
  type InlineNode,
} from "@/lib/blog/markdown"
import { allPublishedPosts } from "@/lib/blog/posts"
import { GUIDES } from "@/lib/content/guides/guides"
import { buildGuideStructuredData } from "@/lib/content/structured-data"

/**
 * Links that never became links (lote 19).
 *
 * The inbound-link census over the sitemap found `/glossary/b2b` with one page
 * pointing at it, while `what-is-a-dj-set.md` plainly links it. The served HTML
 * said why: `<strong>The [b2b](/glossary/b2b) set</strong>`. A bold span was
 * taken as plain text, link and all — on three articles and the guide — and the
 * guide's callout, steps and FAQ printed their markdown as strings. The reader
 * saw brackets; a crawler saw no anchor.
 *
 * The old guard only looked for a literal `**` in paragraphs and headings, so
 * a link inside a list item's bold went through. These look at every inline
 * node of every block kind.
 */

const RAW_LINK = /\]\((\/|https?:)/

function inlineOf(block: BlogBlock): InlineNode[] {
  switch (block.kind) {
    case "heading":
    case "paragraph":
      return block.inline
    case "list":
      return block.items.flat()
    case "table":
      return [...block.header.flat(), ...block.rows.flat(2)]
    case "faq":
      return block.entries.flatMap((entry) => entry.answer)
    case "code":
      return []
  }
}

describe("a link inside bold", () => {
  it("becomes a link, flagged bold, between bold runs", () => {
    expect(parseInline("**The [b2b](/glossary/b2b) set** is two DJs")).toEqual([
      { kind: "strong", text: "The " },
      { kind: "link", text: "b2b", href: "/glossary/b2b", strong: true },
      { kind: "strong", text: " set" },
      { kind: "text", text: " is two DJs" },
    ])
  })

  it("works when the link is the whole bold span", () => {
    expect(parseInline("**[Peak time](/glossary/peak-time).**")).toEqual([
      { kind: "link", text: "Peak time", href: "/glossary/peak-time", strong: true },
      { kind: "strong", text: "." },
    ])
  })

  it("still refuses a link on another scheme", () => {
    expect(() => parseInline("**a [x](javascript:alert(1)) b**")).toThrow()
  })
})

describe("no published article prints a link as text", () => {
  for (const post of allPublishedPosts()) {
    it(`${post.locale}/${post.slug}`, () => {
      for (const block of post.blocks) {
        for (const node of inlineOf(block)) {
          if (node.kind === "link") continue
          expect(node.text, `${node.kind} node`).not.toMatch(RAW_LINK)
        }
      }
    })
  }
})

describe("the guides render their links as anchors", () => {
  for (const guide of GUIDES) {
    for (const locale of ["en", "es"] as const) {
      const nodes = guide.sections.flatMap((section) => section.nodes)

      it(`${guide.slug[locale]} (${locale}): no markdown link in the HTML`, () => {
        const html = renderToStaticMarkup(
          createElement(ContentBody, { nodes, locale, page: "/test" })
        )
        expect(html).not.toMatch(RAW_LINK)
      })

      it(`${guide.slug[locale]} (${locale}): no markdown link in the FAQPage`, () => {
        const json = JSON.stringify(buildGuideStructuredData(guide, locale))
        expect(json).not.toMatch(RAW_LINK)
      })
    }
  }

  it("the energy-curve guide's free-tool step is an anchor", () => {
    const guide = GUIDES.find((g) => g.slug.en === "energy-curve-in-a-dj-set")
    expect(guide).toBeDefined()
    const nodes = guide!.sections.flatMap((section) => section.nodes)
    const html = renderToStaticMarkup(
      createElement(ContentBody, { nodes, locale: "en", page: "/test" })
    )
    expect(html).toContain('href="/tools/energy-curve"')
    expect(html).toContain('href="/glossary/warm-up"')
  })
})
