import { describe, expect, it } from "vitest"

import { linkGlossaryTerms } from "@/lib/blog/link-terms"
import { listPosts } from "@/lib/blog/posts"
import { parseMarkdown, type BlogBlock, type InlineNode } from "@/lib/blog/markdown"

/**
 * The articles are not edited by this branch. That is the property under test:
 * the linking happens on parsed nodes, so the `.md` files keep their prose and
 * their history, and what changes is only what the reader sees.
 */

function inlineNodes(blocks: BlogBlock[]): InlineNode[] {
  return blocks.flatMap((block) => {
    if (block.kind === "paragraph") return block.inline
    if (block.kind === "heading") return block.inline
    if (block.kind === "list") return block.items.flat()
    if (block.kind === "table") return [...block.header.flat(), ...block.rows.flat(2)]
    return []
  })
}

function termNodes(blocks: BlogBlock[]) {
  return inlineNodes(blocks).filter((node) => node.kind === "term")
}

function textOf(blocks: BlogBlock[]): string {
  return inlineNodes(blocks)
    .map((node) => ("text" in node ? node.text : ""))
    .join("")
}

describe("linking glossary terms into an article", () => {
  it("links a term the first time it appears and not afterwards", () => {
    const blocks = parseMarkdown(
      "El BPM de un tema importa.\n\nY el BPM otra vez, y el BPM una tercera."
    )

    const linked = linkGlossaryTerms(blocks, "es")
    const terms = termNodes(linked).filter((node) => node.id === "bpm")

    expect(terms).toHaveLength(1)
    expect(terms[0].text).toBe("BPM")
    expect(terms[0].href).toBe("/es/glosario/bpm")
  })

  it("leaves the text itself untouched", () => {
    const source = "La tonalidad de un tema y su BPM."
    const linked = linkGlossaryTerms(parseMarkdown(source), "es")

    expect(textOf(linked)).toBe(source)
  })

  it("keeps the capitalisation the article used", () => {
    const linked = linkGlossaryTerms(
      parseMarkdown("Tonalidad al principio de la frase."),
      "es"
    )

    expect(termNodes(linked)[0].text).toBe("Tonalidad")
  })

  it("matches whole words only", () => {
    // "dropped" contains "drop"; "keyboard" contains "key".
    const linked = linkGlossaryTerms(
      parseMarkdown("The track dropped and the keyboard buzzed."),
      "en"
    )

    expect(termNodes(linked)).toHaveLength(0)
  })

  it("prefers the longer phrase when two overlap", () => {
    const linked = linkGlossaryTerms(
      parseMarkdown("La rueda Camelot ordena las tonalidades."),
      "es"
    )

    const camelot = termNodes(linked).find((node) => node.id === "rueda-camelot")
    expect(camelot?.text).toBe("rueda Camelot")
  })

  it("never links inside a heading", () => {
    const linked = linkGlossaryTerms(parseMarkdown("## El BPM y nada más"), "es")

    expect(termNodes(linked)).toHaveLength(0)
  })

  it("never links inside an existing link, or inside bold or italic", () => {
    const linked = linkGlossaryTerms(
      parseMarkdown("Mirá [el BPM](/es/glosario) y el **BPM** y el *BPM*."),
      "es"
    )

    expect(termNodes(linked)).toHaveLength(0)
  })

  it("carries the short definition, so the tooltip needs no second lookup", () => {
    const linked = linkGlossaryTerms(parseMarkdown("Hablemos de BPM."), "es")

    expect(termNodes(linked)[0].short.length).toBeGreaterThan(0)
  })

  describe("over the real articles", () => {
    const posts = listPosts("es")

    it("has articles to work on", () => {
      expect(posts.length).toBeGreaterThan(0)
    })

    it.each(posts.map((post) => [post.slug, post] as const))(
      "%s gains links without changing a character of its prose",
      (_slug, post) => {
        const linked = linkGlossaryTerms(post.blocks, post.locale)

        expect(textOf(linked)).toBe(textOf(post.blocks))
        expect(linked).toHaveLength(post.blocks.length)
      }
    )

    it("links at most one node per term across an article", () => {
      for (const post of posts) {
        const ids = termNodes(linkGlossaryTerms(post.blocks, post.locale)).map(
          (node) => node.id
        )

        expect(new Set(ids).size).toBe(ids.length)
      }
    })

    it("links something in the articles that use the vocabulary", () => {
      const linkedSomewhere = posts.flatMap((post) =>
        termNodes(linkGlossaryTerms(post.blocks, post.locale)).map(
          (node) => node.id
        )
      )

      // These are the words a grep says are actually in the five articles. If
      // one stops being linked, either an article changed or the match phrases
      // drifted — both worth knowing about.
      expect(new Set(linkedSomewhere)).toEqual(
        new Set([
          "curva-de-energia",
          "bpm",
          "tonalidad",
          "rueda-camelot",
          "mezcla-armonica",
          "warm-up",
          "peak-time",
          "pitch",
          "transicion",
        ])
      )
    })
  })
})
