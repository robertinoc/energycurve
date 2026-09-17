import type { Metadata } from "next"

import { NotFoundContent } from "@/components/layout/not-found-content"
import { getRequestLocale } from "@/lib/server-locale"

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
 * Reads the language the visitor chose, because an English URL is not an
 * English-only audience: `/c/[token]` is a link a DJ sends to a client, and the
 * toggle writes the same cookie the dashboard and every transactional email
 * already honour.
 *
 * Safe here only because every statically prerendered route that can 404 has its
 * own boundary closer to it — `blog/not-found.tsx` beside the articles. A static
 * page that reads the request while rendering its 404 fails with "page changed
 * from static to dynamic", which is a 500 where a 404 belongs.
 */
export default async function NotFound() {
  return <NotFoundContent locale={await getRequestLocale()} />
}
