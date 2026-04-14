import { signOut, withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { getSafeReturnTo } from "@/lib/auth/return-to"
import { isWorkOSConfigured } from "@/lib/config/infrastructure-status"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("mode") === "signup" ? "signup" : "login"
  const returnTo = getSafeReturnTo(url.searchParams.get("returnTo"))

  if (!isWorkOSConfigured()) {
    const setupUrl = new URL(mode === "signup" ? "/signup" : "/login", request.url)
    setupUrl.searchParams.set("error", "setup")

    return NextResponse.redirect(setupUrl)
  }

  const targetUrl = new URL(
    mode === "signup" ? "/auth/signup" : "/auth/login",
    request.url
  )
  targetUrl.searchParams.set("returnTo", returnTo)
  targetUrl.searchParams.set("fresh", "1")

  try {
    const auth = await withAuth()

    if (auth.user) {
      await signOut({ returnTo: targetUrl.toString() })
    }
  } catch (error) {
    logWorkOSRuntimeError("Auth start session reset skipped", error)
  }

  return NextResponse.redirect(targetUrl)
}
