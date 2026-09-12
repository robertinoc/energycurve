import { beforeEach, describe, expect, it, vi } from "vitest"
import { redirect } from "next/navigation"

/**
 * Signing out, and the control-flow signal that must never be swallowed.
 *
 * Found in production on 2026-09-12 by clicking "Log out": the button showed an
 * error page and the session survived — the local cookie was still valid (going
 * to /login bounced straight back to /dashboard) and the WorkOS session was
 * still listed as active. Vercel logged `workos.runtime_error` with the context
 * "Logout failed" on every attempt.
 *
 * The cause is documented by Next itself, in `redirect.md` for this exact
 * version: "In Server Actions and Route Handlers, redirect should be called
 * **outside** the `try` block when using `try/catch` statements." AuthKit's
 * `signOut` always ends in a `redirect` — to WorkOS's hosted logout URL when
 * there is a session id, locally when there isn't — and `redirect` is
 * implemented by THROWING. Four call sites wrapped it in `try/catch` without
 * rethrowing, so a successful sign-out was caught and handled as a failure.
 *
 * Why the session survived rather than half-dying: `signOut` deletes the cookie
 * before it redirects, but a server action's cookie changes ride out on its
 * response. When the action ends in an error instead of a redirect, that
 * `Set-Cookie` never reaches the browser. Nothing is undone, and the user has
 * been shown a screen that implies something happened.
 *
 * These tests assert the signal survives. The mutation that matters is deleting
 * the `unstable_rethrow` line: do that and the first three go red.
 */

const signOut = vi.fn()
const logWorkOSRuntimeError = vi.fn()

vi.mock("@workos-inc/authkit-nextjs", () => ({
  signOut: (options?: { returnTo?: string }) => signOut(options),
}))

vi.mock("@/lib/auth/workos-runtime", () => ({
  logWorkOSRuntimeError: (context: string, error: unknown) =>
    logWorkOSRuntimeError(context, error),
}))

const { signOutAndReturnTo } = await import("@/lib/auth/sign-out")

/** The error `redirect()` throws, produced by calling the real thing. */
function redirectErrorFor(target: string): unknown {
  try {
    redirect(target)
  } catch (error) {
    return error
  }

  throw new Error("redirect() did not throw, so this helper cannot build one")
}

const WORKOS_LOGOUT =
  "https://api.workos.com/user_management/sessions/logout?session_id=sess_123"

beforeEach(() => {
  signOut.mockReset()
  logWorkOSRuntimeError.mockReset()
})

describe("a sign-out that works", () => {
  it("lets WorkOS's own redirect through, rather than one of its own", async () => {
    const fromSignOut = redirectErrorFor(WORKOS_LOGOUT)
    signOut.mockImplementation(() => {
      throw fromSignOut
    })

    const caught = await signOutAndReturnTo("/", "Logout failed").catch(
      (e: unknown) => e
    )

    // Identity, not shape. Asserting "it threw a NEXT_REDIRECT" passes even
    // with the defect present, because the swallow-and-fall-back path throws a
    // NEXT_REDIRECT too — just to the wrong place. That weaker assertion was
    // written here first and survived the mutation; this is what replaced it.
    expect(caught).toBe(fromSignOut)
  })

  it("keeps WorkOS's own logout URL as the destination", async () => {
    signOut.mockImplementation(() => {
      throw redirectErrorFor(WORKOS_LOGOUT)
    })

    const error = await signOutAndReturnTo("/", "Logout failed").catch(
      (e: unknown) => e
    )

    // Replacing this with a local redirect is what left the WorkOS session
    // alive: the cookie goes, the identity provider's session does not, and
    // signing in again resumes without asking for anything.
    expect(String((error as { digest?: string }).digest)).toContain(
      "api.workos.com"
    )
  })

  it("does not report a working sign-out as a failure", async () => {
    signOut.mockImplementation(() => {
      throw redirectErrorFor(WORKOS_LOGOUT)
    })

    await signOutAndReturnTo("/", "Logout failed").catch(() => undefined)

    // Every logout used to write `workos.runtime_error` with context
    // "Logout failed". A log that cries on success is worse than no log: it
    // trains whoever reads it to scroll past the real one.
    expect(logWorkOSRuntimeError).not.toHaveBeenCalled()
  })
})

describe("a sign-out that genuinely fails", () => {
  it("still gets the person out of the authenticated area", async () => {
    signOut.mockImplementation(() => {
      throw new Error("WorkOS is unreachable")
    })

    await expect(signOutAndReturnTo("/", "Logout failed")).rejects.toMatchObject(
      { digest: expect.stringContaining("NEXT_REDIRECT") }
    )
  })

  it("and that fallback goes where the caller asked", async () => {
    signOut.mockImplementation(() => {
      throw new Error("WorkOS is unreachable")
    })

    const error = await signOutAndReturnTo(
      "/account-suspended",
      "Suspended-account sign out failed"
    ).catch((e: unknown) => e)

    expect(String((error as { digest?: string }).digest)).toContain(
      "/account-suspended"
    )
  })

  it("reports it with the caller's own context", async () => {
    const failure = new Error("WorkOS is unreachable")
    signOut.mockImplementation(() => {
      throw failure
    })

    await signOutAndReturnTo("/", "Backstage logout failed").catch(
      () => undefined
    )

    expect(logWorkOSRuntimeError).toHaveBeenCalledWith(
      "Backstage logout failed",
      failure
    )
  })
})

describe("a sign-out with nothing to sign out of", () => {
  it("returns without redirecting when signOut resolves", async () => {
    // AuthKit always redirects today, but a version that simply returns must
    // not make the caller throw — the user is signed out either way.
    signOut.mockResolvedValue(undefined)

    await expect(
      signOutAndReturnTo("/", "Logout failed")
    ).resolves.toBeUndefined()
    expect(logWorkOSRuntimeError).not.toHaveBeenCalled()
  })
})
