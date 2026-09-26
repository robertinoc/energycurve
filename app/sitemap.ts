import type { MetadataRoute } from "next"

import {
  indexableLocales,
  LOCALIZED_PATHS,
  localizedPath,
} from "@/lib/content/locale-routing"
import {
  allPublishedPosts,
  postAlternates,
  postUpdatedAt,
} from "@/lib/blog/posts"
import {
  glossaryTermPath,
  guidePath,
} from "@/lib/content/glossary/paths"
import { COMPARISONS } from "@/lib/content/compare/comparisons"
import { comparisonPath } from "@/lib/content/compare/paths"
import { pageLastModified } from "@/lib/content/page-metadata"
import { GLOSSARY_TERMS } from "@/lib/content/glossary/terms"
import { publishedGuides } from "@/lib/content/guides/guides"
import { supportedLocales } from "@/lib/content/site-copy"
import { SITE_URL } from "@/lib/seo"

/**
 * Per-page crawl hints. Kept beside the path list rather than inlined so adding a
 * localized page can't silently ship without them.
 */
const HINTS: Record<
  (typeof LOCALIZED_PATHS)[number],
  { changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }
> = {
  // Declaration order is emission order: keep this descending by priority.
  "/": { changeFrequency: "weekly", priority: 1 },
  "/pricing": { changeFrequency: "monthly", priority: 0.9 },
  // The free tool is the page a stranger is most likely to arrive on, so it
  // ranks with the homepage rather than with the reference pages. The hub sits
  // just under it: useful, but nobody searches for a list of tools.
  "/tools/energy-curve": { changeFrequency: "monthly", priority: 0.9 },
  // The two reference tools: useful, linked, and less likely than the analyser
  // to be the page somebody arrives on.
  "/tools/camelot-wheel": { changeFrequency: "monthly", priority: 0.8 },
  "/tools/key-bpm-compatibility": { changeFrequency: "monthly", priority: 0.8 },
  "/tools": { changeFrequency: "monthly", priority: 0.6 },
  "/blog": { changeFrequency: "weekly", priority: 0.7 },
  // The glossary index is a hub for forty-two entries and is the page most
  // likely to be the one a definition search lands on first.
  "/glossary": { changeFrequency: "monthly", priority: 0.7 },
  "/guide": { changeFrequency: "monthly", priority: 0.7 },
  "/install": { changeFrequency: "monthly", priority: 0.5 },
  // A reference page a DJ lands on from the import screen or a search for
  // "where does <tool> write energy" — it changes when a tag format is added.
  "/energy-tags": { changeFrequency: "monthly", priority: 0.5 },
  // Same shape as /energy-tags: a reference a DJ lands on from the import
  // screen or a search for "csv format for a dj playlist".
  "/import-formats": { changeFrequency: "monthly", priority: 0.5 },
  "/privacy": { changeFrequency: "yearly", priority: 0.3 },
  "/terms": { changeFrequency: "yearly", priority: 0.3 },
  "/cookie-policy": { changeFrequency: "yearly", priority: 0.3 },
  // Monthly, unlike its neighbours: a subprocessor list that changes is the
  // one legal page a reader has a reason to come back to.
  "/subprocessors": { changeFrequency: "monthly", priority: 0.3 },
}

/**
 * Adds `x-default` to a language map, for parity with the `<head>`.
 *
 * `buildAlternates` in `lib/seo.ts` has emitted `x-default` on every page since
 * the locale split; the sitemap never did, so the two halves of the same
 * declaration disagreed about whether a default existed. A crawler reconciling
 * them has no reason to prefer either.
 *
 * Points at English where English is offered, and at the only surviving language
 * where it is not — the same rule `buildAlternates` applies, because two rules
 * would eventually produce two answers.
 */
function alternateLanguages(languages: Record<string, string>) {
  const codes = Object.keys(languages)

  return {
    ...languages,
    "x-default": languages[codes.includes("en") ? "en" : codes[0]],
  }
}

/**
 * Public, indexable routes only — auth and dashboard pages stay out.
 *
 * Both languages of every page are listed, each carrying the `alternates.languages`
 * block. Listing only English would leave the Spanish URLs discoverable solely by
 * crawling, which is the slower half of the job the sitemap exists to do.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Articles, each in the one language it was written in. No `alternates` block:
  // there is no translation, and claiming one would point a crawler at a 404.
  //
  // `lastmod` is the article's own revision date, falling back to its publication
  // date — never the build. An article that hasn't been touched since August
  // should still say August after a December deploy, or `lastmod` stops meaning
  // anything and gets ignored.
  //
  // `monthly` rather than `yearly`: the five articles are being revised — the
  // two that describe the pre-#231 harmonic rule are already known to need it —
  // and `yearly` on a page we intend to edit this quarter asks a crawler to come
  // back after the change it is meant to notice.
  //
  // Since 22/09/2026 the articles carry `alternates` too, and that is new rather
  // than an omission corrected: before SEO-E14 every article existed in exactly
  // one language, so the only honest block was one naming that language — and
  // the sitemap left it out while the article's own metadata said it. Now that
  // all five are pairs, the reciprocal block belongs in both places.
  //
  // Built from `postAlternates`, which is the same function the page's metadata
  // uses. Two derivations of the same claim is how the sitemap and the page end
  // up disagreeing, and a crawler that sees them disagree trusts neither.
  const articles: MetadataRoute.Sitemap = allPublishedPosts().map((post) => ({
    url: `${SITE_URL}${localizedPath(`/blog/${post.slug}`, post.locale)}`,
    lastModified: new Date(postUpdatedAt(post)),
    changeFrequency: "monthly",
    priority: 0.6,
    alternates: {
      languages: alternateLanguages(
        Object.fromEntries(
          Object.entries(postAlternates(post)).map(([key, path]) => [
            key,
            `${SITE_URL}${path}`,
          ])
        )
      ),
    },
  }))

  // Only the languages a page is actually offered in. `/blog` is `noindex` in
  // English, so the English URL is absent and the Spanish one's `alternates`
  // names Spanish alone — a sitemap that lists a page we've asked Google not to
  // index is asking and un-asking in the same file.
  const pages: MetadataRoute.Sitemap = LOCALIZED_PATHS.flatMap((path) => {
    const offered = indexableLocales(path)
    const languages = alternateLanguages(
      Object.fromEntries(
        offered.map((locale) => [
          locale,
          `${SITE_URL}${localizedPath(path, locale)}`,
        ])
      )
    )

    return offered.map((locale) => ({
      url: `${SITE_URL}${localizedPath(path, locale)}`,
      // The page's own date, not the build's. See `PAGE_LAST_MODIFIED`.
      lastModified: pageLastModified(path),
      ...HINTS[path],
      alternates: { languages },
    }))
  })

  // Glossary entries and guides. Unlike the articles these do exist in both
  // languages, so each one carries a reciprocal `alternates` block — and unlike
  // the fixed pages their slug differs per language, which is why the URL comes
  // from the entry rather than from `ES_SLUGS`.
  const entries: MetadataRoute.Sitemap = GLOSSARY_TERMS.flatMap((term) => {
    const languages = alternateLanguages(
      Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          `${SITE_URL}${glossaryTermPath(term, locale)}`,
        ])
      )
    )

    return supportedLocales.map((locale) => ({
      url: `${SITE_URL}${glossaryTermPath(term, locale)}`,
      // The glossary's date, shared by all twenty-one entries, because that is
      // the truth: they were written and are revised as one body of copy, and
      // the index page shows every one of them. A per-entry `updatedAt` would be
      // twenty-one dates to maintain to express a fact none of them has yet —
      // that one entry changed without the others. Add the field on the day one
      // does.
      lastModified: pageLastModified("/glossary"),
      changeFrequency: "monthly" as const,
      priority: 0.5,
      alternates: { languages },
    }))
  })

  // `publishedGuides()` and not `GUIDES`: a draft guide is absent from here,
  // which is one of the three things its flag has to do. The other two are the
  // `noindex` directive and its absence from the index page.
  const guides: MetadataRoute.Sitemap = publishedGuides().flatMap((guide) => {
    const languages = alternateLanguages(
      Object.fromEntries(
        supportedLocales.map((locale) => [
          locale,
          `${SITE_URL}${guidePath(guide, locale)}`,
        ])
      )
    )

    return supportedLocales.map((locale) => ({
      url: `${SITE_URL}${guidePath(guide, locale)}`,
      lastModified: new Date(guide.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: { languages },
    }))
  })

  // The comparison pages. Same shape as the guides — both languages, reciprocal
  // `alternates`, per-language slug — with one difference worth naming: their
  // `lastModified` is `verifiedAt`, the day the competitor's pages were read.
  // On a page whose claim is "this is what they said, when", the review date is
  // the date a crawler should be told about; the day we reworded a paragraph is
  // not.
  //
  // Higher priority than the guides because these answer a buying question. The
  // keyword map counts twenty-one comparison queries against one page that
  // half-answers them.
  const comparisons: MetadataRoute.Sitemap = COMPARISONS.flatMap(
    (comparison) => {
      const languages = alternateLanguages(
        Object.fromEntries(
          supportedLocales.map((locale) => [
            locale,
            `${SITE_URL}${comparisonPath(comparison, locale)}`,
          ])
        )
      )

      return supportedLocales.map((locale) => ({
        url: `${SITE_URL}${comparisonPath(comparison, locale)}`,
        lastModified: new Date(comparison.verifiedAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: { languages },
      }))
    }
  )

  // Pages first, in priority order, then the articles — the file is read
  // top-down, so the homepage should not sit below a blog post.
  return [...pages, ...comparisons, ...entries, ...guides, ...articles]
}
