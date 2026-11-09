import { handleAuth } from "@workos-inc/authkit-nextjs"
import { unsealData } from "iron-session"
import { NextResponse, type NextRequest } from "next/server"

import { DEFAULT_RETURN_TO, getSafeReturnTo } from "@/lib/auth/return-to"
import { isWorkOSConfigured } from "@/lib/config/infrastructure-status"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"
import { logError } from "@/lib/observability/logger"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

/**
 * Error redirects used to drop the destination: a failed Google attempt from
 * /login?returnTo=/backstage landed on /login?error=auth, and retrying from
 * there sent the person to /dashboard instead of back where they started.
 * The destination is recoverable — it travels sealed inside the OAuth state
 * param — so best-effort recover it; on any doubt, fall back to the default.
 */
async function recoverReturnTo(request: Request): Promise<string> {
  try {
    const state = new URL(request.url).searchParams.get("state")
    const password = process.env.WORKOS_COOKIE_PASSWORD

    if (!state || !password) {
      return DEFAULT_RETURN_TO
    }

    const unsealed = (await unsealData(state, { password })) as {
      returnPathname?: unknown
    }

    return typeof unsealed.returnPathname === "string"
      ? getSafeReturnTo(unsealed.returnPathname)
      : DEFAULT_RETURN_TO
  } catch {
    return DEFAULT_RETURN_TO
  }
}

async function loginErrorRedirect(request: Request, errorCode: string) {
  const url = new URL("/login", request.url)

  url.searchParams.set("returnTo", await recoverReturnTo(request))
  url.searchParams.set("error", errorCode)

  return NextResponse.redirect(url)
}

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

    return loginErrorRedirect(request, "auth")
  },
})

export async function GET(request: NextRequest) {
  if (!isWorkOSConfigured()) {
    return loginErrorRedirect(request, "setup")
  }

  try {
    return await authHandler(request)
  } catch (error) {
    logWorkOSRuntimeError("Auth callback failed before AuthKit could recover", error)

    return loginErrorRedirect(request, "config")
  }
}
