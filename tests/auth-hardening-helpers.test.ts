import { describe, expect, it } from "vitest"

import {
  buildOriginFromHeaders,
  extractEmailVerificationChallenge,
  mapPasswordResetError,
} from "../lib/auth/password-auth-helpers"

function fakeHeaders(entries: Record<string, string>) {
  return {
    get: (key: string) => entries[key.toLowerCase()] ?? null,
  }
}

describe("buildOriginFromHeaders", () => {
  it("prefers forwarded host and proto", () => {
    expect(
      buildOriginFromHeaders(
        fakeHeaders({
          "x-forwarded-host": "app.energycurve.com",
          "x-forwarded-proto": "https",
          host: "internal:3010",
        })
      )
    ).toBe("https://app.energycurve.com")
  })

  it("falls back to host with https default", () => {
    expect(buildOriginFromHeaders(fakeHeaders({ host: "localhost:3010" }))).toBe(
      "https://localhost:3010"
    )
  })

  it("returns null without any host", () => {
    expect(buildOriginFromHeaders(fakeHeaders({}))).toBeNull()
  })
})

describe("extractEmailVerificationChallenge", () => {
  it("extracts the pending token from the SDK error shape", () => {
    const challenge = extractEmailVerificationChallenge({
      rawData: {
        code: "email_verification_required",
        pending_authentication_token: "pat_123",
      },
    })

    expect(challenge).toEqual({ pendingAuthenticationToken: "pat_123" })
  })

  it("supports the flattened error shape", () => {
    const challenge = extractEmailVerificationChallenge({
      code: "email_verification_required",
      pending_authentication_token: "pat_456",
    })

    expect(challenge).toEqual({ pendingAuthenticationToken: "pat_456" })
  })

  it("returns null for other error codes", () => {
    expect(
      extractEmailVerificationChallenge({
        rawData: { code: "invalid_credentials" },
      })
    ).toBeNull()
  })

  it("returns null when the token is missing or not a string", () => {
    expect(
      extractEmailVerificationChallenge({
        rawData: { code: "email_verification_required" },
      })
    ).toBeNull()
    expect(
      extractEmailVerificationChallenge({
        rawData: {
          code: "email_verification_required",
          pending_authentication_token: 42,
        },
      })
    ).toBeNull()
  })

  it("returns null for non-object errors", () => {
    expect(extractEmailVerificationChallenge("boom")).toBeNull()
    expect(extractEmailVerificationChallenge(null)).toBeNull()
  })
})

describe("mapPasswordResetError", () => {
  it("maps expired or invalid tokens", () => {
    expect(mapPasswordResetError(new Error("Token has expired"))).toBe(
      "reset_invalid"
    )
    expect(mapPasswordResetError(new Error("invalid token"))).toBe(
      "reset_invalid"
    )
  })

  it("maps password policy failures", () => {
    expect(
      mapPasswordResetError(new Error("Password does not meet strength"))
    ).toBe("weak_password")
  })

  it("falls back to reset_failed", () => {
    expect(mapPasswordResetError(new Error("network down"))).toBe(
      "reset_failed"
    )
  })
})
