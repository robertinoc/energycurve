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
 *
 * `/blog` is the index, which exists in both languages because its chrome is
 * translated. Individual articles are NOT here: they exist in the language they
 * were written in and nothing else, so they carry a self-canonical and no
 * `hreflang` pair. Advertising an English translation of a Spanish-only article
 * would point a crawler at a 404, which is worse than offering no alternate.
 */
export const LOCALIZED_PATHS = [
  "/",
  "/pricing",
  "/tools",
  "/tools/energy-curve",
  "/tools/camelot-wheel",
  "/tools/key-bpm-compatibility",
  "/blog",
  "/install",
  "/energy-tags",
  "/import-formats",
  "/privacy",
  "/terms",
  "/cookie-policy",
  "/subprocessors",
] as const

export type LocalizedPath = (typeof LOCALIZED_PATHS)[number]

/**
 * Spanish URLs for the pages whose Spanish slug is not the English one.
 *
 * Every page above this line has the same slug in both languages — `/pricing`
 * and `/es/pricing` — which is why the whole model was once "prefix with /es".
 * That worked because those slugs are product nouns a Spanish-speaking DJ types
 * in English anyway.
 *
 * The tools are the first pages where it stops working. They exist to be found
 * by someone searching "curva de energía dj", and a Spanish page living at
 * `/es/tools/energy-curve` throws away the words the search is made of — on the
 * one page whose entire job is to be found. So the path a page is *known by*
 * stays English (it is an identifier, and it keeps this table readable), and the
 * URL it is *served at* comes from here.
 *
 * Keys are LocalizedPath; anything absent falls through to the English slug.
 */
const ES_SLUGS: Partial<Record<LocalizedPath, string>> = {
  "/tools": "/herramientas",
  "/tools/energy-curve": "/herramientas/curva-de-energia",
  "/tools/camelot-wheel": "/herramientas/rueda-camelot",
  "/tools/key-bpm-compatibility":
    "/herramientas/compatibilidad-tonalidad-bpm",
}

/** The reverse table, so a Spanish URL can be read back to its path. */
const ES_SLUGS_REVERSED = new Map(
  Object.entries(ES_SLUGS).map(([path, slug]) => [slug, path])
)

/**
 * Pages that exist in a language but should not be indexed in it.
 *
 * `/blog` in English is the only one, and it is here rather than deleted because
 * the page is genuinely useful: it says, in English, that the articles are in
 * Spanish and links to them. What it is not is a search result. It has no
 * articles, so it competes with `/es/blog` for the same queries while answering
 * none of them, and an empty index is the kind of page that drags a small site's
 * whole assessment down.
 *
 * `noindex, follow` rather than `noindex, nofollow`: a crawler that lands here
 * should still walk through to the Spanish articles. Being listed here has three
 * consequences, all of them applied from this one entry — the page emits a
 * `noindex` directive, it is left out of the sitemap, and no other page
 * advertises it as an `hreflang` alternate.
 */
const NOINDEX_PAGES: ReadonlyArray<`${SiteLocale}:${LocalizedPath}`> = [
  "en:/blog",
]

/** Whether this page, in this language, should be offered to a search engine. */
export function isIndexable(path: LocalizedPath, locale: SiteLocale): boolean {
  return !NOINDEX_PAGES.includes(`${locale}:${path}`)
}

/**
 * The languages of `path` that are worth advertising — the ones an `hreflang`
 * set and the sitemap should mention.
 *
 * Pointing `hreflang="en"` at a page we have asked Google not to index is a
 * contradiction, and the crawler resolves it by trusting neither half.
 */
export function indexableLocales(path: LocalizedPath): SiteLocale[] {
  return (["en", PREFIXED_LOCALE] as const).filter((locale) =>
    isIndexable(path, locale)
  )
}

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

  // A translated slug where there is one — see ES_SLUGS. Paths that aren't
  // localized pages (a blog article, say) simply aren't in the table.
  const slug = ES_SLUGS[normalized as LocalizedPath] ?? normalized

  return slug === "/" ? LOCALE_PREFIX : `${LOCALE_PREFIX}${slug}`
}

/**
 * Splits a request pathname into the locale it encodes and the path underneath.
 *
 * `/es/pricing`      → `{ locale: "es", path: "/pricing" }`
 * `/es/herramientas` → `{ locale: "es", path: "/tools" }` (see ES_SLUGS)
 * `/es`              → `{ locale: "es", path: "/" }`
 * `/pricing`         → `{ locale: "en", path: "/pricing" }`
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
    const slug = pathname.slice(LOCALE_PREFIX.length)

    return {
      locale: PREFIXED_LOCALE,
      // Back through ES_SLUGS, so `/es/herramientas` reads as `/tools` rather
      // than as a path nothing else in the app has heard of.
      path: ES_SLUGS_REVERSED.get(slug) ?? slug,
    }
  }

  return { locale: "en", path: pathname || "/" }
}

/** Whether this pathname is served by the Spanish route subtree. */
export function isPrefixedLocalePath(pathname: string): boolean {
  return splitLocalePath(pathname).locale === PREFIXED_LOCALE
}
