import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { describe, expect, it } from "vitest"

import {
  INTENTIONALLY_UNPROTECTED,
  isAuthkitMatched,
  readAuthkitMatcher,
} from "@/lib/auth/protected-routes"

/**
 * Guards the failure mode that has now bitten twice: a route handler calls
 * `withAuth()`, nobody adds it to the AuthKit matcher, and AuthKit throws — so
 * every request gets a 500 instead of a 401, including from signed-in users.
 * The dashboard route survived it; `/api/billing/checkout` shipped with it.
 *
 * Rather than assert a hand-written list, this walks the API tree and checks
 * coverage for whatever it finds, so a route added next month is covered too.
 */

const API_ROOT = join(process.cwd(), "app", "api")

function findRouteFiles(dir: string): string[] {
  const found: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...findRouteFiles(full))
    } else if (entry.name === "route.ts" || entry.name === "route.tsx") {
      found.push(full)
    }
  }

  return found
}

/** `app/api/billing/checkout/route.ts` → `/api/billing/checkout`. */
function routePathOf(file: string): string {
  const rel = relative(process.cwd(), file)
  return (
    "/" +
    rel
      .split(sep)
      .slice(1, -1) // drop "app" and "route.ts"
      .join("/")
  )
}

const routes = findRouteFiles(API_ROOT).map((file) => ({
  file: relative(process.cwd(), file),
  path: routePathOf(file),
  source: readFileSync(file, "utf8"),
}))

describe("AuthKit middleware coverage", () => {
  it("finds the API routes", () => {
    // A path change that makes the scan match nothing would make every
    // assertion below pass vacuously.
    expect(routes.length).toBeGreaterThan(3)
  })

  it("covers every route that calls withAuth()", () => {
    const usesWithAuth = routes.filter((route) =>
      /\bwithAuth\s*\(/.test(route.source)
    )

    expect(usesWithAuth.length).toBeGreaterThan(0)

    const uncovered = usesWithAuth
      .filter((route) => !isAuthkitMatched(route.path))
      .map((route) => `${route.path} (${route.file})`)

    expect(
      uncovered,
      "these call withAuth() but aren't in AUTHKIT_MATCHER — they will 500, " +
        "not 401. Add them to lib/auth/protected-routes.ts"
    ).toEqual([])
  })

  it("keeps the Stripe webhook out of the matcher", () => {
    // Stripe posts without a session and authenticates by signature. Running
    // authkit there is pointless and risks interfering with the raw body.
    for (const path of INTENTIONALLY_UNPROTECTED) {
      expect(isAuthkitMatched(path)).toBe(false)
    }
  })

  it("does not let a route authenticate by signature *and* session", () => {
    for (const path of INTENTIONALLY_UNPROTECTED) {
      const route = routes.find((entry) => entry.path === path)
      expect(route, `expected ${path} to exist`).toBeDefined()
      expect(/\bwithAuth\s*\(/.test(route!.source)).toBe(false)
    }
  })
})

describe("matcher patterns", () => {
  it("matches a wildcard segment and its parent", () => {
    expect(isAuthkitMatched("/api/playlists/abc/smart-order")).toBe(true)
    expect(isAuthkitMatched("/dashboard")).toBe(true)
    expect(isAuthkitMatched("/dashboard/playlists/123")).toBe(true)
  })

  it("leaves public routes alone", () => {
    expect(isAuthkitMatched("/")).toBe(false)
    expect(isAuthkitMatched("/pricing")).toBe(false)
    expect(isAuthkitMatched("/api/health")).toBe(false)
    expect(isAuthkitMatched("/api/contact")).toBe(false)
  })

  it("does not treat the backstage host entry as path coverage", () => {
    // The host-scoped entry only applies on backstage.energycurve.app, so a
    // path on the main origin must not count as covered by it.
    expect(isAuthkitMatched("/anything-at-all")).toBe(false)
  })

  it("reads the matcher out of proxy.ts rather than keeping a copy", () => {
    // A second hand-maintained list would drift from the literal Next actually
    // compiles, which is the whole failure this test exists to catch.
    const matcher = readAuthkitMatcher()

    expect(matcher).toContain("/api/billing/checkout")
    expect(matcher).toContain("/api/billing/portal")
    expect(matcher).not.toContain("/api/billing/webhook")
    expect(matcher.length).toBeGreaterThan(5)
  })

  it("fails loudly if the matcher can no longer be found", () => {
    expect(() => readAuthkitMatcher("/nonexistent/proxy.ts")).toThrow()
  })
})
