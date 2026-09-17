import type { Metadata } from "next"

import { NotFoundContent } from "@/components/layout/not-found-content"

/**
 * Without this the page inherited the root layout's title, so every dead link
 * produced a tab reading "EnergyCurve — DJ Set Energy Analysis & Track Order":
 * a 404 announcing itself as the marketing homepage, in the browser tab, in
 * history, and in anything that reads a title off a shared URL.
 *
 * No `robots` here on purpose. Next already emits `<meta name="robots"
 * content="noindex">` for a not-found render, and the root layout emits
 * `index, follow` after it — two contradictory directives on the same page.
 * Harmless in practice (the 404 status is what search engines act on, and the
 * more restrictive directive wins when they conflict), and adding a third would
 * not make it less confusing. Recorded in docs/qa/ux-edge-cases.md instead.
 */
export const metadata: Metadata = { title: "Page not found" }

/**
 * 404 for the English tree — a `notFound()` from an article that moved, a set
 * that belongs to someone else, a share link whose signature no longer verifies.
 *
 * English, not the locale cookie, and that is load-bearing rather than a
 * simplification. `/blog/[slug]` is statically generated, and a static page that
 * reads a cookie while rendering its 404 fails at request time with "page
 * changed from static to dynamic" — a 500 where a 404 belongs. The bilingual
 * case that justified reading the cookie is the dashboard, which is entirely
 * dynamic and has kept its own not-found.tsx all along; that one still reads it.
 */
export default function NotFound() {
  return <NotFoundContent locale="en" />
}
