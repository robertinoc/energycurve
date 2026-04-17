import { describe, expect, it } from "vitest"

import { resolveAuthRoute } from "../lib/auth/auth-routing"

describe("resolveAuthRoute", () => {
  it("redirects signed-out dashboard access to login with returnTo", () => {
    const result = resolveAuthRoute({
      pathname: "/dashboard",
      search: "?tab=overview",
      workosConfigured: true,
      hasUser: false,
    })

    expect(result).toEqual({
      type: "redirect",
      target: "/login?returnTo=%2Fdashboard%3Ftab%3Doverview",
    })
  })

  it("redirects authenticated users away from login", () => {
    const result = resolveAuthRoute({
      pathname: "/login",
      workosConfigured: true,
      hasUser: true,
    })

    expect(result).toEqual({
      type: "redirect",
      target: "/dashboard",
    })
  })

  it("redirects dashboard to setup when WorkOS is not configured", () => {
    const result = resolveAuthRoute({
      pathname: "/dashboard",
      workosConfigured: false,
      hasUser: false,
    })

    expect(result).toEqual({
      type: "redirect",
      target: "/login?error=setup",
    })
  })

  it("redirects dashboard to config when auth check fails", () => {
    const result = resolveAuthRoute({
      pathname: "/dashboard",
      workosConfigured: true,
      hasUser: false,
      authCheckFailed: true,
    })

    expect(result).toEqual({
      type: "redirect",
      target: "/login?error=config",
    })
  })

  it("allows signed-out access to signup", () => {
    const result = resolveAuthRoute({
      pathname: "/signup",
      workosConfigured: true,
      hasUser: false,
    })

    expect(result).toEqual({
      type: "allow",
    })
  })
})
