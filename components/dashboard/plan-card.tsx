import Link from "next/link"
import { AlertTriangle, CalendarClock, Sparkles } from "lucide-react"

import { ManageBillingButton } from "@/components/dashboard/manage-billing-button"
import { buttonVariants } from "@/components/ui/button"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  canManageBilling,
  formatPlanDate,
  planNotice,
  type BillingSnapshot,
  type PlanNoticeKind,
} from "@/lib/product/plan-summary"
import { cn } from "@/lib/utils"

const COPY = DASHBOARD_COPY.billing

/** Which states are an invitation vs a warning, and which just report. */
const TONE: Record<PlanNoticeKind, string> = {
  free: "border-white/10 bg-[#0C0917]",
  active: "border-white/10 bg-[#0C0917]",
  ending: "border-ec-amber/24 bg-ec-amber/[0.05]",
  pastDue: "border-ec-error/28 bg-ec-error/[0.06]",
  ended: "border-white/10 bg-[#0C0917]",
  incomplete: "border-ec-amber/24 bg-ec-amber/[0.05]",
}

/** States where pointing at /pricing is the useful next step. */
const OFFERS_UPGRADE: readonly PlanNoticeKind[] = ["free", "ended", "incomplete"]

export function PlanCard({
  billing,
  locale,
  billingConfigured,
}: {
  billing: BillingSnapshot
  locale: SiteLocale
  /** False when Stripe isn't wired up, e.g. a preview deploy with no keys. */
  billingConfigured: boolean
}) {
  const notice = planNotice(billing)
  const planLabel = COPY.planName[notice.plan][locale]
  const date = notice.date ? formatPlanDate(notice.date, locale) : ""
  const params = { plan: planLabel, date }

  const Icon = notice.actionable
    ? AlertTriangle
    : notice.kind === "ending"
      ? CalendarClock
      : Sparkles

  return (
    <section className={cn("rounded-[28px] border p-5", TONE[notice.kind])}>
      <p className="text-xs uppercase tracking-[0.22em] text-white/42">
        {COPY.sectionLabel[locale]}
      </p>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Icon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              notice.actionable ? "text-ec-error" : "text-white/48"
            )}
          />
          <div className="min-w-0 space-y-1">
            <h2 className="font-heading text-lg font-semibold text-white">
              {formatTemplate(COPY[notice.kind].title[locale], params)}
            </h2>
            <p className="max-w-xl text-sm leading-6 text-white/62">
              {formatTemplate(COPY[notice.kind].body[locale], params)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {OFFERS_UPGRADE.includes(notice.kind) ? (
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-white/10 bg-white/[0.04] text-white hover:border-white/16 hover:bg-white/[0.07]"
              )}
            >
              {COPY.seePlans[locale]}
            </Link>
          ) : null}

          {/* Hidden without a Stripe customer: the portal would 404, and offering
              a button that can't work is worse than not offering one. */}
          {billingConfigured && canManageBilling(billing) ? (
            <ManageBillingButton locale={locale} />
          ) : null}
        </div>
      </div>
    </section>
  )
}
