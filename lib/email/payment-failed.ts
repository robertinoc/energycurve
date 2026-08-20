/**
 * The email a paying customer gets when their card is declined.
 *
 * Written for the person on the receiving end of a bank hiccup, not for a
 * collections department. Three jobs, in this order:
 *
 * 1. **Say plainly what happened and what it costs them right now.** A failed
 *    payment is not the customer's mistake in the vast majority of cases — an
 *    expired card, a new bank, a fraud filter — and copy that reads like an
 *    accusation gets ignored or resented.
 * 2. **Say whether they still have access.** This is the question they actually
 *    have, and the two states have different answers: while Stripe is retrying
 *    their plan keeps working, and once the retries run out it doesn't.
 * 3. **Give them the one link that fixes it.** The Stripe portal, nothing else.
 *
 * Deliberately no urgency theatre: no countdowns, no "act now", no red. Stripe
 * already sends its own dunning emails, so this is the one that should sound
 * like a person telling you your card bounced.
 *
 * Pure — takes a state, returns content. Nothing here reaches the network, so
 * every claim it makes is testable.
 */

import { buildBrandedEmail } from "@/lib/email/build-email-html"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { Plan } from "@/lib/product/plans"

export interface PaymentFailedEmailContent {
  subject: string
  html: string
  text: string
}

const PLAN_NAMES: Record<Plan, string> = {
  free: "FREE",
  pro: "PRO",
  pro_plus: "PRO+",
}

const STRINGS = {
  en: {
    subject: (plan: string) => `Your ${plan} payment didn't go through`,
    preview: "Your card was declined — here's how to fix it.",
    heading: "Your card was declined",
    retrying: (plan: string) =>
      `Your bank turned down the last charge for ${plan}. It happens — an expired card, a new bank, a fraud filter that didn't recognise us.`,
    keepsWorking: (plan: string) =>
      `${plan} keeps working while we retry, so nothing changes for you today. If the retries run out, it switches off until the payment goes through.`,
    exhausted: (plan: string) =>
      `We tried a few more times and it kept bouncing, so ${plan} is off for now. Everything you made is untouched and comes back the moment the payment clears.`,
    statement:
      "One thing worth knowing: the charge reads StageLink LLC on your statement, not EnergyCurve. If your bank flagged it as unfamiliar, that's usually why.",
    button: "Update your card",
    footnote:
      "If you meant to cancel, you can ignore this — nothing more will be charged.",
  },
  es: {
    subject: (plan: string) => `No se pudo procesar tu pago de ${plan}`,
    preview: "Tu tarjeta fue rechazada — así lo arreglás.",
    heading: "Tu tarjeta fue rechazada",
    retrying: (plan: string) =>
      `Tu banco rechazó el último cobro de ${plan}. Pasa — una tarjeta vencida, un banco nuevo, un filtro antifraude que no nos reconoció.`,
    keepsWorking: (plan: string) =>
      `${plan} sigue funcionando mientras reintentamos, así que hoy no cambia nada para vos. Si se agotan los reintentos, se apaga hasta que el pago pase.`,
    exhausted: (plan: string) =>
      `Reintentamos unas veces más y siguió rebotando, así que ${plan} está apagado por ahora. Todo lo que hiciste está intacto y vuelve en el momento en que el pago pase.`,
    statement:
      "Un dato que conviene saber: el cobro figura como StageLink LLC en tu resumen, no como EnergyCurve. Si tu banco lo marcó como desconocido, normalmente es por eso.",
    button: "Actualizar tu tarjeta",
    footnote:
      "Si querías cancelar, podés ignorar esto — no se va a cobrar nada más.",
  },
} as const

/**
 * Builds the notice for a failed payment.
 *
 * `free` returns null rather than throwing: the caller is a webhook branch, and a
 * plan that shouldn't produce an email is a reason to send nothing, not a reason
 * to 500 and have Stripe retry forever.
 *
 * `retriesExhausted` picks between the two honest answers to "do I still have
 * access". Getting it wrong in either direction is worse than the email not
 * existing: promising access that's gone, or announcing a loss that hasn't
 * happened.
 */
export function buildPaymentFailedEmail(options: {
  plan: Plan
  appUrl: string
  /** True once Stripe has stopped retrying and the plan is actually off. */
  retriesExhausted: boolean
  locale?: SiteLocale
}): PaymentFailedEmailContent | null {
  if (options.plan === "free") {
    return null
  }

  const locale = options.locale ?? "en"
  const planName = PLAN_NAMES[options.plan]
  const t = STRINGS[locale]

  const { html, text } = buildBrandedEmail({
    preview: t.preview,
    heading: t.heading,
    paragraphs: [
      options.retriesExhausted ? t.exhausted(planName) : t.retrying(planName),
      ...(options.retriesExhausted ? [] : [t.keepsWorking(planName)]),
      t.statement,
    ],
    // Straight to the portal: it's the only place the card can be changed, and a
    // hop through the dashboard is a hop where people give up.
    button: { label: t.button, url: `${options.appUrl}/dashboard?billing=update` },
    footnote: t.footnote,
  })

  return { subject: t.subject(planName), html, text }
}
