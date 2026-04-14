import { getSignInUrl } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { getSafeReturnTo } from "@/lib/auth/return-to"
import { isWorkOSConfigured } from "@/lib/config/infrastructure-status"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"

export async function GET(request: Request) {
  if (!isWorkOSConfigured()) {
    const setupUrl = new URL("/login", request.url)
    setupUrl.searchParams.set("error", "setup")

    return NextResponse.redirect(setupUrl)
  }

  try {
    const { searchParams } = new URL(request.url)
    const returnTo = getSafeReturnTo(searchParams.get("returnTo"))
    const signInUrl = await getSignInUrl({ returnTo })

    return NextResponse.redirect(signInUrl)
  } catch (error) {
    logWorkOSRuntimeError("Sign-in URL generation failed", error)

    const configUrl = new URL("/login", request.url)
    configUrl.searchParams.set("error", "config")

    return NextResponse.redirect(configUrl)
  }
}
