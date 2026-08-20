import { describe, expect, it } from "vitest"

import {
  UnsupportedMarkdownError,
  renderInline,
  renderMarkdown,
} from "@/lib/blog/markdown"

describe("renderInline", () => {
  it("renders bold before italic", () => {
    // The order matters: italic first would eat `**` as two `*` and wrap an empty
    // string, turning every bold run in every article into nested emphasis.
    expect(renderInline("**muy** y *poco*")).toBe(
      "<strong>muy</strong> y <em>poco</em>"
    )
  })

  it("escapes HTML before applying formatting", () => {
    // So a stray `<` in prose can't break a page, and no future article can
    // smuggle a tag in through the body.
    expect(renderInline("a < b y <script>x</script>")).toBe(
      "a &lt; b y &lt;script&gt;x&lt;/script&gt;"
    )
  })

  it("cannot have its markers forged by the source", () => {
    // Escaping first means a literal "<strong>" in the text stays literal.
    expect(renderInline("<strong>no</strong>")).not.toContain("<strong>no")
  })

  it("renders http and site-relative links", () => {
    expect(renderInline("[a](https://x.com)")).toBe('<a href="https://x.com">a</a>')
    expect(renderInline("[b](/pricing)")).toBe('<a href="/pricing">b</a>')
  })

  it("refuses a link on any other scheme", () => {
    // Refused rather than silently downgraded to plain text: losing a link
    // quietly is the kind of thing nobody re-reads a published page to catch.
    expect(() => renderInline("[x](javascript:alert(1))")).toThrow(
      UnsupportedMarkdownError
    )
  })
})

describe("renderMarkdown", () => {
  it("joins a wrapped paragraph into one element", () => {
    // Source lines are wrapped at ~80 chars; each one is not a paragraph.
    expect(renderMarkdown("una linea\ny la siguiente")).toBe(
      "<p>una linea y la siguiente</p>"
    )
  })

  it("keeps consecutive list items in one list", () => {
    expect(renderMarkdown("- a\n- b")).toBe("<ul><li>a</li><li>b</li></ul>")
    expect(renderMarkdown("1. a\n2. b")).toBe("<ol><li>a</li><li>b</li></ol>")
  })

  it("gives each heading its own element at its own level", () => {
    expect(renderMarkdown("## dos\n\n### tres")).toBe("<h2>dos</h2>\n<h3>tres</h3>")
  })

  it("renders a fenced block verbatim, with no inline formatting", () => {
    // A pasted tracklist with an asterisk in a title must come out as typed.
    const html = renderMarkdown("```\nA - *B*\nC - D\n```")

    expect(html).toBe("<pre><code>A - *B*\nC - D</code></pre>")
  })

  it("throws on an unterminated fence instead of eating the article", () => {
    expect(() => renderMarkdown("```\nsin cerrar")).toThrow(UnsupportedMarkdownError)
  })

  it("renders a table and drops the separator row", () => {
    const html = renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |")

    expect(html).toContain("<th>a</th><th>b</th>")
    expect(html).toContain("<td>1</td><td>2</td>")
    expect(html).not.toContain("---")
  })

  it("refuses a construct it doesn't support, loudly", () => {
    // The point of the whole file. A general engine would silently do something
    // reasonable-looking and the failure would surface as a broken published page.
    for (const source of ["> una cita", "# uno", "##### cinco"]) {
      expect(() => renderMarkdown(source)).toThrow(UnsupportedMarkdownError)
    }
  })

  it("names the line in the error, so the fix is obvious", () => {
    expect(() => renderMarkdown("ok\n\n> cita")).toThrow(/line 3/)
  })
})

describe("the real articles", () => {
  it("all render without hitting the unsupported path", async () => {
    // The guard that makes the restricted subset safe: if someone adds a
    // blockquote to an article, this fails before it can ship.
    const { allPublishedPosts } = await import("@/lib/blog/posts")

    const posts = allPublishedPosts()
    expect(posts.length).toBeGreaterThan(0)

    for (const post of posts) {
      expect(post.html.length).toBeGreaterThan(500)
      expect(post.title.length).toBeGreaterThan(0)
      expect(post.description.length).toBeGreaterThan(0)
      // Nothing unrendered leaked through.
      expect(post.html).not.toMatch(/^#{1,6} /m)
      expect(post.html).not.toContain("**")
    }
  })

  it("excludes drafts from the index", async () => {
    const { listPosts } = await import("@/lib/blog/posts")

    for (const post of listPosts("es")) {
      expect(post.publishedAt).not.toBeNull()
    }
  })
})

describe("wrapped list items", () => {
  it("keeps an indented continuation inside its list item", () => {
    // Source lines are hard-wrapped at ~80 chars, so most bullets span two or
    // three. Treating each as its own block split every wrapped bullet into a
    // <li> plus a stray paragraph — a bug only visible by looking at the page.
    const html = renderMarkdown("- primero que sigue\n  en la linea de abajo\n- segundo")

    expect(html).toBe(
      "<ul><li>primero que sigue en la linea de abajo</li><li>segundo</li></ul>"
    )
  })

  it("does the same for numbered lists", () => {
    expect(renderMarkdown("1. uno\n   sigue\n2. dos")).toBe(
      "<ol><li>uno sigue</li><li>dos</li></ol>"
    )
  })

  it("refuses a nested list rather than flattening it", () => {
    // It needs its own <ul> inside an <li>, and quietly folding it into the
    // parent item would lose the structure the author wrote.
    expect(() => renderMarkdown("- padre\n  - hijo")).toThrow(
      UnsupportedMarkdownError
    )
  })
})
