import posthog from "posthog-js"

import { analyticsAllowed, type ConsentState } from "@/lib/privacy/consent"

/**
 * The one place that decides whether PostHog is running.
 *
 * Extracted from `analytics-tracker.tsx` by the F1 compliance check, which asked
 * a question the component could not answer: when someone who said yes changes
 * their mind, does that reach the vendor?
 *
 * It did not. `ensureInitialized()` began with `if (initialized) return
 * initialized`, so after one accepted session it answered **yes forever**,
 * without re-reading consent. Pageview capture happened to be safe because it
 * checked `analyticsAllowed(consent)` separately — but `AnalyticsIdentify`
 * checked only `ensureInitialized()`, so a withdrawn visitor landing on an
 * authenticated page still sent `identify(profileId)` to PostHog. And nothing
 * ever called `opt_out_capturing` or `reset`, so the SDK kept its cookies, its
 * timers and the distinct id attached to a person who had withdrawn.
 *
 * Art. 7(3) asks that withdrawing be as easy as giving. It was — one click. What
 * it was not is effective.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com"

let initialized = false

/** Test seam. Module state outlives a test file otherwise. */
export function __resetAnalyticsForTests(): void {
  initialized = false
}

function initialise(): void {
  posthog.init(POSTHOG_KEY as string, {
    api_host: POSTHOG_HOST,
    // Pageviews are captured manually on route change (App Router soft
    // navigations don't reload the document). Pageleave powers the
    // "time on results screen" engagement KPI.
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    // Privacy-first defaults: honor the browser's Do Not Track signal,
    // don't store visitor IPs, and keep autocapture off so we only send
    // the explicit product events we defined.
    respect_dnt: true,
    ip: false,
    autocapture: false,
    disable_session_recording: true,
  })

  initialized = true
}

/**
 * Brings the SDK in line with `state`, and answers whether analytics may run.
 *
 * Called on every consent change and before anything is captured, so the answer
 * and the SDK's actual state cannot drift apart — which is precisely how the
 * previous version went wrong.
 */
export function applyConsentToAnalytics(state: ConsentState): boolean {
  if (!POSTHOG_KEY) {
    return false
  }

  if (analyticsAllowed(state)) {
    if (!initialized) {
      initialise()

      return initialized
    }

    // Already running and previously opted out: let it send again without a
    // second `init`, which would re-register listeners.
    posthog.opt_in_capturing()

    return true
  }

  // Withdrawn. Only meaningful if something was started — opting out of an
  // uninitialised SDK is a no-op at best.
  if (initialized) {
    posthog.opt_out_capturing()
    // Drops the distinct id and stored properties. Without it the vendor keeps
    // an identifier tied to a person who withdrew, which is the part that makes
    // the withdrawal reach them rather than stopping at our call sites.
    posthog.reset()
  }

  return false
}

/** Whether analytics may run right now, without changing anything. */
export function analyticsRunning(state: ConsentState): boolean {
  return Boolean(POSTHOG_KEY) && initialized && analyticsAllowed(state)
}
