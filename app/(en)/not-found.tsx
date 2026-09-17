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
 * 404 for the English tree — a share link whose signature no longer verifies, a
 * set that belongs to someone else.
 *
 * English because the URL is English, not because the visitor must be. The
 * language toggle writes a cookie that the dashboard and every transactional
 * email honour, and reading it here was tried: it cannot be done safely. Almost
 * every page in this tree is statically rendered, and a static page that reads a
 * cookie while rendering its 404 fails at request time with "page changed from
 * static to dynamic" — a 500 where a 404 belongs. Adding a boundary per static
 * route to dodge that is a rule nobody will remember the next time a route is
 * added, and the failure is a 500 in production.
 *
 * So the 404 speaks the language of the address that produced it: `/es/…` gets
 * Spanish from its own tree, everything else gets English. The place a signed-in
 * Spanish speaker actually lives is the dashboard, which is fully dynamic and
 * keeps reading the cookie in its own not-found.tsx.
 */
export default function NotFound() {
  return <NotFoundContent locale="en" />
}
