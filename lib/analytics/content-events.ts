"use client"

import posthog from "posthog-js"

import { analyticsRunning } from "@/components/analytics/analytics-runtime"
import { readConsent } from "@/lib/privacy/consent"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The one event the content pages emit — SEO-E28.
 *
 * `content_cta_click` is the first step of the funnel the plan asks for,
 * "organic → first analysis". The other two steps **already exist and are not
 * being duplicated**:
 *
 * - `signup` — emitted from `lib/auth/password-auth.ts` and
 *   `lib/auth/email-verification.ts` when an account is actually created.
 * - `analysis_completed` — emitted from `services/analysis-service.ts` when an
 *   analysis finishes.
 *
 * The plan names them `signup_completed` and `first_analysis`. Adding events
 * under those names would put two events in the warehouse meaning one thing,
 * and a funnel built on the wrong one of a pair reads as a cliff that is really
 * a naming mistake. There is also no need for a separate "first" event: a
 * PostHog funnel already counts the first occurrence per person, so
 * `analysis_completed` **is** the first-analysis step.
 *
 * Properties stay thin for the same reason the tool events do — see
 * `lib/tools/tool-events.ts`. Which page the click came from and in what
 * language is enough to answer "does the reference page convert better than an
 * article?", and nothing here describes anybody's music.
 */

export interface ContentCtaProperties {
  /** The page the click came from, as a stable path — never a full URL. */
  page: string
  locale: SiteLocale
  /** Which CTA: the free tool, or signup. */
  variant: "tool" | "signup"
}

export function captureContentCtaClick(properties: ContentCtaProperties): void {
  // The same gate the pageview and tool captures use. Without it an event fires
  // for a visitor who declined, which is the one thing the consent banner
  // promises cannot happen.
  if (!analyticsRunning(readConsent())) {
    return
  }

  posthog.capture("content_cta_click", properties)
}
