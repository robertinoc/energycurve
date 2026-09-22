import "server-only"

import { buildBrandedEmail } from "@/lib/email/build-email-html"
import {
  isEmailDeliveryConfigured,
  sendTransactionalEmail,
} from "@/lib/email/send-email"
import { logInfo, logWarn } from "@/lib/observability/logger"
import type { PrivacyRequestKind } from "@/services/privacy-request-service"

/**
 * Tells us a rights request arrived, and starts the clock where it can be seen.
 *
 * Never throws. The row is the obligation; this mail is a convenience, and the
 * arrangement matters in that order. The failure mode of "write to hello@" was
 * the reverse — a mail that arrives and nothing recorded — so a mail that fails
 * while the row exists is a strictly better day than the one this replaces.
 *
 * The inbox is the same one the contact form uses, on purpose: a second
 * destination is a second place to not look, and `docs/compliance/dsar-procedure.md`
 * already names bus factor 1 as the compliance risk here rather than just an
 * operational one.
 */

const CONTACT_INBOX_EMAIL =
  process.env.CONTACT_INBOX_EMAIL ?? "energycurve.dev@gmail.com"

/**
 * What each kind means, spelled out in the mail rather than left as a code.
 *
 * The person reading this at 9am needs to know which legal deadline applies and
 * what the ask actually is. `kind=restrict` in a subject line answers neither.
 */
const KIND_SUMMARY: Record<PrivacyRequestKind, string> = {
  rectify_email: "Rectification of the account email (Art. 16)",
  object: "Objection to a processing activity (Art. 21)",
  restrict: "Restriction of processing (Art. 18)",
  other: "Other data-rights request (Arts. 12–22)",
}

export async function notifyPrivacyRequest(input: {
  kind: PrivacyRequestKind
  requestId: string
  requesterEmail: string
  details: string | null
  dueAt: string
}): Promise<void> {
  if (!isEmailDeliveryConfigured()) {
    // Not an error, and not silent either: the row is already saved and the
    // panel already shows it, so the honest description is that one of the two
    // notification paths is off — which is the normal state on a local machine.
    logInfo("privacy_request.notify_skipped", {
      requestId: input.requestId,
      reason: "email_not_configured",
    })

    return
  }

  const due = input.dueAt.slice(0, 10)

  const { html, text } = buildBrandedEmail({
    preview: `Data-rights request due ${due}`,
    heading: "A data-rights request arrived",
    paragraphs: [
      KIND_SUMMARY[input.kind],
      `From: ${input.requesterEmail}`,
      // Said in the mail because it is the thing most likely to be got wrong
      // under time pressure, and the procedure document is not open at 9am.
      `Answer due by ${due} — 30 calendar days, not working days. The two-month extension only exists if you tell them inside the first month.`,
      input.details
        ? `What they wrote: ${input.details}`
        : "They did not add a note.",
      `Request id: ${input.requestId}`,
      "This request came from inside an authenticated session, so the identity is already verified. Do not ask for a document — see docs/compliance/dsar-procedure.md.",
    ],
    footnote:
      "Answering does not close the row. Mark it answered in the backstage panel, or it keeps counting as overdue.",
  })

  // reply_to is the requester, so answering in Gmail answers them at the
  // account address — which is the address the procedure says to answer at.
  const delivered = await sendTransactionalEmail({
    to: CONTACT_INBOX_EMAIL,
    subject: `[Data rights] ${KIND_SUMMARY[input.kind]} — due ${due}`,
    text,
    html,
    replyTo: input.requesterEmail,
  })

  if (!delivered) {
    logWarn("privacy_request.notify_failed", { requestId: input.requestId })
  }
}
