import "server-only"

import { withAuth } from "@workos-inc/authkit-nextjs"
import { redirect } from "next/navigation"

import { buildReturnToHref } from "@/lib/auth/return-to"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"
import { isBackstageAdmin } from "@/lib/backstage/config"
import { resolveMainOrigin } from "@/lib/backstage/hosts"

export interface BackstageSession {
  email: string
  workosUserId: string
}

/**
 * Guard redirects must be absolute against the main origin: when the panel
 * is served on backstage.energycurve.app, a relative /login would be
 * rewritten to /backstage/login (404) and /dashboard would loop back here.
 */
function mainOriginHref(target: string) {
  return `${resolveMainOrigin() ?? ""}${target}`
}

/**
 * Page guard for /backstage. Anonymous visitors go through the regular
 * login page (with returnTo back here); authenticated non-admins are
 * silently sent to their dashboard — the panel should not advertise its
 * existence to regular users.
 */
export async function requireBackstageSession(): Promise<BackstageSession> {
  let user: Awaited<ReturnType<typeof withAuth>>["user"] | null = null

  try {
    const auth = await withAuth()
    user = auth.user
  } catch (error) {
    logWorkOSRuntimeError("Backstage auth check failed", error)
    redirect(mainOriginHref(buildReturnToHref("/login", "/backstage")))
  }

  if (!user) {
    redirect(mainOriginHref(buildReturnToHref("/login", "/backstage")))
  }

  if (!isBackstageAdmin(user.email)) {
    redirect(mainOriginHref("/dashboard"))
  }

  return { email: user.email, workosUserId: user.id }
}

/**
 * API guard for /api/backstage/*. Returns null instead of redirecting so
 * route handlers can answer with proper status codes.
 */
export async function getBackstageApiSession(): Promise<BackstageSession | null> {
  try {
    const { user } = await withAuth()

    if (!user || !isBackstageAdmin(user.email)) {
      return null
    }

    return { email: user.email, workosUserId: user.id }
  } catch (error) {
    logWorkOSRuntimeError("Backstage API auth check failed", error)
    return null
  }
}
