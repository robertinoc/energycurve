/**
 * The email a new paying customer gets.
 *
 * Not a receipt — Stripe issues those. This is the only message that arrives
 * between paying and using the thing, and it has three jobs, in this order:
 *
 * 1. **Say what they just unlocked, by name.** A plan is an abstraction; the
 *    features are the purchase. Somebody who pays and can't find what changed
 *    is somebody who cancels in week two.
 * 2. **Warn about the card statement.** The charge reads *StageLink LLC*, not
 *    EnergyCurve. A recipient who meets that name for the first time on their
 *    statement files a chargeback — which costs the fee, the dispute, and the
 *    customer.
 * 3. **Say how to cancel.** Making it easy to leave is what makes it safe to
 *    join, and hiding it only converts cancellations into disputes.
 *
 * Pure: takes a plan, returns content. Nothing here reaches the network, so
 * every claim it makes is testable.
 */

import { buildBrandedEmail } from "@/lib/email/build-email-html"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { Plan } from "@/lib/product/plans"

/**
 * What each tier actually got, in the words the product uses for them.
 *
 * Concrete on purpose. "Unlimited playlists and advanced analysis" tells a DJ
 * nothing; "your set scored against the clock, so you know if your peak lands
 * before the headliner" is the reason they paid.
 */
const PRO_HIGHLIGHTS: Record<SiteLocale, string[]> = {
  en: [
    "Real BPM read out of your audio — the wav, flac and aiff files that carry no tags, measured instead of guessed.",
    "Slot-aware planning: tell us you play 01:00 to 03:00 and the curve gets mapped to the clock, so an early peak is something you find out before the gig.",
    "Named target curves — warm-up, peak time, after-hours, journey, landing — so a set is scored against the shape you're actually playing.",
    "A printable set sheet for the booth, with the tracklist, the keys and the time each track lands.",
    "Order history: every order you save is kept with what it scored, and you can restore any of them.",
    "Planned versus played: mark what you actually played and see what moved, what you skipped, and what it did to the curve.",
  ],
  es: [
    "BPM real leído de tu audio — los wav, flac y aiff que no traen tags, medidos en vez de adivinados.",
    "Planificación por horario: decinos que tocás de 01:00 a 03:00 y la curva se mapea al reloj, así un pico temprano es algo que descubrís antes de la fecha y no durante.",
    "Curvas objetivo con nombre — warm-up, peak time, after-hours, journey, landing — para que el set se mida contra la forma que realmente estás tocando.",
    "Una hoja de set imprimible para la cabina, con el tracklist, los tonos y la hora a la que cae cada track.",
    "Historial de órdenes: cada orden que guardás queda con lo que puntuó, y podés restaurar el que quieras.",
    "Planificado contra tocado: marcás lo que tocaste de verdad y ves qué se movió, qué te salteaste, y qué le hizo eso a la curva.",
  ],
}

const PRO_PLUS_HIGHLIGHTS: Record<SiteLocale, string[]> = {
  en: [
    "Unlimited AI ordering, instead of a monthly allowance.",
    "Everything in PRO, with no caps anywhere.",
  ],
  es: [
    "Ordenación con IA ilimitada, en vez de un cupo mensual.",
    "Todo lo de PRO, sin topes en ningún lado.",
  ],
}

/**
 * Everything the email says, per language.
 *
 * The statement warning is translated rather than left in English on purpose:
 * it is the sentence that prevents a chargeback, and a warning somebody has to
 * translate for themselves is a warning that doesn't work.
 */
const STRINGS: Record<
  SiteLocale,
  {
    preview: (plan: string) => string
    headingNew: (plan: string) => string
    headingUpgrade: (plan: string) => string
    subjectNew: (plan: string) => string
    subjectUpgrade: (plan: string) => string
    statement: string
    cancel: string
    button: string
    footnote: string
  }
> = {
  en: {
    preview: (plan) => `${plan} is active — and a heads-up about how the charge appears.`,
    headingNew: (plan) => `You're on ${plan}. Here's what you just unlocked.`,
    headingUpgrade: (plan) => `You're on ${plan}. Here's what that adds.`,
    subjectNew: (plan) => `Welcome to EnergyCurve ${plan}`,
    subjectUpgrade: (plan) => `You're on ${plan}`,
    statement:
      "One thing worth knowing before your statement arrives: the charge appears as STAGELINK LLC, not EnergyCurve. EnergyCurve is part of the StageLink family, and StageLink LLC is the company that processes the payment. Nothing is wrong if that's the name you see.",
    cancel:
      "You can change or cancel your plan whenever you want, from your account — no email required, no retention call.",
    button: "Open EnergyCurve",
    footnote:
      "Manage or cancel your plan any time from Account → Billing. Questions: just reply to this email.",
  },
  es: {
    preview: (plan) => `${plan} está activo — y un aviso sobre cómo aparece el cargo.`,
    headingNew: (plan) => `Ya estás en ${plan}. Esto es lo que acabás de desbloquear.`,
    headingUpgrade: (plan) => `Ya estás en ${plan}. Esto es lo que suma.`,
    subjectNew: (plan) => `Bienvenido a EnergyCurve ${plan}`,
    subjectUpgrade: (plan) => `Ya estás en ${plan}`,
    statement:
      "Algo que conviene saber antes de que te llegue el resumen: el cargo aparece como STAGELINK LLC, no como EnergyCurve. EnergyCurve es parte de la familia StageLink, y StageLink LLC es la empresa que procesa el pago. No hay nada mal si ese es el nombre que ves.",
    cancel:
      "Podés cambiar o cancelar tu plan cuando quieras, desde tu cuenta — sin mandar un mail, sin llamada de retención.",
    button: "Abrir EnergyCurve",
    footnote:
      "Gestioná o cancelá tu plan cuando quieras desde Cuenta → Facturación. ¿Dudas? Respondé este mail.",
  },
}

export interface PurchaseEmailContent {
  subject: string
  html: string
  text: string
}

const PLAN_NAMES: Record<Plan, string> = {
  free: "FREE",
  pro: "PRO",
  pro_plus: "PRO+",
}

/**
 * Builds the confirmation for a plan.
 *
 * `free` is accepted and returns null rather than throwing: the caller is a
 * webhook branch, and a plan that shouldn't produce an email is a reason to
 * send nothing, not a reason to 500 and have Stripe retry forever.
 */
export function buildPurchaseEmail(options: {
  plan: Plan
  /** Where the app lives, for the buttons. */
  appUrl: string
  /** True when they moved up from a paid plan rather than starting one. */
  isUpgrade: boolean
  /** Defaults to English, matching what the UI shows someone who never chose. */
  locale?: SiteLocale
}): PurchaseEmailContent | null {
  if (options.plan === "free") {
    return null
  }

  const locale = options.locale ?? "en"
  const planName = PLAN_NAMES[options.plan]
  const highlights =
    options.plan === "pro_plus"
      ? [...PRO_PLUS_HIGHLIGHTS[locale], ...PRO_HIGHLIGHTS[locale]]
      : PRO_HIGHLIGHTS[locale]

  const t = STRINGS[locale]

  const { html, text } = buildBrandedEmail({
    preview: t.preview(planName),
    heading: options.isUpgrade ? t.headingUpgrade(planName) : t.headingNew(planName),
    paragraphs: [...highlights, t.statement, t.cancel],
    button: { label: t.button, url: `${options.appUrl}/dashboard` },
    footnote: t.footnote,
  })

  return {
    subject: options.isUpgrade
      ? t.subjectUpgrade(planName)
      : t.subjectNew(planName),
    html,
    text,
  }
}
