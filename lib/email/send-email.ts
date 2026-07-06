import "server-only"

import { logError, logInfo, logWarn } from "@/lib/observability/logger"

/**
 * Minimal transactional email sender over the Resend REST API — no SDK
 * dependency. Optional infrastructure: when RESEND_API_KEY /
 * RESEND_FROM_EMAIL are unset, senders report `false` and callers decide
 * how to degrade (same contract as analytics and logging).
 */
export function isEmailDeliveryConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
  )
}

export async function sendTransactionalEmail(options: {
  to: string
  subject: string
  text: string
  html: string
  /** Optional reply-to (e.g. a contact form sender so replies go to them). */
  replyTo?: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    logWarn("email.delivery_not_configured", { subject: options.subject })
    return false
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html,
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      logError("email.send_failed", new Error(`Resend HTTP ${response.status}`), {
        subject: options.subject,
        responseBody: body.slice(0, 300),
      })
      return false
    }

    logInfo("email.sent", { subject: options.subject })
    return true
  } catch (error) {
    logError("email.send_failed", error, { subject: options.subject })
    return false
  }
}
