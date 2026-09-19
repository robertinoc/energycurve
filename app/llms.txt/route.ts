import { listPosts, postUpdatedAt } from "@/lib/blog/posts"
import { GLOSSARY_TERMS } from "@/lib/content/glossary/terms"
import { glossaryTermPath, guidePath } from "@/lib/content/glossary/paths"
import { publishedGuides } from "@/lib/content/guides/guides"
import { localizedPath, type LocalizedPath } from "@/lib/content/locale-routing"
import { PAGE_METADATA, pageMetadata } from "@/lib/content/page-metadata"
import { getSiteCopy } from "@/lib/content/site-copy"
import { OPERATING_COMPANY, SITE_URL } from "@/lib/seo"

/**
 * `/llms.txt` — what this site is, for a model reading it rather than a person.
 *
 * SEO-E24. The format is the `llms.txt` convention: an H1, a one-line summary as
 * a blockquote, prose that sets the context, then H2 sections of annotated
 * links. A crawler that wants the whole site still has `/sitemap.xml`; this file
 * exists because 78 URLs with no annotation is a worse answer to "what is
 * EnergyCurve" than 30 with one line each.
 *
 * **Generated, never typed.** Every title, description, price and slug below is
 * read from the same objects the pages render from — `PAGE_METADATA`, the
 * glossary registry, `publishedGuides()`, `listPosts()`, `getSiteCopy()`. A
 * hand-written `llms.txt` is a second copy of the site's claims that nobody
 * opens again, and it starts being wrong the first time a page is edited. This
 * one cannot disagree with the site, because it has no text of its own to
 * disagree with.
 *
 * English, because the plan makes English the global default and this is a file
 * read by machines rather than by a Spanish-speaking DJ. Every page listed has a
 * Spanish twin, which the "In Spanish" section says once rather than doubling
 * every line.
 */

/** Static: nothing here is per-request, so it is prerendered like the sitemap. */
export const dynamic = "force-static"

/** `- [title](url): description` — the shape the convention asks for. */
function entry(title: string, url: string, description: string): string {
  return `- [${title}](${url}): ${description}`
}

/** One line per localized page, in English, from the same table the pages use. */
function pageEntry(path: LocalizedPath): string {
  const { title, description } = pageMetadata(path, "en")

  return entry(title, `${SITE_URL}${localizedPath(path, "en")}`, description)
}

function section(heading: string, lines: string[]): string[] {
  // An empty section is worse than an absent one: it reads as "we have none of
  // these" when the truth is usually "not yet". Today that is the guides.
  return lines.length > 0 ? [`## ${heading}`, "", ...lines, ""] : []
}

export function GET() {
  const copy = getSiteCopy("en")

  // Spanish, because that is the only language the articles exist in. Saying so
  // is the point — a model that lists them as English pages will quote them as
  // English pages.
  const articles = listPosts("es")

  const body = [
    "# EnergyCurve",
    "",
    `> ${PAGE_METADATA["/"].description.en}`,
    "",
    // The line that separates us from the tool every DJ already owns. It is the
    // site's own words, from the landing's differentiation block.
    copy.diff.body,
    "",
    `EnergyCurve is operated by ${OPERATING_COMPANY.name} (${OPERATING_COMPANY.url}); payments and receipts read "${OPERATING_COMPANY.name}".`,
    "",

    ...section("Start here", [
      pageEntry("/"),
      pageEntry("/pricing"),
      pageEntry("/tools/energy-curve"),
    ]),

    ...section("Free tools, no account", [
      pageEntry("/tools"),
      pageEntry("/tools/camelot-wheel"),
      pageEntry("/tools/key-bpm-compatibility"),
    ]),

    // The two pages that answer the questions a DJ has before exporting a
    // playlist, and the two most quotable pages on the site.
    ...section("Reference", [
      pageEntry("/energy-tags"),
      pageEntry("/import-formats"),
      pageEntry("/install"),
    ]),

    ...section("Guides", [
      ...(publishedGuides().length > 0 ? [pageEntry("/guide")] : []),
      ...publishedGuides().map((guide) =>
        entry(
          guide.title.en,
          `${SITE_URL}${guidePath(guide, "en")}`,
          guide.description.en
        )
      ),
    ]),

    ...section("Glossary", [
      pageEntry("/glossary"),
      ...GLOSSARY_TERMS.map((term) =>
        entry(
          term.title.en,
          `${SITE_URL}${glossaryTermPath(term, "en")}`,
          term.short.en
        )
      ),
    ]),

    ...section("Articles (Spanish)", [
      entry(
        PAGE_METADATA["/blog"].title.es,
        `${SITE_URL}${localizedPath("/blog", "es")}`,
        PAGE_METADATA["/blog"].description.es
      ),
      ...articles.map((post) =>
        entry(
          post.title,
          `${SITE_URL}${localizedPath(`/blog/${post.slug}`, "es")}`,
          `${post.description} (updated ${postUpdatedAt(post)})`
        )
      ),
    ]),

    ...section("In Spanish", [
      "Every page above except the articles has a Spanish twin under `/es`; the articles are Spanish-only and have no English translation yet.",
      entry(
        PAGE_METADATA["/"].title.es,
        `${SITE_URL}${localizedPath("/", "es")}`,
        PAGE_METADATA["/"].description.es
      ),
      entry(
        PAGE_METADATA["/glossary"].title.es,
        `${SITE_URL}${localizedPath("/glossary", "es")}`,
        PAGE_METADATA["/glossary"].description.es
      ),
    ]),

    ...section("Legal", [
      pageEntry("/privacy"),
      pageEntry("/terms"),
      pageEntry("/cookie-policy"),
      pageEntry("/subprocessors"),
    ]),
  ].join("\n")

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
