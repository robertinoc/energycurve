import { signOut, withAuth } from "@workos-inc/authkit-nextjs"
import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"
import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"
import { logWarn } from "@/lib/observability/logger"
import { getProfileByWorkOSUserId } from "@/services/profile-service"

async function logoutAction() {
  "use server"

  try {
    await signOut({ returnTo: "/" })
  } catch (error) {
    logWorkOSRuntimeError("Logout failed", error)
    redirect("/")
  }
}

/**
 * Suspension gate + app shell for every /dashboard page. The suspension check
 * is the enforcement point that covers ALL login methods: the social/OAuth
 * callback saves the session before any profile check can run, so suspended
 * accounts are caught here on their first page load. Infrastructure problems
 * fail open — the pages below already render guided setup states, and
 * suspension must never take the whole dashboard down.
 *
 * When we have an authenticated user, pages render inside the sidebar shell.
 * Otherwise (not logged in / infra not configured) children render bare so the
 * page can run its own login redirect or setup state.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { workosConfigured, supabaseConfigured } = getInfrastructureStatus()
  let user: Awaited<ReturnType<typeof withAuth>>["user"] | null = null

  if (workosConfigured && supabaseConfigured) {
    let suspended = false

    try {
      const auth = await withAuth()
      user = auth.user

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

  if (!user) {
    return <>{children}</>
  }

  const displayName = user.firstName?.trim() || user.email.split("@")[0]

  return (
    <DashboardShell
      displayName={displayName}
      email={user.email}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardShell>
  )
}
