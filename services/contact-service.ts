import "server-only"

import { ContactFormInput } from "@/lib/contact-form"
import { buildBrandedEmail } from "@/lib/email/build-email-html"
import {
  isEmailDeliveryConfigured,
  sendTransactionalEmail,
} from "@/lib/email/send-email"
import { logInfo, logWarn } from "@/lib/observability/logger"

interface ContactSubmissionContext {
  ipAddress: string
  userAgent: string | null
  origin: string
}

/** Where contact-form messages are delivered. Override with an env var. */
const CONTACT_INBOX_EMAIL =
  process.env.CONTACT_INBOX_EMAIL ?? "energycurve.dev@gmail.com"

export async function submitContactMessage(
  input: ContactFormInput,
  context: ContactSubmissionContext
) {
  const referenceId = `ec_${crypto.randomUUID()}`

  // Structured log stays as an always-on record, even when email delivery
  // isn't configured (local/dev) or Resend has a hiccup.
  logInfo("contact.submission_received", {
    referenceId,
    submittedAt: new Date().toISOString(),
    input: {
      name: input.name,
      email: input.email,
      message: input.message,
    },
    context: {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      origin: context.origin,
    },
  })

  if (!isEmailDeliveryConfigured()) {
    logWarn("contact.email_not_configured", { referenceId })
    return { referenceId }
  }

  const { html, text } = buildBrandedEmail({
    preview: `New contact message from ${input.name}`,
    heading: "New contact message",
    paragraphs: [
      `From: ${input.name} <${input.email}>`,
      `Message: ${input.message}`,
      `Reference: ${referenceId}`,
    ],
    footnote: `Sent from ${context.origin} · reply directly to reach ${input.name}.`,
  })

  // reply_to is the submitter, so hitting "Reply" in Gmail answers them.
  const delivered = await sendTransactionalEmail({
    to: CONTACT_INBOX_EMAIL,
    subject: `New contact message from ${input.name}`,
    text,
    html,
    replyTo: input.email,
  })

  if (!delivered) {
    logWarn("contact.email_delivery_failed", { referenceId })
  }

  return { referenceId }
}
