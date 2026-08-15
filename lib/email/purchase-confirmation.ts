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
import type { Plan } from "@/lib/product/plans"

/**
 * What each tier actually got, in the words the product uses for them.
 *
 * Concrete on purpose. "Unlimited playlists and advanced analysis" tells a DJ
 * nothing; "your set scored against the clock, so you know if your peak lands
 * before the headliner" is the reason they paid.
 */
const PRO_HIGHLIGHTS = [
  "Real BPM read out of your audio — the wav, flac and aiff files that carry no tags, measured instead of guessed.",
  "Slot-aware planning: tell us you play 01:00 to 03:00 and the curve gets mapped to the clock, so an early peak is something you find out before the gig.",
  "Named target curves — warm-up, peak time, after-hours, journey, landing — so a set is scored against the shape you're actually playing.",
  "A printable set sheet for the booth, with the tracklist, the keys and the time each track lands.",
  "Order history: every order you save is kept with what it scored, and you can restore any of them.",
  "Planned versus played: mark what you actually played and see what moved, what you skipped, and what it did to the curve.",
]

const PRO_PLUS_HIGHLIGHTS = [
  "Unlimited AI ordering, instead of a monthly allowance.",
  "Everything in PRO, with no caps anywhere.",
]

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
}): PurchaseEmailContent | null {
  if (options.plan === "free") {
    return null
  }

  const planName = PLAN_NAMES[options.plan]
  const highlights =
    options.plan === "pro_plus"
      ? [...PRO_PLUS_HIGHLIGHTS, ...PRO_HIGHLIGHTS]
      : PRO_HIGHLIGHTS

  const opening = options.isUpgrade
    ? `You're on ${planName}. Here's what that adds.`
    : `You're on ${planName}. Here's what you just unlocked.`

  const { html, text } = buildBrandedEmail({
    preview: `${planName} is active — and a heads-up about how the charge appears.`,
    heading: opening,
    paragraphs: [
      ...highlights,
      // Third person plural avoided: this is the sentence that prevents a
      // chargeback, and it has to read as a direct warning, not as boilerplate.
      "One thing worth knowing before your statement arrives: the charge appears as STAGELINK LLC, not EnergyCurve. EnergyCurve is part of the StageLink suite, and StageLink LLC is the company that processes the payment. Nothing is wrong if that's the name you see.",
      "You can change or cancel your plan whenever you want, from your account — no email required, no retention call.",
    ],
    button: {
      label: "Open EnergyCurve",
      url: `${options.appUrl}/dashboard`,
    },
    footnote:
      "Manage or cancel your plan any time from Account → Billing. Questions: just reply to this email.",
  })

  return {
    subject: options.isUpgrade
      ? `You're on ${planName}`
      : `Welcome to EnergyCurve ${planName}`,
    html,
    text,
  }
}
