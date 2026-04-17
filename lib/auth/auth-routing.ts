import { buildReturnToHref } from "./return-to"

interface ResolveAuthRouteOptions {
  pathname: string
  search?: string
  workosConfigured: boolean
  hasUser: boolean
  authCheckFailed?: boolean
}

export function resolveAuthRoute({
  pathname,
  search = "",
  workosConfigured,
  hasUser,
  authCheckFailed = false,
}: ResolveAuthRouteOptions) {
  if (!workosConfigured) {
    if (pathname.startsWith("/dashboard")) {
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
    if (pathname.startsWith("/dashboard")) {
      return {
        type: "redirect" as const,
        target: "/login?error=config",
      }
    }

    return {
      type: "allow" as const,
    }
  }

  if (pathname.startsWith("/dashboard") && !hasUser) {
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
