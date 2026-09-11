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
  //
  // What it records changed on 2026-09-11. It used to carry the sender's name,
  // their email address, the **full text of their message** and their IP, into
  // an application log with no retention policy, no redaction layer and no
  // access control beyond the hosting dashboard. Someone writing in about a
  // billing problem, or quoting a private setlist, had it copied into a place
  // nobody would think to look for their data — and nothing was ever deleting
  // it. The privacy policy does not mention it either.
  //
  // The log's job is to prove a submission happened when delivery failed. That
  // needs an identifier and a timestamp, not the contents. The contents go to
  // the inbox, which is where someone is going to answer them from anyway, and
  // the reference id ties the two together.
  logInfo("contact.submission_received", {
    referenceId,
    submittedAt: new Date().toISOString(),
    // Lengths, not values: enough to tell a real message from an empty one or
    // from a flood of identical bot posts, without storing what was said.
    nameLength: input.name.length,
    messageLength: input.message.length,
    emailDomain: input.email.split("@")[1] ?? "unknown",
    origin: context.origin,
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
