import "server-only"

import { PostHog } from "posthog-node"

import { logWarn } from "@/lib/observability/logger"
import { readServerConsent } from "@/lib/privacy/server-consent"

/**
 * Product analytics events (roadmap section 9). The PostHog project key is
 * public by design, so the same NEXT_PUBLIC_ variable feeds both the
 * browser SDK and this server client. Everything degrades gracefully when
 * the key is absent — analytics must never break a product flow.
 */
export type AnalyticsEvent =
  | "signup"
  | "playlist_created"
  | "analysis_started"
  | "analysis_completed"
  // Billing funnel. `checkout_started` is emitted when the session is minted,
  // so the gap between it and `subscription_started` is abandonment at Stripe —
  // a number that can't be reconstructed from the database afterwards.
  | "checkout_started"
  | "subscription_started"
  | "plan_upgraded"
  | "plan_downgraded"
  | "subscription_ended"
  /**
   * Someone ran into a plan limit. The single most useful conversion signal
   * there is: it marks the moment the product told a free user "no", which is
   * the only moment a paid plan is worth anything to them.
   */
  | "plan_limit_reached"
  /**
   * A re-analysis raised the set's score because the DJ changed the set — the
   * moment the product has just proved itself, with no argument needed
   * (lib/product/score-gain.ts has the bar). Once per improvement, on every
   * plan, with `from`, `to` and `wallShown`: not a limit but a success, so it
   * is its own event and not a `plan_limit_reached`. PRO accounts are the
   * baseline the FREE wall is read against.
   */
  | "score_improved"
  /**
   * A sales wall was put in front of someone (`wall` says which one, `plan`
   * what they had). Separate from `plan_limit_reached` on purpose: the limit
   * and the wall are not the same moment. The AI-ordering wall shows before the
   * click (the button is already disabled, F1 audit A4), so the limit event
   * almost never fires there; and the score wall is not a limit at all. One
   * event per wall shown keeps every wall's funnel the same two steps.
   * Emitted where the server decides to show it, so it counts renders: read it
   * per person, not per event.
   */
  | "sales_wall_shown"
  /**
   * Someone pressed a sales wall's way to the plans. Counted on the server by
   * the redirect in app/api/sales-wall, so the click is known whatever the
   * browser blocks. Read against `sales_wall_shown` with the same `wall` to
   * tell a wall nobody sees from one nobody believes.
   */
  | "sales_wall_clicked"
  | "payment_failed"

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>

// undefined = not initialized yet, null = disabled (no key configured)
let client: PostHog | null | undefined

function getPostHogServerClient(): PostHog | null {
  if (client !== undefined) {
    return client
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

  if (!key) {
    client = null
    return client
  }

  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Serverless-friendly: flush every event immediately instead of
    // batching in a process that may be frozen after the response.
    flushAt: 1,
    flushInterval: 0,
  })

  return client
}

export function isAnalyticsEnabled() {
  return getPostHogServerClient() !== null
}

/**
 * Events that only leave the server when the browser that caused them said yes
 * to analytics (Robertino's decision of 10/11/2026).
 *
 * These three exist to optimise conversion, which is exactly what the consent
 * banner asks about. The rest of the union is deliberately not here: the
 * billing events and `plan_limit_reached` describe the running of the service,
 * and `signup` and the playlist and analysis events were left as they were by
 * the same decision. Moving one into this set is a decision, not a refactor.
 *
 * Gated here rather than at each call site so that a fifth place emitting a
 * sales wall cannot forget to ask.
 */
const CONSENT_REQUIRED: ReadonlySet<AnalyticsEvent> = new Set<AnalyticsEvent>([
  "score_improved",
  "sales_wall_shown",
  "sales_wall_clicked",
])

/** Exported for tests and for anyone reading the analytics inventory. */
export function requiresConsent(event: AnalyticsEvent): boolean {
  return CONSENT_REQUIRED.has(event)
}

/**
 * Fire-and-forget event capture keyed by the app profile id (the same
 * distinct id the browser SDK identifies with).
 *
 * For the events in `CONSENT_REQUIRED` the capture waits for the consent of the
 * request first. Still fire-and-forget: the caller is not awaited on, and a
 * consent read that fails or is uncertain drops the event — never the action.
 * The returned promise exists for tests; callers ignore it.
 */
export function captureServerEvent(
  profileId: string,
  event: AnalyticsEvent,
  properties: AnalyticsProperties = {}
): Promise<void> | void {
  const posthog = getPostHogServerClient()

  if (!posthog) {
    return
  }

  if (CONSENT_REQUIRED.has(event)) {
    return readServerConsent()
      .then((consent) => {
        if (consent === "granted") {
          send(posthog, profileId, event, properties)
        }
      })
      .catch(() => {
        // readServerConsent does not throw; this is for whatever it calls.
      })
  }

  send(posthog, profileId, event, properties)
}

function send(
  posthog: PostHog,
  profileId: string,
  event: AnalyticsEvent,
  properties: AnalyticsProperties
) {
  try {
    posthog.capture({ distinctId: profileId, event, properties })
  } catch (error) {
    logWarn("analytics.capture_failed", {
      event,
      reason: error instanceof Error ? error.message : "Unknown capture error",
    })
  }
}
