"use client"

import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { Suspense, useEffect } from "react"

import {
  analyticsRunning,
  applyConsentToAnalytics,
} from "@/components/analytics/analytics-runtime"
import { useConsent } from "@/lib/privacy/use-consent"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

/**
 * Query-string keys that must never reach analytics.
 *
 * `/reset-password?token=…` and `/verify-email?pending=…&email=…` are pages a
 * person lands on from an email, and `$current_url` used to carry the whole
 * query string — so a single-use credential and an address were being shipped
 * to a third-party processor as a pageview property. Finding T5(b) of the RoPA.
 *
 * An allowlist would be safer still, but it would silently drop the campaign
 * parameters analytics exists to read. This is the narrower fix: name what is
 * dangerous, keep what is useful, and default to redacting rather than dropping
 * so a stripped value is visible in the data instead of looking like it was
 * never there.
 */
const SENSITIVE_QUERY_KEYS = ["token", "pending", "email", "code", "secret"]

export function redactUrl(origin: string, pathname: string, query: string): string {
  if (!query) {
    return `${origin}${pathname}`
  }

  const params = new URLSearchParams(query)

  for (const key of SENSITIVE_QUERY_KEYS) {
    if (params.has(key)) {
      params.set(key, "[redacted]")
    }
  }

  const rendered = params.toString()

  return `${origin}${pathname}${rendered ? `?${rendered}` : ""}`
}

function PageviewCapture() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Subscribed, so accepting starts tracking from this page rather than from
  // the next navigation — and withdrawing takes effect immediately, including
  // when it happens in another tab.
  const consent = useConsent()

  useEffect(() => {
    // Applied rather than merely read: this is the one call that starts the SDK
    // on yes and tears it down on no, so the vendor's state follows the answer
    // instead of only our capture calls doing so.
    if (!applyConsentToAnalytics(consent) || !pathname) {
      return
    }

    posthog.capture("$pageview", {
      $current_url: redactUrl(
        window.location.origin,
        pathname,
        searchParams.toString()
      ),
    })
  }, [consent, pathname, searchParams])

  return null
}

/**
 * Mounted once in the root layout. Renders nothing; no-ops entirely when
 * NEXT_PUBLIC_POSTHOG_KEY is not configured.
 */
export function AnalyticsTracker() {
  if (!POSTHOG_KEY) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <PageviewCapture />
    </Suspense>
  )
}

/**
 * Ties the anonymous browser session to the app profile id — the same
 * distinct id the server-side events use. Mounted on authenticated pages.
 */
export function AnalyticsIdentify({ profileId }: { profileId: string }) {
  // Subscribed to consent, which it was not before — and that was the bug. It
  // asked only whether the SDK was initialised, and after one accepted session
  // that answer was yes forever, so a visitor who had withdrawn still sent an
  // identify() the next time they landed on an authenticated page.
  const consent = useConsent()

  useEffect(() => {
    if (!analyticsRunning(consent)) {
      return
    }

    if (posthog.get_distinct_id() !== profileId) {
      posthog.identify(profileId)
    }
  }, [consent, profileId])

  return null
}
