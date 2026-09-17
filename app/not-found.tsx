import type { Metadata } from "next"

import { NotFoundContent } from "@/components/layout/not-found-content"
import { SiteHtml } from "@/components/layout/site-html"
import { SITE_URL } from "@/lib/seo"
import "./globals.css"

/**
 * `metadataBase` is repeated here because this file is the one page in the app
 * with no root layout to inherit it from — without it Next resolves social
 * images against localhost and says so at build time.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Page not found | EnergyCurve",
}

/**
 * The 404 of last resort: a URL that matched no route, and the fallback Next
 * reaches for when a statically generated route calls `notFound()`.
 *
 * This is the one page that has to render its own `<html>`. A `notFound()`
 * inside a route normally resolves to the `not-found.tsx` in that route's tree
 * and inherits that tree's root layout; this file is reached when there is no
 * such tree, so Next renders it bare. Before it existed, that case fell through
 * to Next's built-in 404 — black on white, English only, nothing that says
 * EnergyCurve — which is exactly the regression the branded 404 was written to
 * fix, reintroduced by splitting the root layout in two.
 *
 * **Nothing here may read a cookie, a header, or the URL.** `/blog/[slug]` and
 * `/es/blog/[slug]` are statically generated, and Next routes their runtime
 * 404s through this file: one `cookies()` call turns a 404 into a 500 with
 * "page changed from static to dynamic at runtime", which is how this page
 * spent its first draft. So the language is English — the unprefixed default and
 * the site's `x-default` — rather than the visitor's stored preference. A
 * dynamic surface that can do better already does: the dashboard keeps its own
 * not-found.tsx and still reads the cookie.
 */
export default function GlobalNotFound() {
  return (
    <SiteHtml lang="en">
      <NotFoundContent locale="en" />
    </SiteHtml>
  )
}
