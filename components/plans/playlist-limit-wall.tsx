import { SalesWall } from "@/components/plans/sales-wall"
import { SALES_WALL_COPY } from "@/lib/content/sales-wall-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Wall 1 of step 3.1: the fourth playlist on FREE.
 *
 * Takes the place of the red error line in the three create forms (paste, file,
 * audio). The title is the sentence the action already returned, so the form
 * and the server can't disagree about the number; the body says what PRO
 * changes, and that deleting one of their own sets works too.
 */
export function PlaylistLimitWall({
  title,
  locale,
  className,
}: {
  title: string
  locale: SiteLocale
  className?: string
}) {
  return (
    <SalesWall
      wall="playlist_limit"
      plan="pro"
      title={title}
      body={SALES_WALL_COPY.playlistLimitBody[locale]}
      locale={locale}
      className={className}
    />
  )
}
