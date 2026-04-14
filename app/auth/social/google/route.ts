import { NextResponse } from "next/server"

import { getSafeReturnTo } from "@/lib/auth/return-to"
import { getGoogleAuthorizationRequest } from "@/lib/auth/social-auth"
import { isWorkOSConfigured } from "@/lib/config/infrastructure-status"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const mode = requestUrl.searchParams.get("mode") === "signup" ? "signup" : "login"
  const returnTo = getSafeReturnTo(requestUrl.searchParams.get("returnTo"))

  if (!isWorkOSConfigured()) {
    const fallbackUrl = new URL(mode === "signup" ? "/signup" : "/login", request.url)
    fallbackUrl.searchParams.set("error", "setup")
    fallbackUrl.searchParams.set("returnTo", returnTo)

    return NextResponse.redirect(fallbackUrl)
  }

  try {
    const { authorizationUrl, pkceCookie } = await getGoogleAuthorizationRequest({
      requestUrl: request.url,
      returnTo,
    })

    const response = NextResponse.redirect(authorizationUrl)
    response.cookies.set({
      name: pkceCookie.name,
      value: pkceCookie.value,
      maxAge: pkceCookie.maxAge,
      httpOnly: true,
      sameSite: "lax",
      secure: pkceCookie.secure,
      path: "/",
    })

    return response
  } catch (error) {
    logWorkOSRuntimeError("Google authorization URL generation failed", error)

    const fallbackUrl = new URL(mode === "signup" ? "/signup" : "/login", request.url)
    fallbackUrl.searchParams.set("error", "social_config")
    fallbackUrl.searchParams.set("returnTo", returnTo)

    return NextResponse.redirect(fallbackUrl)
  }
}
