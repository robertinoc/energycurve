"use client"

import posthog from "posthog-js"

import { analyticsRunning } from "@/components/analytics/analytics-runtime"
import { readConsent } from "@/lib/privacy/consent"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The example set's two events (docs/conversion-plan.md, step 1.1).
 *
 * The question they answer: of the people who open the example, how many import
 * something afterwards. The import half **already exists and is not duplicated**:
 * `playlist_created`, emitted by the server whenever a playlist is saved. The
 * browser identifies with the same profile id the server uses
 * (`AnalyticsIdentify`), so a PostHog funnel `example_set_opened` →
 * `playlist_created` reads per person without a third event.
 *
 * - `example_set_opened` — the example was opened on the dashboard. The top of
 *   that funnel, and the count of who the example reaches at all.
 * - `example_set_import_click` — "now try it with yours" was pressed. Between the
 *   two above: someone who clicked and never imported got stuck in the form,
 *   which is a different problem from someone the example didn't convince.
 *
 * **Browser events, gated on consent, on purpose.** Both happen in the browser
 * — a click on a <details> and on a link — so they are captured where consent
 * lives (`lib/privacy/consent.ts`), behind the same gate as the pageview, tool
 * and content events. No server event, so nothing here depends on the consent
 * cookie that the wall events read since 10/11 (PR #301). They fire only for
 * someone who accepted analytics, and the funnel counts only them; its second
 * step, `playlist_created`, is a server event outside that decision, but a
 * funnel only counts people who passed its first step. Properties stay as thin
 * as the content and tool events: the language, and nothing about anybody's
 * music.
 */

export type ExampleSetEvent = "example_set_opened" | "example_set_import_click"

export function captureExampleSetEvent(event: ExampleSetEvent, locale: SiteLocale): void {
  // The same gate the pageview, tool and content captures use. Without it an
  // event fires for a visitor who declined, which is the one thing the consent
  // banner promises cannot happen.
  if (!analyticsRunning(readConsent())) {
    return
  }

  posthog.capture(event, { locale })
}
