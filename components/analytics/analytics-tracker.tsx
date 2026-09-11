"use client"

import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { Suspense, useEffect } from "react"

import { analyticsAllowed, readConsent } from "@/lib/privacy/consent"
import { useConsent } from "@/lib/privacy/use-consent"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com"

let initialized = false

/**
 * Initialises PostHog, but only once the visitor has said yes.
 *
 * The consent check is here rather than at the call sites so there is exactly
 * one place that can get it wrong. Before this, `posthog.init` ran on first
 * paint and set `localStorage+cookie` persistence before anyone was asked —
 * which is the gap this whole change exists to close.
 */
function ensureInitialized() {
  if (initialized || !POSTHOG_KEY) {
    return initialized
  }

  if (!analyticsAllowed(readConsent())) {
    return false
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Pageviews are captured manually on route change (App Router soft
    // navigations don't reload the document). Pageleave powers the
    // "time on results screen" engagement KPI.
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    // Privacy-first defaults: honor the browser's Do Not Track signal,
    // don't store visitor IPs, and keep autocapture off so we only send
    // the explicit product events we defined. Lighter payloads and a
    // cleaner privacy posture for a launched product.
    respect_dnt: true,
    ip: false,
    autocapture: false,
    disable_session_recording: true,
  })
  initialized = true

  return initialized
}

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
    if (!analyticsAllowed(consent) || !ensureInitialized() || !pathname) {
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
  useEffect(() => {
    if (!ensureInitialized()) {
      return
    }

    if (posthog.get_distinct_id() !== profileId) {
      posthog.identify(profileId)
    }
  }, [profileId])

  return null
}
