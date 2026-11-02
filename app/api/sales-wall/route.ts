import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { captureServerEvent } from "@/lib/analytics/posthog-server"
import { isSuspended } from "@/lib/auth/suspension"
import { localizedPath } from "@/lib/content/locale-routing"
import { toSiteLocale } from "@/lib/analysis-locale"
import { logError } from "@/lib/observability/logger"
import { isSalesWall } from "@/lib/product/sales-walls"
import { getProfileBilling } from "@/services/billing-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const dynamic = "force-dynamic"

/**
 * A sales wall's button: counts the click, then lands on the pricing page.
 *
 * The count is the point. A wall nobody can measure repeats the mistake the
 * conversion plan starts from (docs/conversion-plan.md) — 188 accounts and no
 * way to say what any of them saw. `sales_wall_clicked` is captured here, on
 * the server, for the same reason `plan_limit_reached` is: the profile is
 * known, and nothing the browser blocks can lose it.
 *
 * Never in the way of the page: an unknown wall, a missing session or a
 * failed lookup still redirects, just without the event. The worst a broken
 * count may cost is a number, never the visit to /pricing.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const wall = url.searchParams.get("wall")
  const locale = toSiteLocale(url.searchParams.get("locale") ?? undefined)
  const destination = new URL(localizedPath("/pricing", locale), url)

  if (isSalesWall(wall)) {
    try {
      const { user } = await withAuth()

      if (user) {
        const profile = await syncProfileFromWorkOSUser({
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
        })

        if (!isSuspended(profile)) {
          const billing = await getProfileBilling(profile.id)

          captureServerEvent(profile.id, "sales_wall_clicked", {
            wall,
            plan: billing.plan,
            locale,
          })
        }
      }
    } catch (error) {
      logError("sales_wall.click_failed", error, { wall })
    }
  }

  // 303: whatever method arrived, the pricing page is a GET.
  return NextResponse.redirect(destination, 303)
}
