import { SalesWall } from "@/components/plans/sales-wall"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { SALES_WALL_COPY } from "@/lib/content/sales-wall-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { PLAN_LIMITS } from "@/lib/product/plans"
import type { UpsellPlan } from "@/lib/product/sales-walls"

/**
 * Wall 2 of step 3.1: this month's AI orderings are spent.
 *
 * Says what the next plan gives — never "PRO" to someone who already has it:
 * a FREE account is shown PRO's monthly allowance (from PLAN_LIMITS, so it
 * moves with the plan) and that PRO+ has none; a PRO account is shown PRO+.
 * And that nothing they did is lost: the fixes and the hand moves keep working.
 */
export function AiOrderingWall({
  upgrade,
  locale,
  className,
}: {
  upgrade: UpsellPlan
  locale: SiteLocale
  className?: string
}) {
  const proAllowance = PLAN_LIMITS.pro.aiOrderingsPerMonth
  const toPro = upgrade === "pro" && proAllowance !== null

  return (
    <SalesWall
      wall="ai_ordering_limit"
      plan={upgrade}
      title={
        toPro
          ? formatTemplate(SALES_WALL_COPY.aiMoreOnProTitle[locale], { limit: proAllowance })
          : SALES_WALL_COPY.aiNoLimitTitle[locale]
      }
      body={toPro ? SALES_WALL_COPY.aiMoreOnProBody[locale] : SALES_WALL_COPY.aiNoLimitBody[locale]}
      locale={locale}
      className={className}
    />
  )
}
