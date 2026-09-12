import { signOut, withAuth } from "@workos-inc/authkit-nextjs"
import { unstable_rethrow } from "next/navigation"
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
    // `signOut` finishes by throwing a redirect to WorkOS's hosted logout, with
    // `targetUrl` as its returnTo — so letting it through IS the session reset
    // this route exists to perform. Catching it sent the visitor straight to
    // the login screen with the WorkOS session still alive, which is how a
    // "start fresh" link handed someone back the session they were leaving.
    //
    // This route doesn't use `signOutAndReturnTo`: when the reset genuinely
    // fails it wants to carry on to the login screen anyway, rather than
    // redirect, and continuing is the right call — a visitor who has no session
    // to reset must still reach the form.
    unstable_rethrow(error)

    logWorkOSRuntimeError("Auth start session reset skipped", error)
  }

  return NextResponse.redirect(targetUrl)
}
