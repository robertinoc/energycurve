"use server"

import { getWorkOS } from "@workos-inc/authkit-nextjs"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { captureServerEvent } from "@/lib/analytics/posthog-server"
import {
  buildCallbackUrlFromHeaders,
  extractEmailVerificationChallenge,
} from "@/lib/auth/password-auth-helpers"
import { persistWorkOSSession } from "@/lib/auth/password-auth"
import { getSafeReturnTo } from "@/lib/auth/return-to"
import { logInfo, logWarn } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value.trim() : ""
}

function buildVerifyHref(params: {
  pending: string
  email: string
  returnTo: string
  error?: string
  resent?: boolean
}) {
  const query = new URLSearchParams({
    pending: params.pending,
    email: params.email,
    returnTo: params.returnTo,
  })

  if (params.error) {
    query.set("error", params.error)
  }

  if (params.resent) {
    query.set("resent", "1")
  }

  return `/verify-email?${query.toString()}`
}

export async function verifyEmailAction(formData: FormData) {
  const pending = getFormValue(formData, "pending")
  const email = getFormValue(formData, "email")
  const returnTo = getSafeReturnTo(getFormValue(formData, "returnTo"))
  const code = getFormValue(formData, "code")

  if (!pending || !email) {
    redirect("/signup?error=signup_failed")
  }

  if (!code) {
    redirect(
      buildVerifyHref({ pending, email, returnTo, error: "missing_code" })
    )
  }

  const headersStore = await headers()
  const requestUrl = buildCallbackUrlFromHeaders(
    headersStore,
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  )

  if (!requestUrl) {
    redirect(buildVerifyHref({ pending, email, returnTo, error: "config" }))
  }

  try {
    const authResponse =
      await getWorkOS().userManagement.authenticateWithEmailVerification({
        clientId: process.env.WORKOS_CLIENT_ID,
        code,
        pendingAuthenticationToken: pending,
      })

    const { profileId } = await persistWorkOSSession(authResponse, requestUrl)
    logInfo("auth.email_verified", {
      email,
      workosUserId: authResponse.user.id,
    })

    if (profileId) {
      captureServerEvent(profileId, "signup", {
        method: "password",
        emailVerified: true,
      })
    }
  } catch (error) {
    // A stale pending token surfaces a fresh challenge — reuse it so the
    // user can retry with the newly emailed code.
    const freshChallenge = extractEmailVerificationChallenge(error)
    const nextPending =
      freshChallenge?.pendingAuthenticationToken ?? pending

    logWarn("auth.email_verification_failed", {
      email,
      reason: error instanceof Error ? error.message : "Unknown verify error",
    })

    redirect(
      buildVerifyHref({
        pending: nextPending,
        email,
        returnTo,
        error: "invalid_code",
      })
    )
  }

  redirect(returnTo)
}

export async function resendVerificationEmailAction(formData: FormData) {
  const pending = getFormValue(formData, "pending")
  const email = getFormValue(formData, "email")
  const returnTo = getSafeReturnTo(getFormValue(formData, "returnTo"))

  if (!pending || !email) {
    redirect("/signup?error=signup_failed")
  }

  const { allowed } = checkRateLimit({
    key: `verify-resend:${email}`,
    limit: 3,
    windowMs: 10 * 60_000,
  })

  if (!allowed) {
    logWarn("auth.verification_resend_rate_limited", { email })
    redirect(buildVerifyHref({ pending, email, returnTo, resent: true }))
  }

  try {
    const users = await getWorkOS().userManagement.listUsers({ email })
    const user = users.data[0]

    if (user) {
      await getWorkOS().userManagement.sendVerificationEmail({
        userId: user.id,
      })
      logInfo("auth.verification_email_resent", { email })
    }
  } catch (error) {
    logWarn("auth.verification_resend_failed", {
      email,
      reason: error instanceof Error ? error.message : "Unknown resend error",
    })
  }

  redirect(buildVerifyHref({ pending, email, returnTo, resent: true }))
}
