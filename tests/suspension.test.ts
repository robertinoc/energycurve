import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { isSuspended } from "@/lib/auth/suspension"

/**
 * Suspension, enforced where it costs something.
 *
 * It was checked in exactly two places — at login, and when the dashboard shell
 * renders — and both are *page* gates. A suspended account with a live session
 * cookie could still spend AI quota, export its whole account and mutate its
 * playlists. It just could not see the dashboard.
 *
 * That gap survived because it is invisible from the UI: you suspend someone,
 * their browser bounces to /account-suspended, and it looks like it worked. The
 * session is still valid; only the view changed.
 */

describe("reading the flag", () => {
  it("is suspended when a timestamp is present", () => {
    expect(isSuspended({ suspended_at: "2026-09-11T00:00:00.000Z" })).toBe(true)
  })

  it("is not suspended when null", () => {
    expect(isSuspended({ suspended_at: null })).toBe(false)
  })

  it("treats an empty string as not suspended", () => {
    // A blank column is the absence of a suspension, not a suspension with no
    // date. Getting this backwards would lock out every account.
    expect(isSuspended({ suspended_at: "" })).toBe(false)
  })
})

describe("the routes that cost something check it", () => {
  // Asserted against the source rather than by driving each route, because the
  // property is "this check exists on this route" and the failure mode being
  // guarded against is someone adding a new route and forgetting it.
  const routes = [
    "app/api/playlists/[id]/smart-order/route.ts",
    "app/api/account/export/route.ts",
  ]

  for (const route of routes) {
    it(`${route} refuses a suspended caller`, () => {
      const source = readFileSync(join(process.cwd(), route), "utf8")

      expect(source).toContain("isSuspended(profile)")
    })

    it(`${route} checks it before doing the expensive thing`, () => {
      const source = readFileSync(join(process.cwd(), route), "utf8")
      const check = source.indexOf("isSuspended(profile)")

      // The *call site*, not the import. The first version searched for
      // `checkRateLimit` and matched the import line near the top of the file,
      // so every check looked like it came "after" — a test that passes or
      // fails on where an import sits is measuring nothing.
      const rateLimit = source.indexOf("checkRateLimit({")

      expect(check).toBeGreaterThan(-1)
      if (rateLimit > -1) {
        expect(check).toBeLessThan(rateLimit)
      }
    })
  }

  it("every server action is covered by one check in requireProfile", () => {
    // `requireProfile` is the single entry point for the ~25 actions in that
    // file, which is most of the writes in the product. One check there beats
    // twenty-five that can each be forgotten.
    const source = readFileSync(
      join(process.cwd(), "app/dashboard/playlists/actions.ts"),
      "utf8"
    )

    const guard = source.indexOf("isSuspended(profile)")
    const returnsProfile = source.indexOf("return profile")

    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(returnsProfile)
  })
})

/**
 * The behavioural half lives in `tests/api-account-export.test.ts`, where the
 * module mocks are at the top level.
 *
 * They cannot go here: `vi.mock` is hoisted above everything, so a factory that
 * closes over a variable declared inside a `describe` throws at mock time. The
 * first version of this file did exactly that and failed with "make sure there
 * are no top level variables inside" — which is worth writing down, because the
 * obvious fix is to move the mocks up and that would make this file mock
 * WorkOS for the source-scanning tests above too.
 */
