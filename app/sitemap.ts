import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/seo"

/** Public, indexable routes only — auth and dashboard pages stay out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-12")

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/install`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/cookie-policy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]
}
