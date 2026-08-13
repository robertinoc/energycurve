/**
 * Reasons WorkOS can reject a password, kept distinct instead of collapsed
 * into one "weak password" bucket — "add four more characters" and "this
 * password has leaked publicly" need different things from the user.
 */
export type PasswordPolicyErrorCode =
  | "password_too_short"
  | "password_too_long"
  | "password_breached"
  | "password_contains_email"
  | "password_missing_character"
  | "password_too_weak"

export interface PasswordPolicyFailure {
  code: PasswordPolicyErrorCode
  /** Minimum length WorkOS reported, when the payload carries one. */
  minLength?: number
}

/**
 * Substrings that identify each reason, most actionable first. Matched against
 * every code and message string in the payload rather than compared exactly:
 * WorkOS returns snake_case codes over the wire (`password_too_short`) while
 * its own docs name the same failures in PascalCase (`PasswordTooShort`), and
 * the node SDK flattens 422 bodies into a newline-joined message of bare codes.
 * Order matters — a rejected password usually trips several rules at once, and
 * the length one is the one worth telling the user about first.
 */
const PASSWORD_POLICY_MATCHERS: Array<{
  code: PasswordPolicyErrorCode
  tokens: string[]
}> = [
  { code: "password_too_short", tokens: ["too_short", "tooshort", "minimum length"] },
  {
    code: "password_breached",
    tokens: ["pwned", "breach", "leaked", "compromised"],
  },
  {
    code: "password_contains_email",
    tokens: ["contains_email", "containsemail"],
  },
  {
    code: "password_missing_character",
    tokens: ["missing_character", "missingcharacter", "character_type", "charactertype"],
  },
  { code: "password_too_long", tokens: ["too_long", "toolong", "maximum length"] },
  {
    code: "password_too_weak",
    tokens: ["too_weak", "tooweak", "strength", "not strong enough"],
  },
]

function collectPolicyStrings(error: unknown): {
  haystack: string
  minLength?: number
} {
  const parts: string[] = [String(error)]
  let minLength: number | undefined

  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      code?: unknown
      message?: unknown
      errors?: unknown
      rawData?: unknown
    }
    const raw =
      typeof candidate.rawData === "object" && candidate.rawData !== null
        ? (candidate.rawData as Record<string, unknown>)
        : {}

    for (const value of [candidate.code, candidate.message, raw["code"], raw["message"]]) {
      if (typeof value === "string") {
        parts.push(value)
      }
    }

    const errorLists = [candidate.errors, raw["errors"]]

    for (const list of errorLists) {
      if (!Array.isArray(list)) {
        continue
      }

      for (const entry of list) {
        if (typeof entry === "string") {
          parts.push(entry)
          continue
        }

        if (typeof entry !== "object" || entry === null) {
          continue
        }

        const detail = entry as Record<string, unknown>

        for (const key of ["code", "message"]) {
          if (typeof detail[key] === "string") {
            parts.push(detail[key] as string)
          }
        }

        for (const key of ["minimum_length", "minimumLength"]) {
          const value = detail[key]

          if (typeof value === "number" && Number.isInteger(value) && value > 0) {
            minLength = value
          }
        }
      }
    }
  }

  return { haystack: parts.join("\n").toLowerCase(), minLength }
}

/**
 * Pulls the specific password-policy reason out of a WorkOS failure, or null
 * when the failure was about something else. Returns the reported minimum
 * length when WorkOS sends one, so the message can quote the real number
 * instead of our mirrored constant if the dashboard policy has moved.
 */
export function extractPasswordPolicyFailure(
  error: unknown
): PasswordPolicyFailure | null {
  const { haystack, minLength } = collectPolicyStrings(error)

  if (!haystack.includes("password")) {
    return null
  }

  for (const { code, tokens } of PASSWORD_POLICY_MATCHERS) {
    if (tokens.some((token) => haystack.includes(token))) {
      return minLength ? { code, minLength } : { code }
    }
  }

  return null
}

export function mapLoginError(error: unknown) {
  const message = String(error).toLowerCase()

  if (message.includes("invalid_grant") || message.includes("invalid")) {
    return "invalid_credentials"
  }

  return "auth"
}

export function mapSignupError(error: unknown) {
  const message = String(error).toLowerCase()

  if (
    message.includes("already exists") ||
    message.includes("duplicate") ||
    // What the API actually returns for a taken address; without it a
    // duplicate signup fell through to the generic "sign up failed".
    message.includes("email_not_available")
  ) {
    return "email_taken"
  }

  const policyFailure = extractPasswordPolicyFailure(error)

  if (policyFailure) {
    return policyFailure.code
  }

  if (message.includes("password")) {
    return "weak_password"
  }

  return "signup_failed"
}

export function buildCallbackUrlFromHeaders(
  headersStore: Pick<Headers, "get">,
  fallbackUrl?: string
) {
  const host =
    headersStore.get("x-forwarded-host") ?? headersStore.get("host") ?? null
  const protocol = headersStore.get("x-forwarded-proto") ?? "https"

  if (host) {
    return `${protocol}://${host}/auth/callback`
  }

  return fallbackUrl
}

export function buildOriginFromHeaders(
  headersStore: Pick<Headers, "get">
): string | null {
  const host =
    headersStore.get("x-forwarded-host") ?? headersStore.get("host") ?? null
  const protocol = headersStore.get("x-forwarded-proto") ?? "https"

  return host ? `${protocol}://${host}` : null
}

export interface EmailVerificationChallenge {
  pendingAuthenticationToken: string
}

/**
 * When AUTH_REQUIRE_EMAIL_VERIFICATION is on, authenticating an unverified
 * user makes WorkOS throw an `email_verification_required` error carrying a
 * pending authentication token (WorkOS emails the one-time code itself).
 * Extracts that token defensively from the SDK error shape.
 */
export function extractEmailVerificationChallenge(
  error: unknown
): EmailVerificationChallenge | null {
  if (typeof error !== "object" || error === null) {
    return null
  }

  const candidate = error as {
    rawData?: Record<string, unknown>
    code?: unknown
    error?: unknown
  }
  const raw = candidate.rawData ?? (candidate as Record<string, unknown>)
  const code = raw["code"] ?? candidate.code ?? candidate.error

  if (code !== "email_verification_required") {
    return null
  }

  const token = raw["pending_authentication_token"]

  if (typeof token !== "string" || token.length === 0) {
    return null
  }

  return { pendingAuthenticationToken: token }
}

export function mapPasswordResetError(error: unknown) {
  // Checked before the token branch: a policy rejection carries structured
  // codes, while "invalid" in a reset failure means the *link* is spent —
  // sending someone back to request a new link over a short password would
  // be the same dead end this flow already had.
  const policyFailure = extractPasswordPolicyFailure(error)

  if (policyFailure) {
    return policyFailure.code
  }

  const message = String(error).toLowerCase()

  if (message.includes("expired") || message.includes("invalid")) {
    return "reset_invalid"
  }

  if (message.includes("password")) {
    return "weak_password"
  }

  return "reset_failed"
}
