import { NextResponse, type NextRequest } from "next/server"

import { isAnalyticsPeriod } from "@/lib/backstage/analytics"
import { getBackstageApiSession } from "@/lib/backstage/guard"
import {
  getBackstageAnalyticsSummary,
  isPostHogReportingConfigured,
  PostHogUpstreamError,
} from "@/lib/backstage/posthog-reporting"
import { logError } from "@/lib/observability/logger"

export async function GET(request: NextRequest) {
  const session = await getBackstageApiSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const rawPeriod = request.nextUrl.searchParams.get("period") ?? "7d"
  const period = isAnalyticsPeriod(rawPeriod) ? rawPeriod : "7d"

  if (!isPostHogReportingConfigured()) {
    return NextResponse.json({ configured: false })
  }

  try {
    const summary = await getBackstageAnalyticsSummary(period)

    return NextResponse.json({ configured: true, summary })
  } catch (error) {
    logError("backstage.analytics_summary_failed", error, { period })

    if (error instanceof PostHogUpstreamError) {
      return NextResponse.json(
        { configured: true, error: "PostHog did not answer the query." },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { configured: true, error: "Unable to load analytics." },
      { status: 500 }
    )
  }
}
