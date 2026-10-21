import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BlogFigure } from "@/components/content/blog-figure"
import {
  BLOG_FIGURE_IDS,
  SET_ORDER_EXAMPLE,
  flaggedTransitions,
} from "@/lib/blog/figures"
import { parseMarkdown, UnsupportedMarkdownError } from "@/lib/blog/markdown"
import { getPost } from "@/lib/blog/posts"
import {
  GENRE_LABELS,
  GENRE_TRANSITION_TOLERANCE_V2,
  SUPPORTED_GENRES,
} from "@/lib/product/strategy"

/**
 * Lote 22, task 4: a figure in the Spanish articles where one explains what
 * the text explains worse — two of the five. Both read the engine: the curves
 * are drawn by the product's own chart, the flagged jumps by the engine's own
 * rule, and the tolerances straight from GENRE_TRANSITION_TOLERANCE_V2. No
 * number in a figure is typed twice.
 */

const html = (id: (typeof BLOG_FIGURE_IDS)[number], locale: "en" | "es") =>
  renderToStaticMarkup(createElement(BlogFigure, { id, locale }))

describe("the figure block", () => {
  it("parses a fenced figure by id", () => {
    expect(parseMarkdown("```figure\nset-order-example\n```")).toEqual([
      { kind: "figure", id: "set-order-example" },
    ])
  })

  it("refuses an id it does not know, instead of rendering nothing", () => {
    expect(() => parseMarkdown("```figure\nno-such-figure\n```")).toThrow(
      UnsupportedMarkdownError
    )
  })
})

describe("which Spanish articles carry one", () => {
  const figures = (slug: string) =>
    getPost("es", slug)!
      .blocks.filter((block) => block.kind === "figure")
      .map((block) => (block as { id: string }).id)

  it("the two where a figure explains something, and only those", () => {
    expect(figures("esta-bien-el-orden-de-mi-set")).toEqual(["set-order-example"])
    expect(figures("cuanto-es-mucho-salto-de-energia")).toEqual(["transition-tolerance"])
    for (const slug of [
      "antes-de-tocar-no-despues",
      "tus-temas-no-tienen-bpm-ni-tonalidad",
      "ordenar-un-set-desde-una-lista-de-texto",
    ]) {
      expect(figures(slug), slug).toEqual([])
    }
  })
})

describe("the set-order example", () => {
  const article = JSON.stringify(getPost("es", "esta-bien-el-orden-de-mi-set")!.blocks)

  it("is the sequence the article prints, before and after the move", () => {
    expect(article).toContain(SET_ORDER_EXAMPLE.before.join(", "))
    expect(article).toContain(SET_ORDER_EXAMPLE.after.join(", "))
    expect(SET_ORDER_EXAMPLE.after).toEqual([4, 5, 5, 4, 6, 7, 8, 9, 8])
  })

  it("flags, by the engine's rule, the two jumps the article names and nothing after", () => {
    expect(flaggedTransitions(SET_ORDER_EXAMPLE.before)).toEqual([
      { from: 3, to: 4, delta: 3 },
      { from: 4, to: 5, delta: -4 },
    ])
    expect(flaggedTransitions(SET_ORDER_EXAMPLE.after)).toEqual([])
  })

  it("describes what it shows to a screen reader, in the page's language", () => {
    const es = html("set-order-example", "es")

    expect(es).toContain('role="img"')
    expect(es).toMatch(/aria-label="[^"]*4, 5, 5, 8, 4, 6, 7, 9, 8[^"]*"/)
    expect(es).toMatch(/aria-label="[^"]*\+3[^"]*−4[^"]*"/)
    expect(es).not.toMatch(/aria-label="(Gráfico|Chart|Set energy curve)"/)
  })
})

describe("the tolerance figure", () => {
  it("draws every genre with the engine's rise and drop", () => {
    for (const locale of ["en", "es"] as const) {
      const out = html("transition-tolerance", locale)

      for (const genre of SUPPORTED_GENRES) {
        const { rise, drop } = GENRE_TRANSITION_TOLERANCE_V2[genre]
        expect(out, genre).toContain(GENRE_LABELS[genre])
        expect(out, genre).toContain(`+${String(rise).replace(".", locale === "es" ? "," : ".")}`)
        expect(out, genre).toContain(`−${String(drop).replace(".", locale === "es" ? "," : ".")}`)
      }
    }
  })

  it("has a label that says what it shows, not that it is a chart", () => {
    const es = html("transition-tolerance", "es")

    expect(es).toContain('role="img"')
    expect(es).toMatch(/aria-label="[^"]*subida[^"]*bajada[^"]*"/)
  })
})

describe("the article no longer says the opposite of its figure", () => {
  // The engine's comfortable drop is equal to or larger than the rise in 8 of
  // its 12 genres; «downward the margin is smaller still» said the reverse.
  it("in either language", () => {
    const es = JSON.stringify(getPost("es", "cuanto-es-mucho-salto-de-energia")!.blocks)
    const en = JSON.stringify(getPost("en", "how-much-energy-jump-is-too-much-dj")!.blocks)

    expect(es).not.toContain("más chico todavía")
    expect(en).not.toContain("smaller still")

    const smallerDrop = SUPPORTED_GENRES.filter(
      (g) => GENRE_TRANSITION_TOLERANCE_V2[g].drop < GENRE_TRANSITION_TOLERANCE_V2[g].rise
    )
    expect(smallerDrop.length).toBeLessThan(SUPPORTED_GENRES.length / 2)
  })
})
