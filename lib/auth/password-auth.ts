"use server"

import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs"
import type { AuthenticationResponse } from "@workos-inc/node"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  buildCallbackUrlFromHeaders,
  extractEmailVerificationChallenge,
  extractPasswordPolicyFailure,
  mapLoginError,
  mapSignupError,
} from "@/lib/auth/password-auth-helpers"
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_PARAM,
} from "@/lib/auth/password-policy"
import { captureServerEvent } from "@/lib/analytics/posthog-server"
import { buildReturnToHref, getSafeReturnTo } from "@/lib/auth/return-to"
import { logError, logInfo, logWarn } from "@/lib/observability/logger"
import {
  getProfileByWorkOSUserId,
  syncProfileFromWorkOSUser,
} from "@/services/profile-service"

// Not exported: "use server" modules may only export async functions.
class SuspendedAccountLoginError extends Error {}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value.trim() : ""
}

async function getRequestContextUrl() {
  const headersStore = await headers()
  return buildCallbackUrlFromHeaders(
    headersStore,
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  )
}

async function getAuthTelemetryContext(email: string) {
  const headersStore = await headers()

  return {
    email,
    userAgent: headersStore.get("user-agent") ?? null,
    forwardedHost: headersStore.get("x-forwarded-host") ?? headersStore.get("host"),
    forwardedProto: headersStore.get("x-forwarded-proto") ?? null,
  }
}

export async function persistWorkOSSession(
  authResponse: AuthenticationResponse,
  requestUrl: string
): Promise<{ profileId: string | null }> {
  try {
    await saveSession(
      {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        user: authResponse.user,
        impersonator: authResponse.impersonator,
      },
      requestUrl
    )
  } catch (error) {
    logError("auth.session_persist_failed", error, {
      email: authResponse.user.email,
      workosUserId: authResponse.user.id,
    })

    throw error
  }

  // Profile sync must not fail the whole auth flow: the session cookie is
  // already saved, so failing here strands the user half-authenticated in a
  // redirect loop. The dashboard bootstrap re-syncs the profile and renders
  // a guided database warning when Supabase is unreachable (decision 5).
  try {
    const profile = await syncProfileFromWorkOSUser({
      id: authResponse.user.id,
      email: authResponse.user.email,
      firstName: authResponse.user.firstName ?? null,
      lastName: authResponse.user.lastName ?? null,
    })

    return { profileId: profile.id }
  } catch (error) {
    logWarn("auth.profile_sync_deferred", {
      email: authResponse.user.email,
      workosUserId: authResponse.user.id,
      reason:
        error instanceof Error ? error.message : "Unknown profile sync error",
    })

    return { profileId: null }
  }
}

export async function loginWithPasswordAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getFormValue(formData, "returnTo"))
  const email = getFormValue(formData, "email")
  const password = getFormValue(formData, "password")

  if (!email || !password) {
    logWarn("auth.login_missing_fields", { email: email || null, returnTo })
    redirect(`${buildReturnToHref("/login", returnTo)}&error=missing_fields`)
  }

  const requestUrl = await getRequestContextUrl()

  if (!requestUrl) {
    logError("auth.login_missing_callback_url", new Error("Missing callback URL"), {
      email,
      returnTo,
    })
    redirect(`${buildReturnToHref("/login", returnTo)}&error=config`)
  }

  try {
    const headersStore = await headers()
    const authResponse = await getWorkOS().userManagement.authenticateWithPassword(
      {
        clientId: process.env.WORKOS_CLIENT_ID,
        email,
        password,
        userAgent: headersStore.get("user-agent") ?? undefined,
      }
    )

    // Suspension gate (backstage admin panel). Checked before the session
    // is persisted so a suspended account never gets a cookie. The lookup
    // fails open: a Supabase hiccup must not lock every user out of login —
    // the dashboard layout re-checks suspension on every page load anyway.
    let suspended = false

    try {
      const profile = await getProfileByWorkOSUserId(authResponse.user.id)
      suspended = Boolean(profile?.suspended_at)
    } catch (lookupError) {
      logWarn("auth.suspension_check_skipped", {
        email,
        workosUserId: authResponse.user.id,
        reason:
          lookupError instanceof Error
            ? lookupError.message
            : "Unknown lookup error",
      })
    }

    if (suspended) {
      throw new SuspendedAccountLoginError("Account suspended")
    }

    await persistWorkOSSession(authResponse, requestUrl)
    logInfo("auth.login_succeeded", {
      email,
      workosUserId: authResponse.user.id,
      returnTo,
    })
  } catch (error) {
    if (error instanceof SuspendedAccountLoginError) {
      logWarn("auth.login_blocked_suspended", { email, returnTo })
      redirect(
        `${buildReturnToHref("/login", returnTo)}&error=account_suspended`
      )
    }

    const challenge = extractEmailVerificationChallenge(error)

    if (challenge) {
      logInfo("auth.login_verification_pending", { email, returnTo })
      redirect(
        `/verify-email?pending=${encodeURIComponent(
          challenge.pendingAuthenticationToken
        )}&email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`
      )
    }

    const authError = mapLoginError(error)
    logWarn("auth.login_failed", {
      ...(await getAuthTelemetryContext(email)),
      returnTo,
      authError,
    })

    redirect(
      `${buildReturnToHref("/login", returnTo)}&error=${authError}`
    )
  }

  redirect(returnTo)
}

export async function signupWithPasswordAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getFormValue(formData, "returnTo"))
  const email = getFormValue(formData, "email")
  const password = getFormValue(formData, "password")
  const confirmPassword = getFormValue(formData, "confirmPassword")

  if (!email || !password || !confirmPassword) {
    logWarn("auth.signup_missing_fields", { email: email || null, returnTo })
    redirect(`${buildReturnToHref("/signup", returnTo)}&error=missing_fields`)
  }

  if (password !== confirmPassword) {
    logWarn("auth.signup_password_mismatch", { email, returnTo })
    redirect(
      `${buildReturnToHref("/signup", returnTo)}&error=password_mismatch`
    )
  }

  // Mirrored locally so the shortest failure answers immediately with the
  // specific reason, instead of spending a WorkOS round trip to be told the
  // same thing. WorkOS remains the authority on everything else.
  if (password.length < PASSWORD_MIN_LENGTH) {
    logWarn("auth.signup_password_too_short", { email, returnTo })
    redirect(
      `${buildReturnToHref("/signup", returnTo)}&error=password_too_short` +
        `&${PASSWORD_MIN_LENGTH_PARAM}=${PASSWORD_MIN_LENGTH}`
    )
  }

  const requestUrl = await getRequestContextUrl()

  if (!requestUrl) {
    logError("auth.signup_missing_callback_url", new Error("Missing callback URL"), {
      email,
      returnTo,
    })
    redirect(`${buildReturnToHref("/signup", returnTo)}&error=config`)
  }

  // Production hardening flag: when on, WorkOS keeps the account unverified
  // and emails a one-time code; the user lands on /verify-email before a
  // session exists. Defaults to the documented MVP bypass so existing
  // environments keep working until the flow is verified end to end.
  const requireEmailVerification =
    process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true"

  try {
    const headersStore = await headers()

    await getWorkOS().userManagement.createUser({
      email,
      password,
      ...(requireEmailVerification ? {} : { emailVerified: true }),
    })

    const authResponse = await getWorkOS().userManagement.authenticateWithPassword(
      {
        clientId: process.env.WORKOS_CLIENT_ID,
        email,
        password,
        userAgent: headersStore.get("user-agent") ?? undefined,
      }
    )

    const { profileId } = await persistWorkOSSession(authResponse, requestUrl)
    logInfo("auth.signup_succeeded", {
      email,
      workosUserId: authResponse.user.id,
      returnTo,
      emailVerifiedBypass: !requireEmailVerification,
    })

    if (profileId) {
      captureServerEvent(profileId, "signup", { method: "password" })
    }
  } catch (error) {
    const challenge = extractEmailVerificationChallenge(error)

    if (challenge) {
      logInfo("auth.signup_verification_pending", { email, returnTo })
      redirect(
        `/verify-email?pending=${encodeURIComponent(
          challenge.pendingAuthenticationToken
        )}&email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`
      )
    }

    const signupError = mapSignupError(error)
    // When WorkOS reports its own minimum, carry it back so the form quotes
    // the real number rather than our mirrored constant.
    const reportedMinLength = extractPasswordPolicyFailure(error)?.minLength
    logWarn("auth.signup_failed", {
      ...(await getAuthTelemetryContext(email)),
      returnTo,
      signupError,
    })

    redirect(
      `${buildReturnToHref("/signup", returnTo)}&error=${signupError}` +
        (reportedMinLength
          ? `&${PASSWORD_MIN_LENGTH_PARAM}=${reportedMinLength}`
          : "")
    )
  }

  redirect(returnTo)
}
