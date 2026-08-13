/**
 * Turns stored billing state into the one thing a subscriber needs told.
 *
 * This exists because the app was silent about plans: someone could pay, get
 * charged, have `plan = 'pro'` written to their profile, and see a product
 * identical to the free one. A subscription nobody can see is indistinguishable
 * from a failed payment, and the next step a confused customer takes is a
 * chargeback.
 *
 * Pure and I/O-free so every state can be unit-tested — including the ones that
 * are awkward to reach by hand, like a cancellation that has already elapsed.
 */

import type { SiteLocale } from "@/lib/content/site-copy"
import { effectivePlan, type Plan, type PlanStatus } from "./plans"

/**
 * What to say, in order of how much it matters to the reader. Each maps to one
 * copy key and one visual tone.
 */
export type PlanNoticeKind =
  /** Never subscribed. An invitation, not a warning. */
  | "free"
  /** Paying, renews automatically. */
  | "active"
  /** Paying, but cancelled — access ends on a known date. */
  | "ending"
  /** Payment failed. Still entitled, needs to fix a card. */
  | "pastDue"
  /** It's over. They keep the record so we can offer to bring them back. */
  | "ended"
  /** Checkout was started and never finished; nothing was charged. */
  | "incomplete"

export interface PlanNotice {
  kind: PlanNoticeKind
  /** The plan that was purchased, which is not always the one in force. */
  plan: Plan
  /** The plan whose limits currently apply. */
  entitledPlan: Plan
  /** The date this state hinges on: renewal, end of access, or none. */
  date: Date | null
  /**
   * True when the reader has to do something. Drives the visual tone, and keeps
   * "your card failed" from looking like "you're on the free plan".
   */
  actionable: boolean
}

export interface BillingSnapshot {
  plan: Plan
  status: PlanStatus | null
  currentPeriodEnd: Date | null
  cancelAt: Date | null
  stripeCustomerId: string | null
}

/**
 * `now` is injected rather than read, so the elapsed-cancellation case is
 * testable without waiting a month.
 */
export function planNotice(
  billing: BillingSnapshot,
  now: Date = new Date()
): PlanNotice {
  const entitledPlan = effectivePlan(billing.plan, billing.status)
  const base = { plan: billing.plan, entitledPlan }

  if (billing.plan === "free") {
    // An abandoned checkout leaves plan=free with a status; say nothing about it
    // unless a subscription was genuinely started, since nothing was charged.
    return billing.status === "incomplete"
      ? { ...base, kind: "incomplete", date: null, actionable: true }
      : { ...base, kind: "free", date: null, actionable: false }
  }

  switch (billing.status) {
    case "active":
    case "trialing": {
      // A cancellation already past its date means the webhook that ends the
      // subscription hasn't arrived (or was missed). Don't advertise access that
      // may already be gone — treat it as ended.
      if (billing.cancelAt) {
        return billing.cancelAt.getTime() > now.getTime()
          ? { ...base, kind: "ending", date: billing.cancelAt, actionable: false }
          : { ...base, kind: "ended", date: billing.cancelAt, actionable: true }
      }

      return {
        ...base,
        kind: "active",
        date: billing.currentPeriodEnd,
        actionable: false,
      }
    }

    case "past_due":
      return {
        ...base,
        kind: "pastDue",
        date: billing.currentPeriodEnd,
        actionable: true,
      }

    case "canceled":
      return { ...base, kind: "ended", date: billing.cancelAt, actionable: true }

    case "incomplete":
      return { ...base, kind: "incomplete", date: null, actionable: true }

    case null:
      // A paid plan with no status shouldn't happen — the webhook always writes
      // both. Fail towards the honest reading: they aren't entitled.
      return { ...base, kind: "ended", date: null, actionable: true }
  }
}

/** Whether the billing portal can be opened at all. */
export function canManageBilling(billing: BillingSnapshot): boolean {
  return billing.stripeCustomerId !== null
}

const DATE_LOCALES: Record<SiteLocale, string> = {
  en: "en-GB",
  // Rioplatense, matching the voice the rest of the ES copy uses.
  es: "es-AR",
}

/** A date a person reads, not an ISO string. */
export function formatPlanDate(date: Date, locale: SiteLocale): string {
  return date.toLocaleDateString(DATE_LOCALES[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * Whether the plan state needs to be seen *now* rather than found later.
 *
 * Drives where the card renders: a failed payment above the fold, a healthy
 * subscription at the bottom. A free user doesn't want an upgrade card sitting on
 * top of their playlists every visit, and a `past_due` card at the bottom of the
 * page is a card nobody reads until their access is gone.
 */
export function planNeedsAttention(
  billing: BillingSnapshot,
  now: Date = new Date()
): boolean {
  const notice = planNotice(billing, now)
  return notice.actionable || notice.kind === "ending"
}
