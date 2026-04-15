import { handleAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse, type NextRequest } from "next/server"

import { isWorkOSConfigured } from "@/lib/config/infrastructure-status"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"
import { logError } from "@/lib/observability/logger"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

const authHandler = handleAuth({
  returnPathname: "/dashboard",
  onSuccess: async ({ user }) => {
    try {
      await syncProfileFromWorkOSUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
      })
    } catch (error) {
      logError("auth.callback_profile_sync_failed", error, {
        workosUserId: user.id,
        email: user.email,
      })
    }
  },
  onError: async ({ request, error }) => {
    logError("auth.callback_failed", error, {
      pathname: new URL(request.url).pathname,
    })

    const url = new URL("/login", request.url)
    url.searchParams.set("error", "auth")

    return NextResponse.redirect(url)
  },
})

export async function GET(request: NextRequest) {
  if (!isWorkOSConfigured()) {
    const url = new URL("/login", request.url)
    url.searchParams.set("error", "setup")

    return NextResponse.redirect(url)
  }

  try {
    return await authHandler(request)
  } catch (error) {
    logWorkOSRuntimeError("Auth callback failed before AuthKit could recover", error)

    const url = new URL("/login", request.url)
    url.searchParams.set("error", "config")

    return NextResponse.redirect(url)
  }
}
