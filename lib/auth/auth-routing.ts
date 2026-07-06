import { buildReturnToHref } from "./return-to"

interface ResolveAuthRouteOptions {
  pathname: string
  search?: string
  workosConfigured: boolean
  hasUser: boolean
  authCheckFailed?: boolean
}

const PROTECTED_PREFIXES = ["/dashboard", "/backstage"] as const

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function resolveAuthRoute({
  pathname,
  search = "",
  workosConfigured,
  hasUser,
  authCheckFailed = false,
}: ResolveAuthRouteOptions) {
  if (!workosConfigured) {
    if (isProtectedPath(pathname)) {
      return {
        type: "redirect" as const,
        target: "/login?error=setup",
      }
    }

    return {
      type: "allow" as const,
    }
  }

  if (authCheckFailed) {
    if (isProtectedPath(pathname)) {
      return {
        type: "redirect" as const,
        target: "/login?error=config",
      }
    }

    return {
      type: "allow" as const,
    }
  }

  if (isProtectedPath(pathname) && !hasUser) {
    return {
      type: "redirect" as const,
      target: buildReturnToHref("/login", `${pathname}${search}`),
    }
  }

  if ((pathname === "/login" || pathname === "/signup") && hasUser) {
    return {
      type: "redirect" as const,
      target: "/dashboard",
    }
  }

  return {
    type: "allow" as const,
  }
}
