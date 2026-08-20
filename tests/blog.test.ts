import { describe, expect, it } from "vitest"

import {
  UnsupportedMarkdownError,
  parseInline,
  parseMarkdown,
  type BlogBlock,
  type InlineNode,
} from "@/lib/blog/markdown"

/** Flattens a tree back to its words, for assertions about content not shape. */
const textOf = (nodes: InlineNode[]) => nodes.map((node) => node.text).join("")

const kinds = (blocks: BlogBlock[]) => blocks.map((block) => block.kind)

describe("parseInline", () => {
  it("reads bold and italic as their own nodes", () => {
    // One pass with a single alternation, so `**` can't be eaten as two `*` and
    // turned into emphasis around an empty string — which is what happens when
    // italic is applied first.
    expect(parseInline("**muy** y *poco*")).toEqual([
      { kind: "strong", text: "muy" },
      { kind: "text", text: " y " },
      { kind: "em", text: "poco" },
    ])
  })

  it("keeps HTML in the text, as text", () => {
    // The reason this returns nodes: there is no escaping to get right, because
    // there is no HTML string. React renders this as literal characters.
    expect(parseInline("a < b y <script>x</script>")).toEqual([
      { kind: "text", text: "a < b y <script>x</script>" },
    ])
  })

  it("reads http and site-relative links", () => {
    expect(parseInline("[a](https://x.com)")).toEqual([
      { kind: "link", text: "a", href: "https://x.com" },
    ])
    expect(parseInline("[b](/pricing)")).toEqual([
      { kind: "link", text: "b", href: "/pricing" },
    ])
  })

  it("makes our own absolute links relative", () => {
    // So an article keeps working on a preview deployment and after a domain move.
    expect(parseInline("[c](https://energycurve.app/pricing)")).toEqual([
      { kind: "link", text: "c", href: "/pricing" },
    ])
  })

  it("refuses a link on any other scheme", () => {
    // Refused rather than silently downgraded to plain text: losing a link
    // quietly is the kind of thing nobody re-reads a published page to catch.
    expect(() => parseInline("[x](javascript:alert(1))")).toThrow(
      UnsupportedMarkdownError
    )
  })
})

describe("parseMarkdown", () => {
  it("joins a wrapped paragraph into one block", () => {
    // Source lines are wrapped at ~80 chars; each one is not a paragraph.
    const blocks = parseMarkdown("una linea\ny la siguiente")

    expect(kinds(blocks)).toEqual(["paragraph"])
    expect(textOf((blocks[0] as { inline: InlineNode[] }).inline)).toBe(
      "una linea y la siguiente"
    )
  })

  it("keeps consecutive items in one list", () => {
    const [block] = parseMarkdown("- a\n- b")

    expect(block).toMatchObject({ kind: "list", ordered: false })
    expect((block as { items: InlineNode[][] }).items).toHaveLength(2)
  })

  it("tells an ordered list from a bullet one", () => {
    expect(parseMarkdown("1. a\n2. b")[0]).toMatchObject({ ordered: true })
    expect(parseMarkdown("- a")[0]).toMatchObject({ ordered: false })
  })

  it("keeps an indented continuation inside its item", () => {
    // The bug that was invisible to the tests and to the type checker, and
    // obvious in a screenshot: every hard-wrapped bullet was being split into a
    // list item plus a stray paragraph.
    const [block] = parseMarkdown("- primero que sigue\n  en la linea de abajo\n- segundo")
    const items = (block as { items: InlineNode[][] }).items

    expect(items).toHaveLength(2)
    expect(textOf(items[0])).toBe("primero que sigue en la linea de abajo")
  })

  it("refuses a nested list rather than flattening it", () => {
    expect(() => parseMarkdown("- padre\n  - hijo")).toThrow(
      UnsupportedMarkdownError
    )
  })

  it("carries the heading level as data", () => {
    expect(parseMarkdown("## dos\n\n### tres").map((b) => b)).toMatchObject([
      { kind: "heading", level: 2 },
      { kind: "heading", level: 3 },
    ])
  })

  it("reads a fenced block verbatim, with no inline formatting", () => {
    // A pasted tracklist with an asterisk in a title must come out as typed.
    expect(parseMarkdown("```\nA - *B*\nC - D\n```")).toEqual([
      { kind: "code", lines: ["A - *B*", "C - D"] },
    ])
  })

  it("throws on an unterminated fence instead of eating the article", () => {
    expect(() => parseMarkdown("```\nsin cerrar")).toThrow(UnsupportedMarkdownError)
  })

  it("reads a table and drops the separator row", () => {
    const [block] = parseMarkdown("| a | b |\n|---|---|\n| 1 | 2 |")

    expect(block).toMatchObject({ kind: "table" })
    const table = block as { header: InlineNode[][]; rows: InlineNode[][][] }
    expect(table.header.map(textOf)).toEqual(["a", "b"])
    expect(table.rows.map((row) => row.map(textOf))).toEqual([["1", "2"]])
  })

  it("refuses a table with no body", () => {
    expect(() => parseMarkdown("| a | b |\n|---|---|")).toThrow(
      UnsupportedMarkdownError
    )
  })

  it("does not swallow a table that follows prose", () => {
    // A paragraph runs to the next blank line, but something that starts another
    // block ends it — otherwise the table arrives as words in a sentence.
    expect(kinds(parseMarkdown("texto\n| a | b |\n|---|---|\n| 1 | 2 |"))).toEqual([
      "paragraph",
      "table",
    ])
  })

  it("refuses a construct it doesn't support, loudly", () => {
    // The point of the whole file. A general engine would silently do something
    // reasonable-looking and the failure would surface as a broken published page.
    for (const source of ["> una cita", "# uno", "##### cinco", "![img](/a.png)"]) {
      expect(() => parseMarkdown(source), source).toThrow(UnsupportedMarkdownError)
    }
  })

  it("names the line in the error, so the fix is obvious", () => {
    expect(() => parseMarkdown("ok\n\n> cita")).toThrow(/line 3/)
  })
})

describe("the real articles", () => {
  it("all parse without hitting the unsupported path", async () => {
    // The guard that makes the restricted subset safe: if someone adds a
    // blockquote to an article, this fails before it can ship.
    const { allPublishedPosts } = await import("@/lib/blog/posts")

    const posts = allPublishedPosts()
    expect(posts.length).toBeGreaterThan(0)

    for (const post of posts) {
      expect(post.blocks.length, post.slug).toBeGreaterThan(5)
      expect(post.title.length).toBeGreaterThan(0)
      expect(post.description.length).toBeGreaterThan(0)

      // Nothing unparsed leaked into the text: a literal ** or ## in a text node
      // means the tokeniser missed it.
      for (const block of post.blocks) {
        if (block.kind === "paragraph" || block.kind === "heading") {
          const text = textOf(block.inline)
          expect(text, post.slug).not.toContain("**")
          expect(text, post.slug).not.toMatch(/^#{2,}/)
        }
      }
    }
  })

  it("excludes drafts from the index", async () => {
    const { listPosts } = await import("@/lib/blog/posts")

    for (const post of listPosts("es")) {
      expect(post.publishedAt).not.toBeNull()
    }
  })

  it("gives every article at least one heading", async () => {
    // A 1,000-word wall with no headings is unreadable and unrankable; this is
    // the cheapest possible check that the structure survived parsing.
    const { allPublishedPosts } = await import("@/lib/blog/posts")

    for (const post of allPublishedPosts()) {
      expect(
        post.blocks.some((block) => block.kind === "heading"),
        post.slug
      ).toBe(true)
    }
  })
})
