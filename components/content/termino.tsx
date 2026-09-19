import Link from "next/link"

import { GLOSSARY_BY_ID } from "@/lib/content/glossary/terms"
import { glossaryTermPath } from "@/lib/content/glossary/paths"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * A link to a glossary entry, with its short definition attached.
 *
 * Deliberately not a React popover. The tooltip is a sibling element shown by
 * CSS on `:hover` and on `:focus-within`, which buys three things a JS version
 * would have had to re-earn: the definition is in the server's HTML (so it is
 * there for a crawler and for a reader whose JS never arrives), the keyboard
 * path is the link's own focus — tab to it and the definition appears — and
 * there is no state, so there is no controlled input and none of the
 * before-hydration trouble the tool pages had to solve.
 *
 * `aria-describedby` is what makes a screen reader announce the definition
 * along with the link, rather than leaving it as decoration only a sighted
 * mouse user gets.
 *
 * An unknown id renders its children as plain text rather than throwing: a
 * typo in a term name should not take a page down. `tests/glossary.test.ts`
 * catches the typo instead.
 */
export function Termino({
  id,
  locale,
  children,
}: {
  id: string
  locale: SiteLocale
  children?: React.ReactNode
}) {
  const term = GLOSSARY_BY_ID.get(id)

  if (!term) {
    return <>{children}</>
  }

  const tooltipId = `term-${id}`

  return (
    <span className="ec-term">
      <Link
        href={glossaryTermPath(term, locale)}
        className="ec-term-link"
        aria-describedby={tooltipId}
      >
        {children ?? term.title[locale]}
      </Link>
      <span role="tooltip" id={tooltipId} className="ec-term-tip">
        {term.short[locale]}
      </span>
    </span>
  )
}
