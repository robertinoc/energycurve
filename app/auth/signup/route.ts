import { getSignUpUrl } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { getSafeReturnTo } from "@/lib/auth/return-to"
import { isWorkOSConfigured } from "@/lib/config/infrastructure-status"
import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"

export async function GET(request: Request) {
  if (!isWorkOSConfigured()) {
    const setupUrl = new URL("/signup", request.url)
    setupUrl.searchParams.set("error", "setup")

    return NextResponse.redirect(setupUrl)
  }

  try {
    const { searchParams } = new URL(request.url)
    const returnTo = getSafeReturnTo(searchParams.get("returnTo"))
    const freshSignup = searchParams.get("fresh") === "1"
    const signUpUrl = await getSignUpUrl({
      returnTo,
      ...(freshSignup ? { prompt: "consent" } : {}),
    })

    return NextResponse.redirect(signUpUrl)
  } catch (error) {
    logWorkOSRuntimeError("Sign-up URL generation failed", error)

    const configUrl = new URL("/signup", request.url)
    configUrl.searchParams.set("error", "config")

    return NextResponse.redirect(configUrl)
  }
}
