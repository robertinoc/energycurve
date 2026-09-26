import type { Comparison } from "@/lib/content/compare/comparisons"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The URLs of the comparison pages.
 *
 * **There is no index at `/compare`, on purpose.** Four pages do not need a
 * list, and lote 8 spent a task removing exactly that shape — a `/guide` index
 * that was in the sitemap, indexed, and empty. A hub earns its place by
 * answering a query of its own; "compare" does not have one, while
 * "mixed in key alternative" has five variants in `docs/seo/keyword-map.md`.
 *
 * So the base is written here rather than in `LOCALIZED_PATHS`: that table is
 * the list of pages that exist, and `/compare` is not a page. `/compare` and
 * `/es/comparar` are 404s, and the branded 404 is the right answer for a
 * directory nobody published.
 */
const BASE: Record<SiteLocale, string> = {
  en: "/compare",
  es: "/es/comparar",
}

export function comparisonBase(locale: SiteLocale): string {
  return BASE[locale]
}

export function comparisonPath(
  comparison: Comparison,
  locale: SiteLocale
): string {
  return `${BASE[locale]}/${comparison.slug[locale]}`
}

/** Both URLs of one comparison, for `hreflang` and the language toggle. */
export function comparisonAlternates(
  comparison: Comparison
): Record<SiteLocale, string> {
  return {
    en: comparisonPath(comparison, "en"),
    es: comparisonPath(comparison, "es"),
  }
}
