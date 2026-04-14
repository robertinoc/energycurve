import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs"
import { NextResponse, type NextRequest } from "next/server"

import { buildReturnToHref } from "@/lib/auth/return-to"
import { isWorkOSConfigured } from "@/lib/config/infrastructure-status"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"

export default async function proxy(request: NextRequest) {
  if (!isWorkOSConfigured()) {
    const { pathname } = request.nextUrl

    if (pathname.startsWith("/dashboard")) {
      const setupUrl = request.nextUrl.clone()
      setupUrl.pathname = "/login"
      setupUrl.searchParams.set("error", "setup")

      return NextResponse.redirect(setupUrl)
    }

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

    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      const configUrl = request.nextUrl.clone()
      configUrl.pathname = "/login"
      configUrl.searchParams.set("error", "config")

      return NextResponse.redirect(configUrl)
    }

    return NextResponse.next()
  }

  const { pathname, search } = request.nextUrl

  if (pathname.startsWith("/dashboard") && !session.user) {
    return handleAuthkitHeaders(request, headers, {
      redirect: buildReturnToHref("/login", `${pathname}${search}`),
    })
  }

  if ((pathname === "/login" || pathname === "/signup") && session.user) {
    return handleAuthkitHeaders(request, headers, {
      redirect: "/dashboard",
    })
  }

  return handleAuthkitHeaders(request, headers)
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
}
