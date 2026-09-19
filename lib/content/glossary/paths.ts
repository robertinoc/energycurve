/**
 * The URLs of the glossary and the guides.
 *
 * `localizedPath` handles the fixed pages, whose Spanish slug lives in
 * `ES_SLUGS`. It cannot handle these: an entry's slug differs per language and
 * belongs to the entry, not to a table of routes — `/es/glosario/tonalidad` and
 * `/glossary/key` are the same page in two languages and neither slug can be
 * derived from the other.
 *
 * So the index path comes from `localizedPath` (it is a `LocalizedPath`) and the
 * segment comes from the entry. Both in one place, because the sitemap, the
 * metadata, the breadcrumbs and every link have to agree on them.
 */

import { localizedPath } from "@/lib/content/locale-routing"
import type { GlossaryTerm } from "@/lib/content/glossary/terms"
import type { Guide } from "@/lib/content/guides/guides"
import type { SiteLocale } from "@/lib/content/site-copy"

export function glossaryIndexPath(locale: SiteLocale): string {
  return localizedPath("/glossary", locale)
}

export function glossaryTermPath(
  term: GlossaryTerm,
  locale: SiteLocale
): string {
  return `${glossaryIndexPath(locale)}/${term.slug[locale]}`
}

export function guideIndexPath(locale: SiteLocale): string {
  return localizedPath("/guide", locale)
}

export function guidePath(guide: Guide, locale: SiteLocale): string {
  return `${guideIndexPath(locale)}/${guide.slug[locale]}`
}
