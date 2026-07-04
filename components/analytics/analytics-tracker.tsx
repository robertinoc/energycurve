"use client"

import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { Suspense, useEffect } from "react"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com"

let initialized = false

function ensureInitialized() {
  if (initialized || !POSTHOG_KEY) {
    return initialized
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Pageviews are captured manually on route change (App Router soft
    // navigations don't reload the document). Pageleave powers the
    // "time on results screen" engagement KPI.
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
  })
  initialized = true

  return initialized
}

function PageviewCapture() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!ensureInitialized() || !pathname) {
      return
    }

    const query = searchParams.toString()

    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
    })
  }, [pathname, searchParams])

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
