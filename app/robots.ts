import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/seo"

/**
 * Marketing surfaces are crawlable; everything behind auth (or that only makes
 * sense for a signed-in session) is not.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/backstage",
          "/backstage/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/account-suspended",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
