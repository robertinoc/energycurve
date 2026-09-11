import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"

/**
 * The helpers that decide whether the product says it is working.
 *
 * `getInfrastructureStatus` is what `/api/health` reports and what turns the
 * auth pages into a guided setup screen instead of a stack trace. It had no
 * tests, which is an odd place for a gap: the whole point of the module is to
 * be right about configuration when nothing else can be trusted to be.
 *
 * The cases that matter are the ones where a variable is *present but useless* —
 * an empty string, whitespace, a cookie password too short to seal a session, a
 * URL that is not one. Those are exactly what a half-finished `.env` looks like,
 * and reporting "configured" for any of them means the health check says ok
 * while the product is broken.
 */

const WORKOS_ENV = {
  WORKOS_CLIENT_ID: "client_test",
  WORKOS_API_KEY: "sk_test_key",
  WORKOS_COOKIE_PASSWORD: "a".repeat(32),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://localhost:3010/auth/callback",
}

const SUPABASE_ENV = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
}

function setEnv(values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    vi.stubEnv(name, value)
  }
}

beforeEach(() => {
  setEnv({ ...WORKOS_ENV, ...SUPABASE_ENV })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("a fully configured environment", () => {
  it("reports both services configured and nothing missing", () => {
    expect(getInfrastructureStatus()).toEqual({
      workosConfigured: true,
      supabaseConfigured: true,
      missingWorkOSEnvNames: [],
      missingSupabaseEnvNames: [],
    })
  })
})

describe("present but useless is the same as absent", () => {
  it("treats an empty string as missing", () => {
    setEnv({ WORKOS_API_KEY: "" })

    const status = getInfrastructureStatus()

    expect(status.workosConfigured).toBe(false)
    expect(status.missingWorkOSEnvNames).toContain("WORKOS_API_KEY")
  })

  it("treats whitespace as missing", () => {
    // The shape a copy-paste out of a doc leaves behind.
    setEnv({ SUPABASE_SERVICE_ROLE_KEY: "   " })

    expect(getInfrastructureStatus().supabaseConfigured).toBe(false)
  })

  it("rejects a cookie password too short to seal a session", () => {
    // 31 characters. `iron-session` needs 32, and a shorter one fails at
    // runtime on the first login rather than at boot — which is the worst
    // moment to find out.
    setEnv({ WORKOS_COOKIE_PASSWORD: "a".repeat(31) })

    const status = getInfrastructureStatus()

    expect(status.workosConfigured).toBe(false)
    expect(status.missingWorkOSEnvNames).toContain("WORKOS_COOKIE_PASSWORD")
  })

  it("accepts one of exactly the minimum length", () => {
    // The boundary in the other direction, so the check is a threshold and not
    // an off-by-one.
    setEnv({ WORKOS_COOKIE_PASSWORD: "a".repeat(32) })

    expect(getInfrastructureStatus().workosConfigured).toBe(true)
  })

  it("rejects a redirect URI with no scheme, which is the usual mistake", () => {
    // This one found a real gap. `new URL("localhost:3010/auth/callback")`
    // succeeds — it reads `localhost:` as the scheme — so the check used to
    // pass, and the failure surfaced on the first login as a WorkOS error that
    // says nothing about the cause. Now the protocol has to be http or https.
    setEnv({ NEXT_PUBLIC_WORKOS_REDIRECT_URI: "localhost:3010/auth/callback" })

    expect(getInfrastructureStatus().missingWorkOSEnvNames).toContain(
      "NEXT_PUBLIC_WORKOS_REDIRECT_URI"
    )
  })

  it("rejects a URL with a scheme we cannot call", () => {
    setEnv({ NEXT_PUBLIC_WORKOS_REDIRECT_URI: "ftp://example.com/callback" })

    expect(getInfrastructureStatus().workosConfigured).toBe(false)
  })

  it("accepts both http and https, since local dev is http", () => {
    for (const uri of [
      "http://localhost:3010/auth/callback",
      "https://energycurve.app/auth/callback",
    ]) {
      setEnv({ NEXT_PUBLIC_WORKOS_REDIRECT_URI: uri })

      expect(getInfrastructureStatus().workosConfigured, uri).toBe(true)
    }
  })

  it("rejects a Supabase URL with no scheme", () => {
    setEnv({ SUPABASE_URL: "project.supabase.co" })

    expect(getInfrastructureStatus().missingSupabaseEnvNames).toContain(
      "SUPABASE_URL"
    )
  })
})

describe("the two services are independent", () => {
  it("Supabase can be configured while WorkOS is not", () => {
    // This is the state a fresh checkout is in, and the one that makes the
    // difference between a guided setup page and a 500.
    setEnv({ WORKOS_API_KEY: "" })

    const status = getInfrastructureStatus()

    expect(status.workosConfigured).toBe(false)
    expect(status.supabaseConfigured).toBe(true)
  })

  it("and the other way round", () => {
    setEnv({ SUPABASE_URL: "" })

    const status = getInfrastructureStatus()

    expect(status.workosConfigured).toBe(true)
    expect(status.supabaseConfigured).toBe(false)
  })
})

describe("what it tells you when something is wrong", () => {
  it("names every missing variable, not just the first", () => {
    // A setup screen that reveals one missing variable per attempt is a
    // guessing game.
    setEnv({ WORKOS_API_KEY: "", WORKOS_CLIENT_ID: "" })

    expect(getInfrastructureStatus().missingWorkOSEnvNames.sort()).toEqual([
      "WORKOS_API_KEY",
      "WORKOS_CLIENT_ID",
    ])
  })

  it("never puts a value in the list, only a name", () => {
    // The list is rendered on a setup page and logged. Names are safe to show;
    // values are the secrets themselves.
    setEnv({ WORKOS_COOKIE_PASSWORD: "short-but-secret" })

    const serialised = JSON.stringify(getInfrastructureStatus())

    expect(serialised).not.toContain("short-but-secret")
  })
})
