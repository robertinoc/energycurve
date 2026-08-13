import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

/**
 * `AuthKitProvider` calls the `getAuthAction` server action on mount, and that
 * action runs `withAuth()`, which throws on any route the AuthKit proxy did not
 * handle. The provider swallows the rejection client-side, so a misplaced mount
 * shows up only as a 500 on a background POST — nothing user-visible. This test
 * is the guard: every mount must sit on a route matched by `proxy.ts`.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * The plain string entries of `config.matcher` in proxy.ts. Object entries
 * (currently the backstage-host rule) are deliberately skipped: they only apply
 * when their `has` conditions hold, so they cannot vouch for a route on the
 * main host.
 */
function readMatcherPaths(): string[] {
  const source = readFileSync(join(repoRoot, "proxy.ts"), "utf8")
  const matcher = source.match(/matcher:\s*\[([\s\S]*?)\n\s*\],/)

  expect(matcher, "could not find config.matcher in proxy.ts").toBeTruthy()

  return Array.from(
    matcher![1].matchAll(/^\s*"(\/[^"]*)",?\s*$/gm),
    (entry) => entry[1]
  )
}

/** Does `pathname` — or anything nested under it — reach the proxy? */
function isMatched(pathname: string, matcherPaths: string[]) {
  return matcherPaths.some((pattern) => {
    const prefix = pattern.replace(/\/:path\*$/, "")
    return pattern.endsWith("/:path*")
      ? pathname === prefix || pathname.startsWith(`${prefix}/`)
      : pathname === pattern
  })
}

/** `app/dashboard/layout.tsx` -> `/dashboard`; route groups are dropped. */
function routeForFile(file: string) {
  const segments = relative(join(repoRoot, "app"), file)
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !segment.startsWith("("))

  return `/${segments.join("/")}`.replace(/\/$/, "") || "/"
}

function appFilesMountingAuthProvider() {
  const appDir = join(repoRoot, "app")

  return readdirSync(appDir, { recursive: true, encoding: "utf8" })
    .filter((entry) => /\.tsx$/.test(entry))
    .map((entry) => join(appDir, entry))
    .filter((file) => /<AuthProvider[\s>]/.test(readFileSync(file, "utf8")))
}

describe("AuthProvider mount scope", () => {
  const matcherPaths = readMatcherPaths()

  it("reads the matcher out of proxy.ts", () => {
    expect(matcherPaths).toContain("/dashboard/:path*")
  })

  it("mounts only on routes the AuthKit proxy handles", () => {
    const uncovered = appFilesMountingAuthProvider()
      .map((file) => ({ file: relative(repoRoot, file), route: routeForFile(file) }))
      .filter(({ route }) => !isMatched(route, matcherPaths))

    expect(
      uncovered,
      "these mount AuthProvider on a route proxy.ts does not match, which makes " +
        "getAuthAction 500 on every page load — either move the mount or add the " +
        "route to config.matcher"
    ).toEqual([])
  })

  it("still mounts somewhere (the app needs the client auth context)", () => {
    expect(appFilesMountingAuthProvider().length).toBeGreaterThan(0)
  })
})
