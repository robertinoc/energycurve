import { describe, expect, it } from "vitest"

import { resolveAuthRoute } from "@/lib/auth/auth-routing"
import { parseAdminEmails } from "@/lib/backstage/config"
import {
  backstageEffectivePathname,
  isBackstageHostname,
} from "@/lib/backstage/hosts"

describe("parseAdminEmails", () => {
  it("falls back to the owner when the env var is unset", () => {
    expect(parseAdminEmails(undefined)).toEqual(["robertinoc@gmail.com"])
    expect(parseAdminEmails("")).toEqual(["robertinoc@gmail.com"])
  })

  it("falls back to the owner when the value has no valid emails", () => {
    expect(parseAdminEmails("not-an-email, ,")).toEqual([
      "robertinoc@gmail.com",
    ])
  })

  it("parses, trims, lowercases, and dedupes", () => {
    expect(
      parseAdminEmails(" Admin@Example.com , second@example.com,admin@example.com ")
    ).toEqual(["admin@example.com", "second@example.com"])
  })
})

describe("backstage host helpers", () => {
  it("matches only the exact backstage host", () => {
    expect(isBackstageHostname("backstage.energycurve.app")).toBe(true)
    expect(isBackstageHostname("energycurve.app")).toBe(false)
    expect(isBackstageHostname("evil-backstage.energycurve.app")).toBe(false)
  })

  it("maps subdomain paths onto the /backstage segment", () => {
    expect(backstageEffectivePathname("/")).toBe("/backstage")
    expect(backstageEffectivePathname("/analytics")).toBe(
      "/backstage/analytics"
    )
    expect(backstageEffectivePathname("/backstage/analytics")).toBe(
      "/backstage/analytics"
    )
  })

  it("leaves API and Next internals untouched (mirrors the rewrites)", () => {
    expect(backstageEffectivePathname("/api/backstage/users/1")).toBe(
      "/api/backstage/users/1"
    )
    expect(backstageEffectivePathname("/_next/static/x.js")).toBe(
      "/_next/static/x.js"
    )
  })
})

// resolveAuthRoute must protect /backstage exactly like /dashboard.
describe("resolveAuthRoute for /backstage", () => {
  it("redirects anonymous visitors to login with returnTo", () => {
    expect(
      resolveAuthRoute({
        pathname: "/backstage",
        workosConfigured: true,
        hasUser: false,
      })
    ).toEqual({
      type: "redirect",
      target: "/login?returnTo=%2Fbackstage",
    })
  })

  it("allows authenticated users through (allowlist runs in the layout)", () => {
    expect(
      resolveAuthRoute({
        pathname: "/backstage/analytics",
        workosConfigured: true,
        hasUser: true,
      })
    ).toEqual({ type: "allow" })
  })
})
