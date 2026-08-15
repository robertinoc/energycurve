import "server-only"

import { PostHog } from "posthog-node"

import { logWarn } from "@/lib/observability/logger"

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
 * Fire-and-forget event capture keyed by the app profile id (the same
 * distinct id the browser SDK identifies with).
 */
export function captureServerEvent(
  profileId: string,
  event: AnalyticsEvent,
  properties: AnalyticsProperties = {}
) {
  const posthog = getPostHogServerClient()

  if (!posthog) {
    return
  }

  try {
    posthog.capture({ distinctId: profileId, event, properties })
  } catch (error) {
    logWarn("analytics.capture_failed", {
      event,
      reason: error instanceof Error ? error.message : "Unknown capture error",
    })
  }
}
