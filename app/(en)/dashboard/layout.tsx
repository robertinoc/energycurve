import { withAuth } from "@workos-inc/authkit-nextjs"
import { redirect } from "next/navigation"

import {
  DashboardShell,
  type SidebarPlaylist,
} from "@/components/dashboard/dashboard-shell"
import { BillingAlertStrip } from "@/components/dashboard/billing-alert-strip"
import { AuthProvider } from "@/components/providers/auth-provider"
import { signOutAndReturnTo } from "@/lib/auth/sign-out"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"
import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"
import { logWarn } from "@/lib/observability/logger"
import { getRequestLocale } from "@/lib/server-locale"
import { visitorCountryCode } from "@/lib/auth/request-country"
import { getProfileBilling } from "@/services/billing-service"
import {
  getProfileByWorkOSUserId,
  recordProfilePresence,
} from "@/services/profile-service"
import { listPlaylists } from "@/services/playlist-service"

async function logoutAction() {
  "use server"

  await signOutAndReturnTo("/", "Logout failed")
}

/**
 * Suspension gate + app shell for every /dashboard page. The suspension check
 * covers ALL login methods (the social/OAuth callback saves the session before
 * any profile check can run, so suspended accounts are caught here on first
 * load). Infrastructure problems fail open — the pages below render their own
 * setup states, and suspension must never take the whole dashboard down.
 *
 * When we have an authenticated user, pages render inside the sidebar shell
 * (which also lists the user's playlists). Otherwise children render bare so the
 * page can run its own login redirect or setup state.
 *
 * This is also where the client-side `AuthProvider` mounts for the app: it must
 * sit under a `proxy.ts`-matched route, and `/dashboard/:path*` is matched.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { workosConfigured, supabaseConfigured } = getInfrastructureStatus()
  let user: Awaited<ReturnType<typeof withAuth>>["user"] | null = null
  let playlists: SidebarPlaylist[] = []
  let billing: Awaited<ReturnType<typeof getProfileBilling>> | null = null

  if (workosConfigured && supabaseConfigured) {
    let suspended = false

    try {
      const auth = await withAuth()
      user = auth.user

      if (user) {
        const profile = await getProfileByWorkOSUserId(user.id)
        suspended = Boolean(profile?.suspended_at)

        if (profile && !profile.suspended_at) {
          // Presence (last seen + country) rides the page view that already
          // loaded the profile. Awaited rather than void-ed: a fire-and-forget
          // promise can be frozen with the serverless function (the analysis
          // snapshot bug all over again), and the write is throttled to one
          // per half hour anyway. Its own try so telemetry can never take the
          // shell down.
          try {
            await recordProfilePresence(profile, await visitorCountryCode())
          } catch (presenceError) {
            logWarn("dashboard.presence_record_skipped", {
              reason:
                presenceError instanceof Error
                  ? presenceError.message
                  : "Unknown presence error",
            })
          }

          const rows = await listPlaylists(profile.id)
          playlists = rows.map((p) => ({
            id: p.id,
            name: p.name,
            trackCount: p.trackCount,
          }))

          // Read here so the alert strip can render above every dashboard page.
          // Inside the same try as the rest of the bootstrap on purpose: a billing
          // read that fails must not take the shell down, and a missing strip is a
          // far smaller problem than a blank app.
          billing = await getProfileBilling(profile.id)
        }
      }
    } catch (error) {
      logWorkOSRuntimeError("Dashboard shell bootstrap failed", error)
      logWarn("dashboard.shell_bootstrap_skipped", {
        reason: error instanceof Error ? error.message : "Unknown error",
      })
    }

    if (suspended) {
      redirect("/account-suspended")
    }
  }

  if (!user) {
    return <AuthProvider>{children}</AuthProvider>
  }

  const displayName = user.firstName?.trim() || user.email.split("@")[0]
  const locale = await getRequestLocale()

  return (
    <AuthProvider>
      <DashboardShell
        displayName={displayName}
        email={user.email}
        playlists={playlists}
        locale={locale}
        logoutAction={logoutAction}
        billingStrip={
          billing ? (
            <BillingAlertStrip billing={billing} locale={locale} />
          ) : null
        }
      >
        {children}
      </DashboardShell>
    </AuthProvider>
  )
}
