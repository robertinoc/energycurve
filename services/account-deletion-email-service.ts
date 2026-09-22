import "server-only"

import { toSiteLocale } from "@/lib/analysis-locale"
import { buildBrandedEmail } from "@/lib/email/build-email-html"
import {
  isEmailDeliveryConfigured,
  sendTransactionalEmail,
} from "@/lib/email/send-email"
import type { SiteLocale } from "@/lib/content/site-copy"
import { logInfo, logWarn } from "@/lib/observability/logger"
import { SITE_URL } from "@/lib/seo"

/**
 * Tells somebody their account is scheduled for deletion.
 *
 * This is not a courtesy. It is the only control in the whole flow that catches
 * the case the flow cannot otherwise see: **somebody else scheduling a deletion
 * from a session that is not theirs.** The typed-email confirmation stops a
 * misclick; it does nothing against a hijacked session, because whoever has the
 * session can read the address off the page.
 *
 * The mail goes to the account address, which is the one place an attacker with
 * a session cookie does not necessarily reach. That is why it says what to do —
 * log in and undo it — and why the thirty-day window matters more than it looks:
 * it is thirty days for this mail to be read.
 *
 * Never throws. The deletion is already scheduled; a mail server having a bad
 * minute must not turn that into an error the person sees.
 */

const COPY: Record<
  SiteLocale,
  {
    subject: string
    preview: string
    heading: string
    paragraphs: (date: string) => string[]
    button: string
    footnote: string
  }
> = {
  en: {
    subject: "Your EnergyCurve account is scheduled for deletion",
    preview: "You have 30 days to undo this.",
    heading: "Your account is scheduled for deletion",
    paragraphs: (date) => [
      `On ${date} your EnergyCurve account and everything in it will be deleted: your sets, their tracks, your saved orders, your analyses and versions.`,
      "Until then nothing changes. Your account works normally and you can still download all of your data from the account page.",
      "If you did not ask for this, someone else has access to your account. Sign in, undo the deletion from the account page, and change your password.",
      "Your audio files are not affected — they were never on our servers.",
    ],
    button: "Undo it from your account page",
    footnote:
      "You are getting this because a deletion was scheduled for this account. It is the only warning we send.",
  },
  es: {
    subject: "Tu cuenta de EnergyCurve está programada para borrarse",
    preview: "Tenés 30 días para deshacerlo.",
    heading: "Tu cuenta está programada para borrarse",
    paragraphs: (date) => [
      `El ${date} se van a borrar tu cuenta de EnergyCurve y todo lo que tiene: tus sets, sus temas, los órdenes que guardaste, tus análisis y versiones.`,
      "Hasta entonces no cambia nada. Tu cuenta funciona normal y todavía podés descargar todos tus datos desde la página de tu cuenta.",
      "Si no pediste esto, alguien más tiene acceso a tu cuenta. Entrá, deshacé el borrado desde la página de tu cuenta, y cambiá tu contraseña.",
      "Tus archivos de audio no se ven afectados — nunca estuvieron en nuestros servidores.",
    ],
    button: "Deshacelo desde tu cuenta",
    footnote:
      "Recibís esto porque se programó un borrado para esta cuenta. Es el único aviso que mandamos.",
  },
}

const DATE_LOCALES: Record<SiteLocale, string> = { en: "en-GB", es: "es-AR" }

export async function sendDeletionScheduledEmail(input: {
  to: string
  scheduledFor: string
  preferredLocale: string | null
}): Promise<void> {
  if (!isEmailDeliveryConfigured()) {
    logInfo("account_deletion.email_skipped", { reason: "not_configured" })

    return
  }

  const locale = toSiteLocale(input.preferredLocale ?? undefined)
  const copy = COPY[locale]
  const date = new Date(input.scheduledFor).toLocaleDateString(
    DATE_LOCALES[locale],
    { day: "numeric", month: "long", year: "numeric" }
  )

  const { html, text } = buildBrandedEmail({
    preview: copy.preview,
    heading: copy.heading,
    paragraphs: copy.paragraphs(date),
    button: { label: copy.button, url: `${SITE_URL}/dashboard/account` },
    footnote: copy.footnote,
  })

  const delivered = await sendTransactionalEmail({
    to: input.to,
    subject: copy.subject,
    text,
    html,
  })

  if (!delivered) {
    // Worth a warning rather than silence: this mail is the only thing standing
    // between a hijacked session and a deletion nobody meant.
    logWarn("account_deletion.email_delivery_failed", {})
  }
}
