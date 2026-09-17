"use client"

import posthog from "posthog-js"

import { analyticsRunning } from "@/components/analytics/analytics-runtime"
import { readConsent } from "@/lib/privacy/consent"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { ImportSource } from "@/lib/playlists/imported-track"

/**
 * The four things worth knowing about the free tool, and nothing else.
 *
 * The properties are deliberately thin: a language, which format it was, how
 * many tracks, and the score bucket. **No filenames, no track titles, no
 * artists, no playlist names, no BPMs.** The page's whole promise is that the
 * DJ's set does not leave their machine, and an analytics payload is a way out
 * by network like any other — the difference being that nobody thinks of it as
 * one until it has already shipped.
 *
 * `trackCount` and a rounded score are the exceptions, and they are safe for the
 * same reason an HTTP status code is: they describe the interaction, not the
 * music. They are what answers "do people with long sets bounce?", which is the
 * question the tool exists to have an answer to.
 */

export type ToolEvent =
  | "tool_file_loaded"
  | "tool_example_loaded"
  | "tool_result_shown"
  | "tool_signup_click"

interface ToolEventProperties {
  locale: SiteLocale
  /** Which reader handled it — never which file. */
  source?: ImportSource
  trackCount?: number
  /** Rounded to a whole number: the distribution is the interesting part. */
  score?: number
}

export function captureToolEvent(
  event: ToolEvent,
  properties: ToolEventProperties
): void {
  // Same gate the pageview capture uses. Without it an event would fire for a
  // visitor who declined, which is the one thing the consent banner promises
  // cannot happen.
  if (!analyticsRunning(readConsent())) {
    return
  }

  posthog.capture(event, properties)
}
