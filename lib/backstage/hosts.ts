/**
 * Host-based routing helpers for the backstage subdomain.
 *
 * backstage.energycurve.app is served by this same app through beforeFiles
 * rewrites in next.config.ts (/{path} -> /backstage/{path}). The proxy runs
 * BEFORE those rewrites, so it needs to translate the incoming pathname to
 * the one the app will actually serve, and any redirect issued while on the
 * subdomain must point at the main origin — relative targets like /login
 * would be rewritten to /backstage/login and 404.
 *
 * Kept free of "server-only" so proxy.ts can import it.
 */

export const BACKSTAGE_HOST = "backstage.energycurve.app"

export function isBackstageHostname(hostname: string): boolean {
  return hostname === BACKSTAGE_HOST
}

/** Mirrors the next.config.ts rewrites for backstage-host requests. */
export function backstageEffectivePathname(pathname: string): string {
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next")) {
    return pathname
  }

  if (pathname === "/") {
    return "/backstage"
  }

  if (pathname.startsWith("/backstage")) {
    return pathname
  }

  return `/backstage${pathname}`
}

/**
 * Origin of the main app (https://energycurve.app in production,
 * http://localhost:3010 in dev), derived from the WorkOS redirect URI so it
 * needs no extra env var. Null when the env is not configured yet.
 */
export function resolveMainOrigin(): string | null {
  const redirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI

  if (!redirectUri) {
    return null
  }

  try {
    return new URL(redirectUri).origin
  } catch {
    return null
  }
}
