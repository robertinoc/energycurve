import { withAuth } from "@workos-inc/authkit-nextjs"
import { redirect } from "next/navigation"

import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"
import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"
import { logWarn } from "@/lib/observability/logger"
import { getProfileByWorkOSUserId } from "@/services/profile-service"

/**
 * Suspension gate for every /dashboard page. This is the enforcement point
 * that covers ALL login methods: the social/OAuth callback saves the session
 * before any profile check can run, so suspended accounts are caught here on
 * their first page load instead. Infrastructure problems fail open — the
 * pages below already render guided setup states, and suspension must never
 * take the whole dashboard down.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { workosConfigured, supabaseConfigured } = getInfrastructureStatus()

  if (workosConfigured && supabaseConfigured) {
    let suspended = false

    try {
      const { user } = await withAuth()

      if (user) {
        const profile = await getProfileByWorkOSUserId(user.id)
        suspended = Boolean(profile?.suspended_at)
      }
    } catch (error) {
      logWorkOSRuntimeError("Dashboard suspension check failed", error)
      logWarn("dashboard.suspension_check_skipped", {
        reason: error instanceof Error ? error.message : "Unknown error",
      })
    }

    if (suspended) {
      redirect("/account-suspended")
    }
  }

  return children
}
