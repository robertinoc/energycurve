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
