import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs"
import { NextResponse, type NextRequest } from "next/server"

import { resolveAuthRoute } from "@/lib/auth/auth-routing"
import {
  backstageEffectivePathname,
  isBackstageHostname,
  resolveMainOrigin,
} from "@/lib/backstage/hosts"
import { isWorkOSConfigured } from "@/lib/config/infrastructure-status"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"

/**
 * Redirect targets are app-relative paths. While on the backstage
 * subdomain they must resolve against the main origin (see hosts.ts).
 */
function buildRedirectUrl(
  target: string,
  request: NextRequest,
  onBackstageHost: boolean
) {
  if (onBackstageHost) {
    const mainOrigin = resolveMainOrigin()

    if (mainOrigin) {
      return new URL(target, mainOrigin)
    }
  }

  return new URL(target, request.url)
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const workosConfigured = isWorkOSConfigured()
  const onBackstageHost = isBackstageHostname(request.nextUrl.hostname)
  // The proxy runs before the beforeFiles rewrites, so backstage-host
  // requests still carry the un-rewritten pathname ("/" instead of
  // "/backstage"). Route decisions must use the effective one.
  const routePathname = onBackstageHost
    ? backstageEffectivePathname(pathname)
    : pathname

  // The pre-auth resolution only exists for the not-configured setup state.
  // Running it with a real session pending (hasUser unknown) would redirect
  // authenticated /dashboard requests to /login and loop them back forever.
  if (!workosConfigured) {
    const setupRouteResolution = resolveAuthRoute({
      pathname: routePathname,
      search,
      workosConfigured: false,
      hasUser: false,
    })

    if (setupRouteResolution.type === "redirect") {
      return NextResponse.redirect(
        buildRedirectUrl(setupRouteResolution.target, request, onBackstageHost)
      )
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
    const failureRouteResolution = resolveAuthRoute({
      pathname: routePathname,
      search,
      workosConfigured: true,
      hasUser: false,
      authCheckFailed: true,
    })

    if (failureRouteResolution.type === "redirect") {
      return NextResponse.redirect(
        buildRedirectUrl(
          failureRouteResolution.target,
          request,
          onBackstageHost
        )
      )
    }

    return NextResponse.next()
  }

  const routeResolution = resolveAuthRoute({
    pathname: routePathname,
    search,
    workosConfigured: true,
    hasUser: Boolean(session.user),
  })

  if (routeResolution.type === "redirect") {
    return handleAuthkitHeaders(request, headers, {
      redirect: buildRedirectUrl(
        routeResolution.target,
        request,
        onBackstageHost
      ).toString(),
    })
  }

  return handleAuthkitHeaders(request, headers)
}

export const config = {
  // MUST stay a static literal: Next parses this at compile time and cannot
  // resolve an imported value (it fails the whole middleware, not just one
  // route). `tests/protected-routes.test.ts` reads these entries back out of
  // this file and checks that every handler calling withAuth() is covered —
  // forgetting one throws at runtime and reads as a 500 rather than a 401.
  matcher: [
    "/dashboard/:path*",
    "/backstage/:path*",
    "/api/backstage/:path*",
    // Session-gated app APIs: withAuth() inside a route handler requires the
    // request to have passed through the authkit middleware, or it throws
    // (500 for everyone, even logged-in users).
    "/api/playlists/:path*",
    // Billing: checkout and the portal act for the signed-in user. Listed
    // individually rather than as /api/billing/:path* on purpose — the webhook
    // must NOT be matched, since Stripe posts without a session and
    // authenticates by signature instead.
    "/api/billing/checkout",
    "/api/billing/portal",
    "/login",
    "/signup",
    // Backstage subdomain: every request must run through authkit because
    // the /backstage pages and API routes read the session via withAuth().
    {
      source: "/:path*",
      has: [{ type: "host", value: "backstage.energycurve.app" }],
    },
  ],
}
