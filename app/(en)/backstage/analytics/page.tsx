import type { Metadata } from "next"

import { AnalyticsPanel } from "./AnalyticsPanel"

export const metadata: Metadata = {
  title: "Analytics",
}

/**
 * PostHog dashboard embed URLs (comma-separated), from the "Share" option
 * on each dashboard. Read server-side and passed down so the env var
 * doesn't need the NEXT_PUBLIC_ prefix.
 */
function getEmbedUrls(): string[] {
  return (process.env.BACKSTAGE_POSTHOG_EMBED_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.startsWith("https://"))
}

export default function BackstageAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-ec-text-dim">
          Product metrics from PostHog — live summary plus the full dashboards.
        </p>
      </div>

      <AnalyticsPanel embedUrls={getEmbedUrls()} />
    </div>
  )
}
