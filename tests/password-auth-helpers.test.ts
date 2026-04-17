import { describe, expect, it } from "vitest"

import {
  buildCallbackUrlFromHeaders,
  mapLoginError,
  mapSignupError,
} from "../lib/auth/password-auth-helpers"

function createHeadersStore(entries: Record<string, string | null>) {
  return {
    get(key: string) {
      return entries[key] ?? null
    },
  }
}

describe("mapLoginError", () => {
  it("maps invalid grant failures to invalid_credentials", () => {
    expect(mapLoginError("invalid_grant")).toBe("invalid_credentials")
  })

  it("falls back to auth for unknown failures", () => {
    expect(mapLoginError("unexpected failure")).toBe("auth")
  })
})

describe("mapSignupError", () => {
  it("maps duplicate account failures to email_taken", () => {
    expect(mapSignupError("User already exists")).toBe("email_taken")
  })

  it("maps password policy failures to weak_password", () => {
    expect(mapSignupError("Password too weak")).toBe("weak_password")
  })

  it("falls back to signup_failed for unknown failures", () => {
    expect(mapSignupError("Unexpected upstream failure")).toBe("signup_failed")
  })
})

describe("buildCallbackUrlFromHeaders", () => {
  it("builds callback URL from forwarded host/proto", () => {
    const result = buildCallbackUrlFromHeaders(
      createHeadersStore({
        "x-forwarded-host": "energycurve.vercel.app",
        "x-forwarded-proto": "https",
      }),
      undefined
    )

    expect(result).toBe("https://energycurve.vercel.app/auth/callback")
  })

  it("falls back to configured redirect URI when host is unavailable", () => {
    const result = buildCallbackUrlFromHeaders(
      createHeadersStore({}),
      "http://localhost:3010/auth/callback"
    )

    expect(result).toBe("http://localhost:3010/auth/callback")
  })
})
