"use client"

import posthog from "posthog-js"

import { analyticsRunning } from "@/components/analytics/analytics-runtime"
import { readConsent } from "@/lib/privacy/consent"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Which way into the analysis someone took, from the playlist page.
 *
 * The question this answers is narrow: since the page started leading with
 * the analysis on a set that was never analysed (lib/playlists/analyze-prompt.ts),
 * do the clicks come from the new places — the header button in its leading
 * form, the note on arrival, the end of the import summary — or from the same
 * button as before?
 *
 * It does **not** answer "how many playlists end up analysed, and how soon".
 * That is a count over `playlists.created_at` and `analyses.created_at`, exact
 * and for everyone, and the query is in docs/conversion-plan.md. This event
 * only sees people who accepted analytics, so read it as a split between
 * places, never as a total.
 *
 * Emitted from the browser, behind the same gate as the pageview and the
 * content CTA, so a visitor who declined is not counted. Properties stay thin:
 * nothing about the set, its tracks or its name.
 */
export interface AnalyzeCtaProperties {
  /** Where the link sat on the playlist page. */
  placement: "header" | "next_step" | "import_summary"
  /** True when the set had never been analysed, i.e. the page was leading. */
  firstAnalysis: boolean
  locale: SiteLocale
}

export function captureAnalyzeCtaClick(properties: AnalyzeCtaProperties): void {
  if (!analyticsRunning(readConsent())) {
    return
  }

  posthog.capture("analyze_cta_click", properties)
}
