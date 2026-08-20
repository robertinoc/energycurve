import Link from "next/link"

import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { planNotice, type BillingSnapshot } from "@/lib/product/plan-summary"

const COPY = DASHBOARD_COPY.billing

/**
 * A strip above every dashboard page when billing needs the customer to act.
 *
 * The PlanCard already renders this state, but only on the dashboard home — so
 * someone who lands on a playlist and works there never sees it. Which is the
 * whole failure mode with a declined card: PRO features start behaving
 * differently and nothing on screen connects that to a payment. An email covers
 * the person who reads email that day; this covers the person who doesn't.
 *
 * Renders nothing unless `planNotice` says the state is actionable, so it is
 * silent for everyone paying normally, everyone on FREE, and everyone whose
 * cancellation is simply running out its term.
 *
 * Reuses `planNotice` rather than reading `status` directly: two readers of the
 * same billing row deciding separately what counts as "needs attention" is how
 * they end up disagreeing on the same screen.
 */
export function BillingAlertStrip({
  billing,
  locale,
}: {
  billing: BillingSnapshot
  locale: SiteLocale
}) {
  const notice = planNotice(billing)

  if (!notice.actionable) {
    return null
  }

  // Explicit rather than indexing COPY by kind: only these three states are
  // actionable *and* worth interrupting every page for. `incomplete` is also
  // actionable, but it means a checkout was abandoned and nothing was charged —
  // a strip on every screen for that would be nagging, not informing.
  const copy =
    notice.kind === "pastDue"
      ? COPY.pastDue
      : notice.kind === "unpaid"
        ? COPY.unpaid
        : notice.kind === "ended"
          ? COPY.ended
          : null

  if (!copy) {
    return null
  }

  const planName = notice.plan === "pro_plus" ? "PRO+" : "PRO"

  return (
    <div
      // Assertive would interrupt a screen reader mid-task for something that is
      // important but not urgent to the second.
      role="status"
      className="border-b border-ec-error/25 bg-ec-error/[0.07] px-4 py-2.5 sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-5">
        <span className="font-semibold text-white">
          {copy.title[locale].replace("{plan}", planName)}
        </span>
        <span className="text-white/70">
          {copy.body[locale].replace("{plan}", planName)}
        </span>
        {/* A link, not the portal button: the button mints a session per click and
            needs to be a client component, and this strip renders on every page.
            The dashboard is one hop away and already has the real control. */}
        <Link
          href="/dashboard?billing=update"
          className="font-semibold text-ec-cyan underline-offset-4 hover:underline"
        >
          {COPY.manage[locale]}
        </Link>
      </div>
    </div>
  )
}
