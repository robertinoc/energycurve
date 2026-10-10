import Link from "next/link"

import { articleLinkFor } from "@/lib/blog/posts"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * A link to a blog article listed by its Spanish slug, in the reader's language
 * when a translation exists (lote 19).
 *
 * Used by the glossary, the guides and the energy-curve tool, which used to
 * write the same anchor three times — and the tool's copy had dropped the
 * "(en español)" marker the other two carried. When the target is still the
 * Spanish original, the marker and `hrefLang` say so.
 */
export function ArticleLink({
  slug,
  label,
  locale,
  className,
}: {
  slug: string
  label: string
  locale: SiteLocale
  className: string
}) {
  const target = articleLinkFor(slug, locale)
  const otherLanguage = target.locale !== locale

  return (
    <Link
      href={target.href}
      hrefLang={otherLanguage ? target.locale : undefined}
      className={className}
    >
      {label}
      {otherLanguage ? <span className="text-white/50"> (en español)</span> : null}
    </Link>
  )
}
