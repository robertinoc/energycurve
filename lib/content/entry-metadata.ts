/**
 * Metadata for the pages whose slug is data rather than a route.
 *
 * `marketingMetadata` covers the fixed pages: it takes a `LocalizedPath`, and
 * everything it needs — title, description, canonical, hreflang, robots — is
 * reachable from that one value. A glossary entry and a guide are not
 * `LocalizedPath`s and never will be, so this is the same job done from the
 * entry itself.
 *
 * Two things differ from the blog's articles, and both are deliberate:
 *
 * - **The hreflang set is reciprocal.** An article exists in the language it was
 *   written in, so it names only itself. These exist in both, so each names the
 *   other and an `x-default` — pointing at English, as `buildAlternates` does.
 * - **A draft is `noindex`.** `NOINDEX_PAGES` is typed over `LocalizedPath` and
 *   cannot hold a `[slug]` route, so the flag travels with the guide and is
 *   applied here.
 */

import type { Metadata } from "next"

import { glossaryTermPath, guidePath } from "@/lib/content/glossary/paths"
import { supportedLocales, type SiteLocale } from "@/lib/content/site-copy"
import type { GlossaryTerm } from "@/lib/content/glossary/terms"
import type { Comparison } from "@/lib/content/compare/comparisons"
import { comparisonPath } from "@/lib/content/compare/paths"
import type { Guide } from "@/lib/content/guides/guides"
import {
  openGraphLocale,
  SITE_URL,
  socialImages,
} from "@/lib/seo"

/** Both languages, plus `x-default` on English — the site's existing convention. */
function reciprocalLanguages(path: (locale: SiteLocale) => string) {
  return Object.fromEntries([
    ...supportedLocales.map((locale) => [locale, path(locale)]),
    ["x-default", path("en")],
  ])
}

function entryMetadata({
  title,
  description,
  path,
  locale,
  type,
  noindex = false,
  modifiedTime,
}: {
  title: string
  description: string
  path: (locale: SiteLocale) => string
  locale: SiteLocale
  type: "article" | "website"
  noindex?: boolean
  modifiedTime?: string
}): Metadata {
  const url = `${SITE_URL}${path(locale)}`
  const socialTitle = `EnergyCurve — ${title}`

  return {
    title,
    description,
    /**
     * Spread rather than a ternary with `undefined`, for the reason
     * `marketingMetadata` documents: Next treats a key that is present and
     * undefined as an override, which silently strips the root layout's
     * `index, follow` and its whole `googleBot` block.
     */
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    /**
     * Relative, like `buildAlternates` — Next resolves both against
     * `metadataBase`. Mixing the two forms is how one page ends up with an
     * absolute canonical and a relative hreflang that disagree after a domain
     * move.
     */
    alternates: noindex
      ? // A page asked out of the index does not belong in an hreflang cluster
        // in either direction. Canonical only.
        { canonical: path(locale) }
      : { canonical: path(locale), languages: reciprocalLanguages(path) },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: "EnergyCurve",
      type,
      ...(modifiedTime ? { modifiedTime } : {}),
      locale: openGraphLocale(locale),
      images: socialImages(locale),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: socialImages(locale),
    },
  }
}

export function glossaryTermMetadata(
  term: GlossaryTerm,
  locale: SiteLocale
): Metadata {
  return entryMetadata({
    title: term.title[locale],
    description: term.description[locale],
    path: (code) => glossaryTermPath(term, code),
    locale,
    type: "article",
  })
}

export function guideMetadata(guide: Guide, locale: SiteLocale): Metadata {
  return entryMetadata({
    title: guide.title[locale],
    description: guide.description[locale],
    path: (code) => guidePath(guide, code),
    locale,
    type: "article",
    noindex: Boolean(guide.draft),
    modifiedTime: guide.updatedAt,
  })
}

/**
 * A comparison page's metadata.
 *
 * `type: "article"` like the guides, and `modifiedTime` is the date the
 * competitor's pages were read rather than the date we edited the copy — on a
 * page whose whole claim is "this is what they said, when", the review date is
 * the one that means something.
 */
export function comparisonMetadata(
  comparison: Comparison,
  locale: SiteLocale
): Metadata {
  return entryMetadata({
    title: comparison.title[locale],
    description: comparison.description[locale],
    path: (code) => comparisonPath(comparison, code),
    locale,
    type: "article",
    modifiedTime: comparison.verifiedAt,
  })
}
