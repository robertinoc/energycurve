export function mapLoginError(error: unknown) {
  const message = String(error).toLowerCase()

  if (message.includes("invalid_grant") || message.includes("invalid")) {
    return "invalid_credentials"
  }

  return "auth"
}

export function mapSignupError(error: unknown) {
  const message = String(error).toLowerCase()

  if (message.includes("already exists") || message.includes("duplicate")) {
    return "email_taken"
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
  const message = String(error).toLowerCase()

  if (message.includes("expired") || message.includes("invalid")) {
    return "reset_invalid"
  }

  if (message.includes("password")) {
    return "weak_password"
  }

  return "reset_failed"
}
