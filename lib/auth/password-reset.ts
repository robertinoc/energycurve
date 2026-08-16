"use server"

import { getWorkOS } from "@workos-inc/authkit-nextjs"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  buildOriginFromHeaders,
  extractPasswordPolicyFailure,
  mapPasswordResetError,
} from "@/lib/auth/password-auth-helpers"
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_PARAM,
} from "@/lib/auth/password-policy"
import { buildBrandedEmail } from "@/lib/email/build-email-html"
import type { SiteLocale } from "@/lib/content/site-copy"
import { getLocaleByEmail } from "@/services/profile-service"
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

const RESET_COPY: Record<
  SiteLocale,
  {
    subject: string
    heading: string
    body: string
    button: string
    footnote: string
  }
> = {
  en: {
    subject: "Reset your EnergyCurve password",
    heading: "Reset your EnergyCurve password",
    body: "Someone requested a password reset for your EnergyCurve account. Click the button below to choose a new password.",
    button: "Reset password",
    footnote:
      "The link expires shortly. If you didn't request this, you can safely ignore this email — your password stays unchanged.",
  },
  es: {
    subject: "Restablecé tu contraseña de EnergyCurve",
    heading: "Restablecé tu contraseña de EnergyCurve",
    body: "Alguien pidió restablecer la contraseña de tu cuenta de EnergyCurve. Tocá el botón de abajo para elegir una nueva.",
    button: "Restablecer contraseña",
    footnote:
      "El link vence en poco tiempo. Si no fuiste vos, podés ignorar este mail tranquilo — tu contraseña queda como está.",
  },
}

function buildResetEmail(resetUrl: string, locale: SiteLocale) {
  const copy = RESET_COPY[locale]

  return buildBrandedEmail({
    preview: copy.subject,
    heading: copy.heading,
    paragraphs: [copy.body],
    button: { label: copy.button, url: resetUrl },
    footnote: copy.footnote,
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
    // Looked up by address rather than by session: whoever asks for a reset is
    // by definition not signed in. An unknown address yields English, which is
    // also the only safe answer — behaving differently for known and unknown
    // emails would turn this into an account-existence probe.
    const locale = await getLocaleByEmail(email)
    const { text, html } = buildResetEmail(resetUrl, locale)

    await sendTransactionalEmail({
      to: email,
      subject: RESET_COPY[locale].subject,
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

  // Same local mirror as signup: answer the shortest failure without
  // spending a round trip, and without burning the reset token.
  if (password.length < PASSWORD_MIN_LENGTH) {
    logWarn("auth.password_reset_too_short", {})
    redirect(
      `${backToForm}&error=password_too_short` +
        `&${PASSWORD_MIN_LENGTH_PARAM}=${PASSWORD_MIN_LENGTH}`
    )
  }

  try {
    await getWorkOS().userManagement.resetPassword({
      token,
      newPassword: password,
    })

    logInfo("auth.password_reset_completed", {})
  } catch (error) {
    const resetError = mapPasswordResetError(error)
    const reportedMinLength = extractPasswordPolicyFailure(error)?.minLength
    logWarn("auth.password_reset_failed", { resetError })
    redirect(
      `${backToForm}&error=${resetError}` +
        (reportedMinLength
          ? `&${PASSWORD_MIN_LENGTH_PARAM}=${reportedMinLength}`
          : "")
    )
  }

  redirect("/login?reset=1")
}
