import { describe, expect, it } from "vitest"

import { GET as llmsTxt } from "@/app/llms.txt/route"
import { allPublishedPosts, listPosts } from "@/lib/blog/posts"
import { articleCardPath, articleCardUrl } from "@/lib/blog/social-card"
import { buildArticleStructuredData } from "@/lib/blog/structured-data"
import { ENERGY_TAGS_FAQ } from "@/lib/content/energy-tags-copy"
import { GLOSSARY_TERMS } from "@/lib/content/glossary/terms"
import { IMPORT_FORMATS_FAQ } from "@/lib/content/import-formats-copy"
import { buildInstallStructuredData } from "@/lib/content/install-structured-data"
import { localizedPath } from "@/lib/content/locale-routing"
import { PAGE_METADATA } from "@/lib/content/page-metadata"
import { buildReferenceStructuredData } from "@/lib/content/reference-structured-data"
import { getSiteCopy, supportedLocales } from "@/lib/content/site-copy"
import { SITE_URL } from "@/lib/seo"

type Node = Record<string, unknown>

function nodeOfType(graph: Node[], type: string): Node {
  const node = graph.find((entry) => entry["@type"] === type)
  expect(node, `expected a ${type} node`).toBeDefined()
  return node as Node
}

function questionsOf(graph: Node[]): { name: string; answer: string }[] {
  const faq = nodeOfType(graph, "FAQPage")

  return (faq.mainEntity as Node[]).map((question) => ({
    name: question.name as string,
    answer: (question.acceptedAnswer as Node).text as string,
  }))
}

/**
 * SEO-E19 — the two reference pages.
 *
 * The property being defended is that the markup cannot say anything the page
 * does not. The tests therefore compare the graph against the copy arrays the
 * components render, rather than against strings written here.
 */
describe("the reference pages' structured data", () => {
  const pages = [
    ["/energy-tags", ENERGY_TAGS_FAQ],
    ["/import-formats", IMPORT_FORMATS_FAQ],
  ] as const

  it.each(pages)("publishes TechArticle, FAQPage and breadcrumbs on %s", (path) => {
    for (const locale of supportedLocales) {
      const graph = buildReferenceStructuredData(path, locale)[
        "@graph"
      ] as Node[]

      const article = nodeOfType(graph, "TechArticle")

      expect(article.url).toBe(`${SITE_URL}${localizedPath(path, locale)}`)
      expect(article.inLanguage).toBe(locale)
      expect(article.headline).toBe(PAGE_METADATA[path].title[locale])
      expect(article.description).toBe(PAGE_METADATA[path].description[locale])
      // A content date, not a build clock — see SEO-E09.
      expect(article.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      expect(nodeOfType(graph, "BreadcrumbList").itemListElement).toHaveLength(2)
    }
  })

  it.each(pages)(
    "builds %s's FAQ schema from the copy the page renders",
    (path, faq) => {
      // Four questions is the acceptance criterion, and a page with three would
      // otherwise pass every other assertion here.
      expect(faq).toHaveLength(4)

      for (const locale of supportedLocales) {
        const graph = buildReferenceStructuredData(path, locale)[
          "@graph"
        ] as Node[]

        expect(questionsOf(graph)).toEqual(
          faq.map((entry) => ({
            name: entry.question[locale],
            answer: entry.answer[locale],
          }))
        )
      }
    }
  )

  it.each(pages)("writes both languages of every %s answer", (_path, faq) => {
    for (const entry of faq) {
      for (const locale of supportedLocales) {
        expect(entry.question[locale].trim()).not.toBe("")
        expect(entry.answer[locale].trim()).not.toBe("")
      }
      // Untranslated copy is the failure this catches: the same string in both
      // languages means somebody filled one in and copied it across.
      expect(entry.question.en).not.toBe(entry.question.es)
      expect(entry.answer.en).not.toBe(entry.answer.es)
    }
  })
})

/**
 * SEO-E20 — `/install`.
 *
 * The decision worth pinning is that there are two `HowTo` entities. One graph
 * holding eight steps would describe a single procedure that starts in Chrome
 * and finishes in Safari.
 */
describe("the install page's structured data", () => {
  it.each(supportedLocales)("publishes one HowTo per platform (%s)", (locale) => {
    const graph = buildInstallStructuredData(locale)["@graph"] as Node[]
    const howTos = graph.filter((node) => node["@type"] === "HowTo")
    const copy = getSiteCopy(locale).install

    expect(howTos).toHaveLength(2)

    const [android, ios] = howTos

    expect(android.name).toBe(copy.androidTitle)
    expect(ios.name).toBe(copy.iosTitle)

    // Steps are the page's steps, in the page's order.
    expect((android.step as Node[]).map((step) => step.text)).toEqual(
      copy.androidSteps
    )
    expect((ios.step as Node[]).map((step) => step.text)).toEqual(copy.iosSteps)

    for (const howTo of howTos) {
      const steps = howTo.step as Node[]
      expect(steps.length).toBeGreaterThan(0)
      expect(steps.map((step) => step.position)).toEqual(
        steps.map((_step, index) => index + 1)
      )
    }
  })

  it.each(supportedLocales)(
    "derives the install FAQ from the rendered copy (%s)",
    (locale) => {
      const graph = buildInstallStructuredData(locale)["@graph"] as Node[]
      const faq = getSiteCopy(locale).install.faq

      expect(faq).toHaveLength(3)
      expect(questionsOf(graph)).toEqual(
        faq.map((entry) => ({
          name: entry.question[locale],
          answer: entry.answer[locale],
        }))
      )
    }
  )

  /**
   * The offline answer is the one that could quietly become a lie. The service
   * worker in `public/sw.js` caches Gig Mode navigations and hashed assets and
   * nothing else, so the page must not promise the app works offline.
   */
  it("does not claim the whole app works offline", () => {
    const answer = getSiteCopy("en").install.faq[0].answer.en.toLowerCase()

    expect(answer).toContain("gig mode")
    expect(answer).toContain("needs a connection")
  })
})

/**
 * SEO-E18 — one card per article.
 */
describe("per-article social cards", () => {
  it("gives every published article its own card URL", () => {
    const urls = allPublishedPosts().map((post) => articleCardUrl(post))

    expect(urls.length).toBeGreaterThan(0)
    expect(new Set(urls).size).toBe(urls.length)

    for (const post of allPublishedPosts()) {
      expect(articleCardUrl(post)).toBe(
        `${SITE_URL}${articleCardPath(post.locale, post.slug)}`
      )
      // The locale is in the path because a slug is only unique within one.
      expect(articleCardPath(post.locale, post.slug)).toContain(
        `/${post.locale}/`
      )
    }
  })

  it("puts the same card in the JSON-LD as in the page metadata", () => {
    for (const post of allPublishedPosts()) {
      const graph = buildArticleStructuredData(post, "2026-09-19")[
        "@graph"
      ] as Node[]

      expect(nodeOfType(graph, "BlogPosting").image).toBe(articleCardUrl(post))
    }
  })
})

/**
 * SEO-E24 — `llms.txt`.
 *
 * Generated from the same registries the pages render from, so the test that
 * matters is that the file's contents track those registries rather than a
 * hand-written list that happens to agree with them today.
 */
describe("llms.txt", () => {
  async function body(): Promise<string> {
    return await llmsTxt().text()
  }

  it("is served as plain text", async () => {
    const response = llmsTxt()

    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8"
    )
  })

  it("opens with the name, the summary and the contrast line", async () => {
    const text = await body()

    expect(text.startsWith("# EnergyCurve\n")).toBe(true)
    expect(text).toContain(`> ${PAGE_METADATA["/"].description.en}`)
    // The line that separates us from the tool every DJ already owns, taken
    // from the landing rather than retyped here.
    expect(text).toContain(getSiteCopy("en").diff.body)
    expect(text).toContain("StageLink LLC")
  })

  it("lists the pages a reader is most likely to be sent to", async () => {
    const text = await body()

    for (const path of [
      "/pricing",
      "/energy-tags",
      "/import-formats",
      "/tools/energy-curve",
      "/glossary",
    ] as const) {
      expect(text, `${path} is missing`).toContain(
        `${SITE_URL}${localizedPath(path, "en")}`
      )
      expect(text).toContain(PAGE_METADATA[path].title.en)
    }
  })

  it("lists every glossary term and every published article", async () => {
    const text = await body()

    for (const term of GLOSSARY_TERMS) {
      expect(text, `${term.id} is missing`).toContain(term.title.en)
    }

    for (const post of listPosts("es")) {
      expect(text, `${post.slug} is missing`).toContain(
        `${SITE_URL}${localizedPath(`/blog/${post.slug}`, "es")}`
      )
    }
  })

  /**
   * The articles are Spanish-only. A model that lists them as English pages
   * will quote them as English pages, so the file says which is which.
   */
  it("says the articles are Spanish and the rest is mirrored", async () => {
    const text = await body()

    expect(text).toContain("## Articles (Spanish)")
    expect(text).toContain("Spanish twin")
  })

  /**
   * An empty section reads as "we have none of these" when the truth is "not
   * yet". There is no published guide today, so there must be no Guides
   * heading; when the first one lands, this flips on its own.
   */
  it("omits a section rather than shipping an empty one", async () => {
    const text = await body()

    for (const heading of text.matchAll(/^## (.+)$/gm)) {
      const section = text.split(heading[0])[1].split("\n## ")[0]

      expect(
        section.trim().length,
        `section "${heading[1]}" is empty`
      ).toBeGreaterThan(0)
    }
  })
})
