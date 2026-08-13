import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Reads the AuthKit matcher back out of `proxy.ts` so it can be checked.
 *
 * Why parse the file instead of importing the value: Next requires
 * `config.matcher` to be a **static literal** — it's parsed at compile time, and
 * an imported constant breaks the entire middleware rather than one route
 * (learned the hard way). So the literal has to stay in `proxy.ts`, and the only
 * way to verify it without keeping a second copy that can drift is to read it.
 *
 * Test-only. Nothing in the app should import this: it touches the filesystem.
 */

const MATCHER_BLOCK = /matcher:\s*\[([\s\S]*?)\n\s*\],/

/** String patterns from the matcher, in file order. Host-scoped entries are
 *  excluded — they only apply on the backstage subdomain, so they don't count
 *  as coverage for a path on the main origin. */
export function readAuthkitMatcher(
  proxyPath = join(process.cwd(), "proxy.ts")
): string[] {
  const source = readFileSync(proxyPath, "utf8")
  const block = MATCHER_BLOCK.exec(source)

  if (!block) {
    throw new Error(
      "Could not find the matcher array in proxy.ts — did its shape change?"
    )
  }

  return [...block[1].matchAll(/"([^"]+)"/g)]
    .map((match) => match[1])
    // Drop the values inside the host-scoped object entry.
    .filter((value) => value.startsWith("/"))
    .filter((value) => value !== "/:path*")
}

/** Route handlers that authenticate by other means and must stay unmatched. */
export const INTENTIONALLY_UNPROTECTED = [
  // Verified by Stripe signature; a session would be meaningless, and running
  // authkit here risks interfering with the raw body the signature is over.
  "/api/billing/webhook",
] as const

/** Turns a matcher pattern into a regex, mirroring Next's `:path*` semantics. */
function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\/:[A-Za-z_]+\*/g, "(?:/.*)?")
    .replace(/:[A-Za-z_]+/g, "[^/]+")

  return new RegExp(`^${source}$`)
}

/** True when `pathname` would run through the AuthKit middleware. */
export function isAuthkitMatched(
  pathname: string,
  matcher: string[] = readAuthkitMatcher()
): boolean {
  return matcher.some((entry) => patternToRegExp(entry).test(pathname))
}
