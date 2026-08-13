/**
 * Pure translation from Stripe's subscription vocabulary into ours.
 *
 * Kept free of the Stripe SDK and of any I/O so the transitions that decide what
 * someone is entitled to can be unit-tested exhaustively — this is the code that
 * decides whether a paying customer keeps access, so "probably right" isn't
 * good enough.
 */

import {
  isPlan,
  type Plan,
  type PlanStatus,
} from "@/lib/product/plans"

/**
 * Stripe's `Subscription.status` values, mapped onto ours.
 *
 * `unpaid` folds into `past_due` (both mean "we haven't been paid, don't revoke
 * yet"), and `paused` folds into `canceled` (no access, subscription dormant).
 * Anything unrecognised is treated as `incomplete` — deny paid access rather
 * than grant it on a value we don't understand.
 */
const STATUS_MAP: Record<string, PlanStatus> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  unpaid: "past_due",
  canceled: "canceled",
  paused: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
}

export function mapStripeStatus(status: string): PlanStatus {
  return STATUS_MAP[status] ?? "incomplete"
}

/** What a webhook resolves to, ready to persist on the profile. */
export interface ResolvedSubscription {
  plan: Plan
  status: PlanStatus
  currentPeriodEnd: Date | null
  stripeSubscriptionId: string | null
  /**
   * When access ends because the customer cancelled, or null when no
   * cancellation is scheduled. Separate from `currentPeriodEnd`, which moves on
   * every renewal — this one means "it stops here".
   */
  cancelAt: Date | null
  /** Stripe's cancellation_details.feedback, the reason they picked. */
  cancellationFeedback: string | null
}

export interface SubscriptionInput {
  /** Stripe subscription id, if any. */
  id?: string | null
  /** Raw Stripe status string. */
  status?: string | null
  /** Price ids on the subscription's items. */
  priceIds: readonly string[]
  /** Unix seconds, as Stripe sends it. */
  currentPeriodEnd?: number | null
  /** Unix seconds. Set when a cancellation is scheduled. */
  cancelAt?: number | null
  cancellationFeedback?: string | null
}

/**
 * Resolves a subscription into the plan we should store.
 *
 * `prices` maps configured price ids to plans. A subscription carrying a price
 * we don't recognise resolves to free/incomplete rather than guessing: that
 * happens when someone buys a price that was removed from the env, and silently
 * granting the top tier would be worse than showing nothing.
 *
 * When several recognised prices are present (a plan change mid-cycle can
 * briefly show both), the **highest** plan wins — the customer is paying for it.
 */
export function resolveSubscription(
  input: SubscriptionInput,
  prices: Record<string, { plan: Plan }>
): ResolvedSubscription {
  const status = mapStripeStatus(input.status ?? "")

  const matched = input.priceIds
    .map((priceId) => prices[priceId]?.plan)
    .filter((plan): plan is Plan => isPlan(plan))

  const plan: Plan = matched.includes("pro_plus")
    ? "pro_plus"
    : matched.includes("pro")
      ? "pro"
      : "free"

  return {
    plan,
    // A recognised plan with no price match can't be entitled to anything.
    status: plan === "free" && matched.length === 0 ? "incomplete" : status,
    currentPeriodEnd:
      typeof input.currentPeriodEnd === "number" && input.currentPeriodEnd > 0
        ? new Date(input.currentPeriodEnd * 1000)
        : null,
    stripeSubscriptionId: input.id ?? null,
    cancelAt:
      typeof input.cancelAt === "number" && input.cancelAt > 0
        ? new Date(input.cancelAt * 1000)
        : null,
    cancellationFeedback: input.cancellationFeedback ?? null,
  }
}

/** The state to persist when a subscription is deleted outright. */
export function canceledSubscription(
  plan: Plan,
  feedback: string | null = null
): ResolvedSubscription {
  return {
    // Keep the purchased plan so the UI can say "your PRO subscription ended"
    // instead of pretending the user was always free.
    plan,
    status: "canceled",
    currentPeriodEnd: null,
    stripeSubscriptionId: null,
    // It already ended; there is no longer a future date to warn about. Keeping
    // a stale cancelAt here would render "ends on <past date>" forever.
    cancelAt: null,
    // Preserved by the caller when it has one: the reason outlives the
    // subscription, and it's the only churn signal we get.
    cancellationFeedback: feedback,
  }
}

/**
 * Minimal shape of the subscription fields we read. Declared structurally rather
 * than importing Stripe's type so this module stays SDK-free and testable.
 */
interface SubscriptionLike {
  items?: {
    data?: readonly {
      price?: { id?: string | null } | null
      current_period_end?: number | null
    }[]
  }
  current_period_end?: number | null
  cancel_at?: number | null
  /** Legacy: superseded by cancel_at, but still sent by older API versions. */
  cancel_at_period_end?: boolean | null
  cancellation_details?: { feedback?: string | null } | null
}

/** Price ids across a subscription's items. */
export function priceIdsOf(subscription: SubscriptionLike): string[] {
  return (subscription.items?.data ?? [])
    .map((item) => item?.price?.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
}

/**
 * The period end, in Unix seconds.
 *
 * Stripe moved `current_period_end` from the subscription onto its items. This
 * reads the items first (taking the furthest one, since a multi-item
 * subscription could stagger them) and falls back to the legacy top-level field,
 * so both the current and older API versions work.
 */
export function periodEndOf(subscription: SubscriptionLike): number | null {
  const fromItems = (subscription.items?.data ?? [])
    .map((item) => item?.current_period_end)
    .filter((value): value is number => typeof value === "number" && value > 0)

  if (fromItems.length > 0) {
    return Math.max(...fromItems)
  }

  const legacy = subscription.current_period_end
  return typeof legacy === "number" && legacy > 0 ? legacy : null
}

/**
 * When a scheduled cancellation takes effect, in Unix seconds.
 *
 * Measured against a real cancellation on API version 2026-07-29.dahlia: Stripe
 * sets `cancel_at` and leaves `cancel_at_period_end` **false**, so reading the
 * boolean finds nothing. The boolean is still honoured as a fallback for older
 * API versions, where it means "cancel at the end of the current period" and the
 * effective date is that period's end.
 */
export function cancelAtOf(subscription: SubscriptionLike): number | null {
  const explicit = subscription.cancel_at
  if (typeof explicit === "number" && explicit > 0) {
    return explicit
  }

  return subscription.cancel_at_period_end === true
    ? periodEndOf(subscription)
    : null
}

/** The reason the customer gave when cancelling, if the portal collected one. */
export function cancellationFeedbackOf(
  subscription: SubscriptionLike
): string | null {
  const feedback = subscription.cancellation_details?.feedback
  return typeof feedback === "string" && feedback.length > 0 ? feedback : null
}

/** Stripe fields hold either an id or an expanded object. Normalises to the id. */
export function customerIdOf(value: unknown): string | null {
  if (typeof value === "string") {
    return value.length > 0 ? value : null
  }

  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === "string" && id.length > 0 ? id : null
  }

  return null
}

/**
 * Webhook event types we act on. Everything else is acknowledged and ignored —
 * Stripe sends dozens of types and a 2xx is required or it retries forever.
 */
export const HANDLED_EVENTS = [
  // Links the Stripe customer to our profile on first purchase.
  "checkout.session.completed",
  // The authority on plan + status from then on.
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const

export type HandledEvent = (typeof HANDLED_EVENTS)[number]

export function isHandledEvent(type: string): type is HandledEvent {
  return (HANDLED_EVENTS as readonly string[]).includes(type)
}
