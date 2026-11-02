import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { SALES_WALL_COPY } from "@/lib/content/sales-wall-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  UPSELL_PLAN_LABEL,
  salesWallHref,
  type SalesWall as SalesWallId,
  type UpsellPlan,
} from "@/lib/product/sales-walls"
import { cn } from "@/lib/utils"

/**
 * One sales wall: what the plan would change here, its badge, and the way to
 * the plans (docs/conversion-plan.md, step 3.1).
 *
 * Two weights. `wall` stands in for something the DJ just tried and could
 * not do, so it takes the place of the refusal and carries a filled button.
 * `strip` sits under a result the DJ is pleased with and must not compete with
 * it: no fill, one line where the width allows, an outline button.
 *
 * Server-safe (no hooks), so a page can render it as well as a form. Stacks on
 * a phone, never wider than its container.
 */
export function SalesWall({
  wall,
  plan,
  title,
  body,
  locale,
  weight = "wall",
  className,
}: {
  wall: SalesWallId
  plan: UpsellPlan
  title: string
  body: string
  locale: SiteLocale
  weight?: "wall" | "strip"
  className?: string
}) {
  return (
    <section
      aria-label={title}
      data-sales-wall={wall}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border p-4",
        weight === "wall"
          ? "border-ec-border-strong bg-ec-raised"
          : "border-ec-border bg-ec-surface sm:flex-row sm:items-center sm:gap-4",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="flex flex-wrap items-center gap-2 font-heading text-sm font-semibold text-ec-text">
          {title}
          <Badge variant="default" className="px-2 py-0.5 text-[10px]">
            {UPSELL_PLAN_LABEL[plan]}
          </Badge>
        </p>
        <p className="text-sm leading-6 text-ec-text-muted">{body}</p>
      </div>
      {/* A plain <a>: the redirect counts the click, and a prefetch would count
          one nobody made. */}
      <a
        href={salesWallHref(wall, locale)}
        className={cn(
          buttonVariants({ size: "sm", variant: weight === "wall" ? "default" : "outline" }),
          "w-fit shrink-0"
        )}
      >
        {SALES_WALL_COPY.cta[locale]}
      </a>
    </section>
  )
}
