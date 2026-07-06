"use server"

import { getWorkOS } from "@workos-inc/authkit-nextjs"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  buildOriginFromHeaders,
  mapPasswordResetError,
} from "@/lib/auth/password-auth-helpers"
import { buildBrandedEmail } from "@/lib/email/build-email-html"
import {
  isEmailDeliveryConfigured,
  sendTransactionalEmail,
} from "@/lib/email/send-email"
import { logError, logInfo, logWarn } from "@/lib/observability/logger"
import { checkRateLimit } from "@/lib/rate-limit"

const RESET_REQUEST_LIMIT = { limit: 5, windowMs: 15 * 60_000 }

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value.trim() : ""
}

function buildResetEmail(resetUrl: string) {
  return buildBrandedEmail({
    preview: "Reset your EnergyCurve password",
    heading: "Reset your EnergyCurve password",
    paragraphs: [
      "Someone requested a password reset for your EnergyCurve account. Click the button below to choose a new password.",
    ],
    button: { label: "Reset password", url: resetUrl },
    footnote:
      "The link expires shortly. If you didn't request this, you can safely ignore this email — your password stays unchanged.",
  })
}

export async function forgotPasswordAction(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase()

  if (!email) {
    redirect("/forgot-password?error=missing_email")
  }

  if (!isEmailDeliveryConfigured()) {
    // Honest failure: without an email provider we cannot deliver the link,
    // so don't pretend we sent one.
    logWarn("auth.password_reset_unavailable", { email })
    redirect("/forgot-password?error=unavailable")
  }

  const { allowed } = checkRateLimit({
    key: `password-reset:${email}`,
    limit: RESET_REQUEST_LIMIT.limit,
    windowMs: RESET_REQUEST_LIMIT.windowMs,
  })

  if (!allowed) {
    logWarn("auth.password_reset_rate_limited", { email })
    // Neutral response — same as success, to avoid enumeration.
    redirect("/forgot-password?sent=1")
  }

  const headersStore = await headers()
  const origin = buildOriginFromHeaders(headersStore)

  if (!origin) {
    logError(
      "auth.password_reset_missing_origin",
      new Error("Could not derive request origin"),
      { email }
    )
    redirect("/forgot-password?error=config")
  }

  try {
    const reset = await getWorkOS().userManagement.createPasswordReset({
      email,
    })

    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(
      reset.passwordResetToken
    )}`
    const { text, html } = buildResetEmail(resetUrl)

    await sendTransactionalEmail({
      to: email,
      subject: "Reset your EnergyCurve password",
      text,
      html,
    })

    logInfo("auth.password_reset_requested", { email })
  } catch (error) {
    // Unknown emails land here — log it, but answer exactly like success so
    // the form can't be used to probe which accounts exist.
    logWarn("auth.password_reset_request_failed", {
      email,
      reason: error instanceof Error ? error.message : "Unknown reset error",
    })
  }

  redirect("/forgot-password?sent=1")
}

export async function resetPasswordAction(formData: FormData) {
  const token = getFormValue(formData, "token")
  const password = getFormValue(formData, "password")
  const confirmPassword = getFormValue(formData, "confirmPassword")

  if (!token) {
    redirect("/forgot-password?error=missing_token")
  }

  const backToForm = `/reset-password?token=${encodeURIComponent(token)}`

  if (!password || !confirmPassword) {
    redirect(`${backToForm}&error=missing_fields`)
  }

  if (password !== confirmPassword) {
    redirect(`${backToForm}&error=password_mismatch`)
  }

  try {
    await getWorkOS().userManagement.resetPassword({
      token,
      newPassword: password,
    })

    logInfo("auth.password_reset_completed", {})
  } catch (error) {
    const resetError = mapPasswordResetError(error)
    logWarn("auth.password_reset_failed", { resetError })
    redirect(`${backToForm}&error=${resetError}`)
  }

  redirect("/login?reset=1")
}
