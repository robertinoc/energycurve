import { SalesWall } from "@/components/plans/sales-wall"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { SALES_WALL_COPY } from "@/lib/content/sales-wall-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Wall 3 of step 3.1: under the score, after a re-analysis that raised it.
 *
 * A strip, not a modal: the curve and the score are what the DJ came back to
 * see, and nothing may cover them. It says what they gained, then what PRO adds
 * to it — version history and planned vs played, both already shipped. Only
 * rendered when the score went up (lib/product/score-gain.ts decides).
 */
export function ScoreGainStrip({
  from,
  to,
  locale,
}: {
  from: number
  to: number
  locale: SiteLocale
}) {
  return (
    <SalesWall
      wall="score_improved"
      plan="pro"
      weight="strip"
      title={formatTemplate(SALES_WALL_COPY.scoreGainTitle[locale], {
        from: from.toFixed(1),
        to: to.toFixed(1),
      })}
      body={SALES_WALL_COPY.scoreGainBody[locale]}
      locale={locale}
    />
  )
}
