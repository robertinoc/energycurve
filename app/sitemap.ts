import type { MetadataRoute } from "next"

import { LOCALIZED_PATHS, localizedPath } from "@/lib/content/locale-routing"
import { allPublishedPosts } from "@/lib/blog/posts"
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
  "/blog": { changeFrequency: "weekly", priority: 0.7 },
  "/install": { changeFrequency: "monthly", priority: 0.5 },
  "/privacy": { changeFrequency: "yearly", priority: 0.3 },
  "/terms": { changeFrequency: "yearly", priority: 0.3 },
  "/cookie-policy": { changeFrequency: "yearly", priority: 0.3 },
}

/**
 * Public, indexable routes only — auth and dashboard pages stay out.
 *
 * Both languages of every page are listed, each carrying the `alternates.languages`
 * block. Listing only English would leave the Spanish URLs discoverable solely by
 * crawling, which is the slower half of the job the sitemap exists to do.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-20")

  // Articles, each in the one language it was written in. No `alternates` block:
  // there is no translation, and claiming one would point a crawler at a 404.
  const articles: MetadataRoute.Sitemap = allPublishedPosts().map((post) => ({
    url: `${SITE_URL}${localizedPath(`/blog/${post.slug}`, post.locale)}`,
    lastModified: new Date(post.publishedAt!),
    changeFrequency: "yearly",
    priority: 0.6,
  }))

  const pages: MetadataRoute.Sitemap = LOCALIZED_PATHS.flatMap((path) => {
    const languages = {
      en: `${SITE_URL}${localizedPath(path, "en")}`,
      es: `${SITE_URL}${localizedPath(path, "es")}`,
    }

    return (["en", "es"] as const).map((locale) => ({
      url: languages[locale],
      lastModified,
      ...HINTS[path],
      alternates: { languages },
    }))
  })

  // Pages first, in priority order, then the articles — the file is read
  // top-down, so the homepage should not sit below a blog post.
  return [...pages, ...articles]
}
