import type { MetadataRoute } from "next"

import {
  indexableLocales,
  LOCALIZED_PATHS,
  localizedPath,
} from "@/lib/content/locale-routing"
import { allPublishedPosts, postUpdatedAt } from "@/lib/blog/posts"
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
  "/tools": { changeFrequency: "monthly", priority: 0.6 },
  "/blog": { changeFrequency: "weekly", priority: 0.7 },
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
 * Public, indexable routes only — auth and dashboard pages stay out.
 *
 * Both languages of every page are listed, each carrying the `alternates.languages`
 * block. Listing only English would leave the Spanish URLs discoverable solely by
 * crawling, which is the slower half of the job the sitemap exists to do.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Evaluated when the sitemap is generated, which for these pages is the build
  // — i.e. the last time the site actually changed. It used to be a frozen
  // literal, which meant every deploy after the day it was written told crawlers
  // nothing had moved. The articles do better than this (see below); a marketing
  // page has no equivalent per-page date short of reading git history, which a
  // shallow CI clone doesn't reliably have.
  const lastModified = new Date()

  // Articles, each in the one language it was written in. No `alternates` block:
  // there is no translation, and claiming one would point a crawler at a 404.
  //
  // `lastmod` is the article's own revision date, falling back to its publication
  // date — never the build. An article that hasn't been touched since August
  // should still say August after a December deploy, or `lastmod` stops meaning
  // anything and gets ignored.
  const articles: MetadataRoute.Sitemap = allPublishedPosts().map((post) => ({
    url: `${SITE_URL}${localizedPath(`/blog/${post.slug}`, post.locale)}`,
    lastModified: new Date(postUpdatedAt(post)),
    changeFrequency: "yearly",
    priority: 0.6,
  }))

  // Only the languages a page is actually offered in. `/blog` is `noindex` in
  // English, so the English URL is absent and the Spanish one's `alternates`
  // names Spanish alone — a sitemap that lists a page we've asked Google not to
  // index is asking and un-asking in the same file.
  const pages: MetadataRoute.Sitemap = LOCALIZED_PATHS.flatMap((path) => {
    const offered = indexableLocales(path)
    const languages = Object.fromEntries(
      offered.map((locale) => [locale, `${SITE_URL}${localizedPath(path, locale)}`])
    )

    return offered.map((locale) => ({
      url: `${SITE_URL}${localizedPath(path, locale)}`,
      lastModified,
      ...HINTS[path],
      alternates: { languages },
    }))
  })

  // Pages first, in priority order, then the articles — the file is read
  // top-down, so the homepage should not sit below a blog post.
  return [...pages, ...articles]
}
