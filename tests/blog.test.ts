import { describe, expect, it } from "vitest"

import {
  UnsupportedMarkdownError,
  parseInline,
  parseMarkdown,
  type BlogBlock,
  type InlineNode,
} from "@/lib/blog/markdown"
import {
  alternatesFor,
  DEFAULT_AUTHOR,
  listPosts,
  parsePost,
  postAlternates,
  relatedPosts,
  resolveTranslation,
  tagsInUse,
  type BlogPost,
} from "@/lib/blog/posts"

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

describe("article descriptions fit a search result", () => {
  /**
   * 140–155 characters, the same band the `/es` home description was cut to.
   *
   * The ceiling is the real defect: Google stops rendering a description at
   * roughly 155, so two of these articles were being truncated mid-sentence in
   * the one place a stranger decides whether to click. The floor is the other
   * half of the same idea — a 118-character description leaves a third of the
   * snippet blank, and this is the only copy on the page written for that slot.
   *
   * It applies to articles and not to `PAGE_METADATA`, where a legal page that
   * needs nine words has nothing to gain from padding to forty.
   */
  const MIN = 140
  const MAX = 155

  it("keeps every published article inside the band", async () => {
    const { allPublishedPosts } = await import("@/lib/blog/posts")
    const posts = allPublishedPosts()

    expect(posts.length).toBeGreaterThan(0)

    for (const post of posts) {
      expect(
        post.description.length,
        `${post.slug}: ${post.description.length} chars — "${post.description}"`
      ).toBeGreaterThanOrEqual(MIN)

      expect(
        post.description.length,
        `${post.slug}: ${post.description.length} chars — "${post.description}"`
      ).toBeLessThanOrEqual(MAX)
    }
  })
})

describe("the English blog route is shaped for the content it has", () => {
  it("prerenders the English articles once there are any, and not before", async () => {
    /**
     * `app/(en)/blog/[slug]/page.tsx` deliberately has no `generateStaticParams`
     * while `content/blog/en/` is empty: it would return `[]`, which Next reads
     * as "prerender this route's shell" rather than "there is nothing to
     * prerender" — and a prerendered 404 that reaches a not-found reading the
     * request returns a 500.
     *
     * The day an English article exists that stops being true, and prerendering
     * is what you want. Nobody adding an article will think to check, so this
     * fails and says so.
     */
    const { listPosts } = await import("@/lib/blog/posts")
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")

    const route = readFileSync(
      join(process.cwd(), "app/(en)/blog/[slug]/page.tsx"),
      "utf8"
    )

    // The export, not the word: the route's comment explains its own absence.
    const EXPORT = /export\s+(async\s+)?function\s+generateStaticParams/

    if (listPosts("en").length === 0) {
      expect(route).not.toMatch(EXPORT)
      return
    }

    expect(
      EXPORT.test(route),
      "English articles exist now — add generateStaticParams back to " +
        "app/(en)/blog/[slug]/page.tsx so they are prerendered, the way the " +
        "Spanish route already is"
    ).toBe(true)
  })

  it("prerenders the Spanish articles, which do exist", async () => {
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")

    const route = readFileSync(
      join(process.cwd(), "app/(es)/es/blog/[slug]/page.tsx"),
      "utf8"
    )

    expect(route).toMatch(/export\s+(async\s+)?function\s+generateStaticParams/)
  })
})

describe("article structured data", () => {
  /** Parsed back from the string the page actually embeds, not the object. */
  async function graphFor(slug: string) {
    const { getPost, postUpdatedAt } = await import("@/lib/blog/posts")
    const { buildArticleStructuredData } = await import(
      "@/lib/blog/structured-data"
    )
    const { serializeStructuredData } = await import("@/lib/seo")

    // The locale used to be hardcoded to "es", which was correct while every
    // article was Spanish and became a null dereference on the day five English
    // ones landed. Looked up in both rather than parameterised at every call
    // site: a slug is unique across the corpus, and a helper that needs the
    // locale passed in is a helper every new test can get wrong.
    const post = getPost("es", slug) ?? getPost("en", slug)!
    const serialized = serializeStructuredData(
      buildArticleStructuredData(post, postUpdatedAt(post))
    )

    // The escaper replaces `<` and `>` with < / >, which is still
    // valid JSON — so round-tripping proves both the shape and the escaping.
    return { post, serialized, graph: JSON.parse(serialized)["@graph"] }
  }

  it("publishes a BlogPosting and a BreadcrumbList for every article", async () => {
    const { allPublishedPosts } = await import("@/lib/blog/posts")

    for (const post of allPublishedPosts()) {
      const { graph } = await graphFor(post.slug)
      expect(
        graph.map((node: { "@type": string }) => node["@type"]),
        post.slug
      ).toEqual(["BlogPosting", "BreadcrumbList"])
    }
  })

  it("fills every field a rich result needs", async () => {
    const { postUpdatedAt: postUpdatedAtOf } = await import("@/lib/blog/posts")
    const { post, graph } = await graphFor("esta-bien-el-orden-de-mi-set")
    const [article] = graph

    expect(article.headline).toBe(post.title)
    expect(article.description).toBe(post.description)
    expect(article.datePublished).toBe(post.publishedAt)
    // `postUpdatedAt`, not `publishedAt`: this article has been revised — SEO-E14
    // expanded all five — and asserting the publication date here would have
    // made the test demand that `dateModified` ignore a revision that really
    // happened.
    expect(article.dateModified).toBe(postUpdatedAtOf(post))
    expect(article.inLanguage).toBe("es")
    expect(article.author).toMatchObject({ "@type": "Person", name: "ROBERTINOC" })
    expect(article.image).toContain("/opengraph-image")
    expect(article.mainEntityOfPage["@id"]).toBe(
      "https://energycurve.app/es/blog/esta-bien-el-orden-de-mi-set"
    )
  })

  it("embeds the same publisher the home page declares", async () => {
    // By `@id` alone it would be a reference to a node defined on another page,
    // which a consumer reading only the article cannot resolve.
    const { buildLandingStructuredData } = await import("@/lib/seo")
    const { graph } = await graphFor("esta-bien-el-orden-de-mi-set")

    const home = buildLandingStructuredData({ locale: "es" })["@graph"].find(
      (node) => node["@type"] === "Organization"
    )

    expect(graph[0].publisher).toEqual(home)
  })

  it("walks Inicio > Blog > article, in Spanish", async () => {
    const { graph } = await graphFor("esta-bien-el-orden-de-mi-set")
    const crumbs = graph[1].itemListElement

    expect(crumbs.map((crumb: { name: string }) => crumb.name)).toEqual([
      "Inicio",
      "Blog",
      "¿Está bien el orden de mi set? Cómo saberlo antes de tocar",
    ])
    expect(crumbs.map((crumb: { item: string }) => crumb.item)).toEqual([
      "https://energycurve.app/es",
      "https://energycurve.app/es/blog",
      "https://energycurve.app/es/blog/esta-bien-el-orden-de-mi-set",
    ])
  })

  it("dates an unrevised article from its publication, not today", async () => {
    const { allPublishedPosts, postUpdatedAt } = await import("@/lib/blog/posts")

    for (const post of allPublishedPosts()) {
      expect(postUpdatedAt(post), post.slug).toBe(post.updatedAt ?? post.publishedAt)
    }
  })
})

/**
 * SEO-E12 — the frontmatter the blog model gained, and the strictness it kept.
 *
 * `parsePost` is the parser without the filesystem, so a rule can be tested by
 * handing it a bad article rather than writing one to disk.
 */
describe("the blog frontmatter model", () => {
  const article = (frontmatter: string) =>
    `---\ntitle: "T"\ndescription: "D"\nslug: s\n${frontmatter}\n---\n\nBody.\n`

  it("defaults the author to the site's own", () => {
    expect(parsePost(article("publishedAt: 2026-01-01"), "es", "a.md").author).toEqual(
      DEFAULT_AUTHOR
    )
  })

  it("lets an article name its own author and URL", () => {
    const post = parsePost(
      article("author: Jordi\nauthorUrl: https://example.com/jordi"),
      "es",
      "a.md"
    )

    expect(post.author).toEqual({
      name: "Jordi",
      url: "https://example.com/jordi",
    })
  })

  it("keeps the default URL for an author who has no page", () => {
    expect(parsePost(article("author: Jordi"), "es", "a.md").author).toEqual({
      name: "Jordi",
      url: DEFAULT_AUTHOR.url,
    })
  })

  /**
   * A half-filled record would attribute the article to the default author
   * under somebody else's URL, which is worse than either field being absent.
   */
  it("refuses an authorUrl with no author", () => {
    expect(() =>
      parsePost(article("authorUrl: https://example.com"), "es", "a.md")
    ).toThrow(/authorUrl without author/)
  })

  it("reads tags as a comma-separated list, trimmed", () => {
    expect(parsePost(article("tags: orden,  energía , BPM"), "es", "a.md").tags).toEqual(
      ["orden", "energía", "BPM"]
    )
  })

  /** A typo, not two tags. Dropping it silently loses an article from a filter. */
  it("refuses an empty entry in tags", () => {
    expect(() => parsePost(article("tags: orden,, BPM"), "es", "a.md")).toThrow(
      /empty entry in tags/
    )
  })

  it("has no tags when the field is absent", () => {
    expect(parsePost(article("publishedAt: 2026-01-01"), "es", "a.md").tags).toEqual([])
  })

  it("accepts a site-relative or http image", () => {
    expect(parsePost(article("image: /cards/a.png"), "es", "a.md").image).toBe(
      "/cards/a.png"
    )
    expect(
      parsePost(article("image: https://cdn.example.com/a.png"), "es", "a.md").image
    ).toBe("https://cdn.example.com/a.png")
  })

  /**
   * Frontmatter reaches `og:image` and `author.url`, so a hostile scheme here is
   * the same injection the markdown link parser already refuses — arriving
   * through a quieter door.
   */
  it.each(["javascript:alert(1)", "data:text/html,x", "ftp://host/a.png"])(
    "refuses %s as an image",
    (value) => {
      expect(() => parsePost(article(`image: ${value}`), "es", "a.md")).toThrow(
        /site-relative or http/
      )
    }
  )

  it("still refuses what it refused before", () => {
    expect(() => parsePost("no frontmatter", "es", "a.md")).toThrow(/no frontmatter/)
    expect(() => parsePost('---\ntitle: "T"\n', "es", "a.md")).toThrow(/unterminated/)
    expect(() => parsePost(article("not a valid line"), "es", "a.md")).toThrow(
      /malformed frontmatter line/
    )
    expect(() =>
      parsePost('---\ndescription: "D"\nslug: s\n---\n\nx\n', "es", "a.md")
    ).toThrow(/missing title/)
  })
})

/**
 * SEO-E12 — `translationOf`, and the rule that a declared translation which
 * does not exist is worse than no declaration at all.
 */
describe("translated pairs", () => {
  const post = (
    slug: string,
    locale: "en" | "es",
    translationOf: string | null = null,
    tags: string[] = []
  ): BlogPost => ({
    slug,
    locale,
    title: slug,
    description: "d",
    publishedAt: "2026-01-01",
    updatedAt: null,
    targetQuery: null,
    author: DEFAULT_AUTHOR,
    translationOf,
    tags,
    image: null,
    blocks: [],
  })

  it("resolves a pair that names itself from both sides", () => {
    const es = post("orden-del-set", "es", "set-order")
    const en = post("set-order", "en", "orden-del-set")

    expect(resolveTranslation(es, [en])?.slug).toBe("set-order")
    expect(resolveTranslation(en, [es])?.slug).toBe("orden-del-set")
  })

  /** The half-landed pair: one side claims, the other has not shipped yet. */
  it("refuses a claim the other side does not return", () => {
    const es = post("orden-del-set", "es", "set-order")
    const en = post("set-order", "en", null)

    expect(resolveTranslation(es, [en])).toBeNull()
  })

  it("refuses a claim that points at nothing", () => {
    expect(resolveTranslation(post("orden-del-set", "es", "nope"), [])).toBeNull()
  })

  it("refuses a claim pointing at an article in the same language", () => {
    expect(resolveTranslation(post("a", "es", "b"), [post("b", "es", "a")])).toBeNull()
  })

  it("resolves nothing when the article makes no claim", () => {
    expect(resolveTranslation(post("a", "es"), [post("b", "en", "a")])).toBeNull()
  })

  /**
   * The acceptance criterion for SEO-E12, stated as the thing a crawler reads:
   * a resolved pair names both URLs from both directions, plus one default.
   */
  describe("the hreflang a pair emits", () => {
    const es = post("orden-del-set", "es", "set-order")
    const en = post("set-order", "en", "orden-del-set")

    it("names both languages, from the Spanish side", () => {
      expect(alternatesFor(es, [en])).toEqual({
        es: "/es/blog/orden-del-set",
        en: "/blog/set-order",
        "x-default": "/blog/set-order",
      })
    })

    it("names both languages, from the English side", () => {
      expect(alternatesFor(en, [es])).toEqual({
        en: "/blog/set-order",
        es: "/es/blog/orden-del-set",
        "x-default": "/blog/set-order",
      })
    })

    /** x-default points at English from either side — one page, one default. */
    it("agrees on the default from either direction", () => {
      expect(alternatesFor(es, [en])["x-default"]).toBe(
        alternatesFor(en, [es])["x-default"]
      )
    })

    it("falls back to the article alone when the pair does not resolve", () => {
      const lonely = post("orden-del-set", "es", "set-order")

      expect(alternatesFor(lonely, [post("set-order", "en", null)])).toEqual({
        es: "/es/blog/orden-del-set",
      })
    })
  })

  describe("related articles", () => {
    it("prefers the article sharing the most tags", () => {
      const subject = post("subject", "es", null, ["orden", "energía"])
      const pool = [
        post("none", "es", null, ["bpm"]),
        post("one", "es", null, ["orden"]),
        post("two", "es", null, ["orden", "energía"]),
      ]

      expect(relatedPosts(subject, pool).map((p) => p.slug)).toEqual([
        "two",
        "one",
        "none",
      ])
    })

    it("matches tags case-insensitively", () => {
      const subject = post("subject", "es", null, ["Orden"])
      const pool = [post("a", "es", null, ["bpm"]), post("b", "es", null, ["orden"])]

      expect(relatedPosts(subject, pool)[0].slug).toBe("b")
    })

    /** An untagged article must still end with three things to read next. */
    it("tops up with recent articles when tags run out", () => {
      const subject = post("subject", "es")
      const pool = [post("a", "es"), post("b", "es"), post("c", "es")]

      expect(relatedPosts(subject, pool)).toHaveLength(3)
    })

    it("never offers the article being read, or another language", () => {
      const subject = post("subject", "es", null, ["orden"])

      expect(
        relatedPosts(subject, [subject, post("en-one", "en", null, ["orden"])])
      ).toEqual([])
    })
  })

  describe("tags in use", () => {
    it("lists each tag once, most used first", () => {
      expect(
        tagsInUse([
          post("a", "es", null, ["orden", "bpm"]),
          post("b", "es", null, ["Orden"]),
        ])
      ).toEqual(["orden", "bpm"])
    })

    it("is empty when nothing is tagged", () => {
      expect(tagsInUse([post("a", "es")])).toEqual([])
    })
  })
})

/** The five published articles, against the model they now carry. */
describe("the real articles under the new model", () => {
  it("gives every one of them tags, an author and a parsed body", () => {
    const posts = listPosts("es")
    expect(posts.length).toBeGreaterThan(0)

    for (const post of posts) {
      expect(post.tags.length, `${post.slug} has no tags`).toBeGreaterThan(0)
      expect(post.author).toEqual(DEFAULT_AUTHOR)
      expect(post.image).toBeNull()
      expect(post.blocks.length).toBeGreaterThan(0)
    }
  })

  /**
   * Every article is now half of a pair — SEO-E14 shipped the five English
   * translations on 22/09/2026 — so each one must declare **both** sides and an
   * `x-default`, in both directions.
   *
   * This test used to assert the opposite: that an article declared itself and
   * nothing else, because no pair existed. Its failing is what carried the news
   * that the pairs had landed, which is the direction these assertions are
   * written to point.
   *
   * What it still catches is the failure the model was built around: a
   * `translationOf` set on one side only produces **nothing** rather than a
   * broken link, so a one-sided declaration shows up here as a missing
   * language rather than as a 404 a crawler finds later.
   */
  it("declares both sides of every pair, in both directions", () => {
    const es = listPosts("es")
    const en = listPosts("en")

    expect(es.length).toBeGreaterThan(0)
    expect(en.length).toBe(es.length)

    for (const post of es) {
      const alternates = postAlternates(post)

      expect(alternates.es, post.slug).toBe(`/es/blog/${post.slug}`)
      expect(alternates.en, post.slug).toMatch(/^\/blog\//)
      // English is the site's default everywhere else, so a pair's x-default is
      // the English URL — not the article's own.
      expect(alternates["x-default"], post.slug).toBe(alternates.en)
    }

    for (const post of en) {
      const alternates = postAlternates(post)

      expect(alternates.en, post.slug).toBe(`/blog/${post.slug}`)
      expect(alternates.es, post.slug).toMatch(/^\/es\/blog\//)
      expect(alternates["x-default"], post.slug).toBe(`/blog/${post.slug}`)
    }
  })

  it("gives the English articles tags, an author and a parsed body too", () => {
    const posts = listPosts("en")
    expect(posts.length).toBeGreaterThan(0)

    for (const post of posts) {
      expect(post.tags.length, `${post.slug} has no tags`).toBeGreaterThan(0)
      expect(post.author).toEqual(DEFAULT_AUTHOR)
      expect(post.blocks.length).toBeGreaterThan(0)
    }
  })
})
