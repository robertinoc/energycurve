import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs"
import { NextResponse, type NextRequest } from "next/server"

import { resolveAuthRoute } from "@/lib/auth/auth-routing"
import { isWorkOSConfigured } from "@/lib/config/infrastructure-status"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const workosConfigured = isWorkOSConfigured()

  const setupRouteResolution = resolveAuthRoute({
    pathname,
    search,
    workosConfigured,
    hasUser: false,
  })

  if (setupRouteResolution.type === "redirect") {
    return NextResponse.redirect(new URL(setupRouteResolution.target, request.url))
  }

  if (!workosConfigured) {
    return NextResponse.next()
  }

  let session: Awaited<ReturnType<typeof authkit>>["session"]
  let headers: Awaited<ReturnType<typeof authkit>>["headers"]

  try {
    const authResult = await authkit(request)
    session = authResult.session
    headers = authResult.headers
  } catch (error) {
    logWorkOSRuntimeError("Proxy auth check failed", error)
    const failureRouteResolution = resolveAuthRoute({
      pathname,
      search,
      workosConfigured: true,
      hasUser: false,
      authCheckFailed: true,
    })

    if (failureRouteResolution.type === "redirect") {
      return NextResponse.redirect(
        new URL(failureRouteResolution.target, request.url)
      )
    }

    return NextResponse.next()
  }

  const routeResolution = resolveAuthRoute({
    pathname,
    search,
    workosConfigured: true,
    hasUser: Boolean(session.user),
  })

  if (routeResolution.type === "redirect") {
    return handleAuthkitHeaders(request, headers, {
      redirect: routeResolution.target,
    })
  }

  return handleAuthkitHeaders(request, headers)
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
}
