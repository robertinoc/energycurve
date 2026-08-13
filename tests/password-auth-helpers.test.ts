import { describe, expect, it } from "vitest"

import {
  buildCallbackUrlFromHeaders,
  extractPasswordPolicyFailure,
  mapLoginError,
  mapPasswordResetError,
  mapSignupError,
} from "../lib/auth/password-auth-helpers"

function createHeadersStore(entries: Record<string, string | null>) {
  return {
    get(key: string) {
      return entries[key] ?? null
    },
  }
}

/**
 * The exact body the WorkOS API returned for `POST /user_management/users`
 * with the password "a", captured on 13 Aug 2026. The node SDK surfaces a
 * 400 with `code` and `errors` intact as a BadRequestException.
 */
function createWorkOSStrengthError(
  errors: Array<Record<string, unknown>>
): Error {
  return Object.assign(new Error("Password does not meet strength requirements."), {
    name: "BadRequestException",
    status: 400,
    code: "password_strength_error",
    errors,
  })
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

  it("maps a taken address reported as email_not_available", () => {
    expect(
      mapSignupError(
        new Error("The following requirements must be met:\n\temail_not_available\n")
      )
    ).toBe("email_taken")
  })

  it("maps an unstructured password failure to weak_password", () => {
    expect(mapSignupError("Password too weak")).toBe("weak_password")
  })

  it("keeps the specific reason from a structured policy rejection", () => {
    const error = createWorkOSStrengthError([
      {
        code: "password_too_short",
        minimum_length: 10,
        message:
          "The provided password does not meet the minimum length requirements. Please try a password with 10 or more characters.",
      },
      { code: "password_too_weak", message: "The provided password is not strong enough. " },
    ])

    expect(mapSignupError(error)).toBe("password_too_short")
  })

  it("falls back to signup_failed for unknown failures", () => {
    expect(mapSignupError("Unexpected upstream failure")).toBe("signup_failed")
  })
})

describe("mapPasswordResetError", () => {
  it("reports a policy rejection instead of blaming the reset link", () => {
    const error = createWorkOSStrengthError([{ code: "password_pwned", occurrences: 4213 }])

    expect(mapPasswordResetError(error)).toBe("password_breached")
  })

  it("still reports a spent link as reset_invalid", () => {
    expect(mapPasswordResetError(new Error("Password reset token is invalid"))).toBe(
      "reset_invalid"
    )
  })

  it("falls back to reset_failed for unknown failures", () => {
    expect(mapPasswordResetError(new Error("upstream exploded"))).toBe("reset_failed")
  })
})

describe("extractPasswordPolicyFailure", () => {
  it("returns the reported minimum length alongside the code", () => {
    const error = createWorkOSStrengthError([
      { code: "password_too_short", minimum_length: 12 },
    ])

    expect(extractPasswordPolicyFailure(error)).toEqual({
      code: "password_too_short",
      minLength: 12,
    })
  })

  it("prefers the length reason when several rules trip at once", () => {
    const error = createWorkOSStrengthError([
      { code: "password_too_weak" },
      { code: "password_too_short", minimum_length: 10 },
    ])

    expect(extractPasswordPolicyFailure(error)?.code).toBe("password_too_short")
  })

  it("reads codes out of the SDK's flattened 422 message", () => {
    const error = new Error(
      "The following requirements must be met:\n\tpassword_pwned\n"
    )

    expect(extractPasswordPolicyFailure(error)?.code).toBe("password_breached")
  })

  it("reads codes out of a rawData payload", () => {
    const error = Object.assign(new Error("Unprocessable entity"), {
      rawData: {
        code: "password_strength_error",
        errors: [{ code: "password_contains_email" }],
      },
    })

    expect(extractPasswordPolicyFailure(error)?.code).toBe(
      "password_contains_email"
    )
  })

  it("recognises the PascalCase spelling used in the WorkOS docs", () => {
    const error = createWorkOSStrengthError([{ code: "PasswordTooLong" }])

    expect(extractPasswordPolicyFailure(error)?.code).toBe("password_too_long")
  })

  it("falls back to too_weak when only the umbrella code is present", () => {
    const error = Object.assign(new Error("Password does not meet strength requirements."), {
      code: "password_strength_error",
    })

    expect(extractPasswordPolicyFailure(error)?.code).toBe("password_too_weak")
  })

  it("returns null for failures that are not about the password", () => {
    expect(extractPasswordPolicyFailure(new Error("invalid_grant"))).toBeNull()
    expect(
      extractPasswordPolicyFailure(
        new Error("The following requirements must be met:\n\temail_not_available\n")
      )
    ).toBeNull()
  })

  it("survives non-object errors", () => {
    expect(extractPasswordPolicyFailure(undefined)).toBeNull()
    expect(extractPasswordPolicyFailure(null)).toBeNull()
    expect(extractPasswordPolicyFailure("boom")).toBeNull()
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
