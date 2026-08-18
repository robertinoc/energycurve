/**
 * Where each language lives, as URLs.
 *
 * Until now the site had exactly one set of URLs and picked a language on the
 * client from `localStorage`. That works for a human and is invisible to
 * everything else: the server always rendered English, so the Spanish copy — a
 * full translation of every marketing page — could not be indexed, linked, or
 * quoted by an answer engine. Our own AEO baseline named Spanish as the most
 * winnable space while the Spanish site had no address to win with.
 *
 * English stays at the root and Spanish gets an `/es` prefix. That asymmetry is
 * deliberate: the existing English URLs are the ones already linked and measured,
 * and moving them to `/en` would invalidate every one of them for a cosmetic
 * symmetry.
 *
 * Pure and dependency-free so both the server (metadata, sitemap, middleware)
 * and the client (links, language toggle) compute the same answer.
 */

import type { SiteLocale } from "@/lib/content/site-copy"

/** The one prefixed locale. English is the unprefixed default. */
export const PREFIXED_LOCALE = "es" as const

/** `/es` — the segment itself, without a trailing slash. */
export const LOCALE_PREFIX = `/${PREFIXED_LOCALE}`

/**
 * The marketing pages that exist in both languages, and therefore the only ones
 * that get an `/es` twin, `hreflang` tags, and sitemap entries.
 *
 * Auth screens and the dashboard are deliberately absent: they are behind or
 * beside the funnel, are not indexable, and translating their URLs would double
 * the auth surface for no reach.
 */
export const LOCALIZED_PATHS = [
  "/",
  "/pricing",
  "/install",
  "/privacy",
  "/terms",
  "/cookie-policy",
] as const

export type LocalizedPath = (typeof LOCALIZED_PATHS)[number]

/**
 * The URL for `path` in `locale`.
 *
 * `localizedPath("/pricing", "es")` → `/es/pricing`
 * `localizedPath("/", "es")` → `/es` (not `/es/`, which would be a second URL
 * for the same page and a duplicate-content report waiting to happen)
 */
export function localizedPath(path: string, locale: SiteLocale): string {
  const normalized = path.startsWith("/") ? path : `/${path}`

  if (locale !== PREFIXED_LOCALE) {
    return normalized
  }

  return normalized === "/" ? LOCALE_PREFIX : `${LOCALE_PREFIX}${normalized}`
}

/**
 * Splits a request pathname into the locale it encodes and the path underneath.
 *
 * `/es/pricing` → `{ locale: "es", path: "/pricing" }`
 * `/es`         → `{ locale: "es", path: "/" }`
 * `/pricing`    → `{ locale: "en", path: "/pricing" }`
 *
 * Matching is per **segment**, so `/estudio` stays English rather than being read
 * as `/es` + `tudio`.
 */
export function splitLocalePath(pathname: string): {
  locale: SiteLocale
  path: string
} {
  if (pathname === LOCALE_PREFIX || pathname === `${LOCALE_PREFIX}/`) {
    return { locale: PREFIXED_LOCALE, path: "/" }
  }

  if (pathname.startsWith(`${LOCALE_PREFIX}/`)) {
    return {
      locale: PREFIXED_LOCALE,
      path: pathname.slice(LOCALE_PREFIX.length),
    }
  }

  return { locale: "en", path: pathname || "/" }
}

/** Whether this pathname is served by the Spanish route subtree. */
export function isPrefixedLocalePath(pathname: string): boolean {
  return splitLocalePath(pathname).locale === PREFIXED_LOCALE
}
