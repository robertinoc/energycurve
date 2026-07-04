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
