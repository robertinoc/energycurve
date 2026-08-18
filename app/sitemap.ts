import type { MetadataRoute } from "next"

import { LOCALIZED_PATHS, localizedPath } from "@/lib/content/locale-routing"
import { SITE_URL } from "@/lib/seo"

/**
 * Per-page crawl hints. Kept beside the path list rather than inlined so adding a
 * localized page can't silently ship without them.
 */
const HINTS: Record<
  (typeof LOCALIZED_PATHS)[number],
  { changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }
> = {
  "/": { changeFrequency: "weekly", priority: 1 },
  "/pricing": { changeFrequency: "monthly", priority: 0.9 },
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
  const lastModified = new Date("2026-08-17")

  return LOCALIZED_PATHS.flatMap((path) => {
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
}
