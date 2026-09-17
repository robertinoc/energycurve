import { PageShell } from "@/components/marketing/page-shell"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The chrome around blog pages.
 *
 * Now a thin naming of `PageShell`, which is the same header the tools use. The
 * one thing this decides is where the language toggle points: always `/blog`,
 * never the current article. An article exists in one language; sending a reader
 * to a translation that doesn't exist is a 404, and sending them to the index in
 * their language is the useful version of the same intent.
 */
export function BlogShell({
  locale,
  children,
}: {
  locale: SiteLocale
  children: React.ReactNode
}) {
  return (
    <PageShell locale={locale} togglePath="/blog">
      {children}
    </PageShell>
  )
}
