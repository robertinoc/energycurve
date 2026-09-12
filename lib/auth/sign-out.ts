import { signOut } from "@workos-inc/authkit-nextjs"
import { redirect, unstable_rethrow } from "next/navigation"

import { logWorkOSRuntimeError } from "@/lib/auth/workos-runtime"

/**
 * Signs the current user out of WorkOS and out of this app.
 *
 * One function because there were four copies of it, and all four had the same
 * defect — which is what four copies of anything eventually produce.
 *
 * `signOut` always ends in a `redirect`: to WorkOS's hosted logout URL when it
 * can read a session id, and locally when it cannot. `redirect` is implemented
 * by throwing, so wrapping the call in `try/catch` catches a *successful*
 * sign-out. Next's own documentation for this version says it plainly —
 * "In Server Actions and Route Handlers, redirect should be called **outside**
 * the `try` block when using `try/catch` statements" — and `unstable_rethrow`
 * exists for the case where the call has to be guarded anyway.
 *
 * Guarding it is worth doing: WorkOS being unreachable should still get someone
 * out of the authenticated area rather than leaving them staring at an error
 * inside it. So the shape is: rethrow the framework's signal first, treat
 * anything left as a real failure, and redirect **after** the try/catch.
 *
 * What the four copies did instead, live in production until 2026-09-12:
 * logged `workos.runtime_error` with the context "Logout failed" on every
 * successful logout, and replaced WorkOS's external logout URL with a local
 * one — so the identity provider's session was never terminated. Worse, the
 * cookie deletion `signOut` performs before redirecting rides out on the
 * action's response, and an action that ends in an error never sends it. The
 * session survived intact behind an error screen.
 */
export async function signOutAndReturnTo(
  returnTo: string,
  failureContext: string
): Promise<void> {
  let fallbackNeeded = false

  try {
    await signOut({ returnTo })
  } catch (error) {
    // First, before anything else: a redirect is not an error, it is how the
    // sign-out finishes. Deleting this line is the defect this module exists
    // to prevent, and `tests/auth-sign-out.test.ts` goes red when it goes.
    unstable_rethrow(error)

    logWorkOSRuntimeError(failureContext, error)
    fallbackNeeded = true
  }

  // Outside the try/catch, per the framework's own rule.
  if (fallbackNeeded) {
    redirect(returnTo)
  }
}
