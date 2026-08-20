import "server-only"

import {
  buildMetric,
  buildRetention,
  zeroFillSeries,
  PERIOD_CONFIG,
  type AnalyticsPeriod,
  type BackstageAnalyticsSummary,
} from "@/lib/backstage/analytics"
import { logError } from "@/lib/observability/logger"

/**
 * PostHog Query API client for the backstage Analytics tab. Uses a
 * Personal API Key (read scope) — a private credential, unlike the public
 * NEXT_PUBLIC_POSTHOG_KEY that feeds event ingestion. Never expose it to
 * the browser; this module is the StageLink umami-reporting.ts equivalent.
 */

const PRODUCT_EVENTS_SQL =
  "('signup', 'playlist_created', 'analysis_started', 'analysis_completed')"

/**
 * "Active user" = a distinct id that fired a product event or viewed a
 * dashboard page. Plain marketing pageviews (anonymous visitors on the
 * landing page) don't count.
 */
const ACTIVE_CONDITION_SQL = `(event IN ${PRODUCT_EVENTS_SQL} OR (event = '$pageview' AND toString(properties.$pathname) LIKE '/dashboard%'))`

interface PostHogReportingConfig {
  apiHost: string
  projectId: string
  personalApiKey: string
}

function getConfig(): PostHogReportingConfig | null {
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID

  if (!personalApiKey || !projectId) {
    return null
  }

  return {
    apiHost: process.env.POSTHOG_API_HOST ?? "https://us.posthog.com",
    projectId,
    personalApiKey,
  }
}

export function isPostHogReportingConfigured(): boolean {
  return getConfig() !== null
}

export class PostHogUpstreamError extends Error {}

async function runHogQLQuery(
  config: PostHogReportingConfig,
  query: string
): Promise<unknown[][]> {
  const response = await fetch(
    `${config.apiHost}/api/projects/${config.projectId}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.personalApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      cache: "no-store",
    }
  )

  if (!response.ok) {
    const body = await response.text().catch(() => "")

    throw new PostHogUpstreamError(
      `PostHog query failed (${response.status}): ${body.slice(0, 300)}`
    )
  }

  const payload = (await response.json()) as { results?: unknown[][] }

  return payload.results ?? []
}

function windowConditions(period: AnalyticsPeriod) {
  const { unit, amount } = PERIOD_CONFIG[period]
  const current = `timestamp >= now() - INTERVAL ${amount} ${unit}`
  const previous = `timestamp >= now() - INTERVAL ${amount * 2} ${unit} AND timestamp < now() - INTERVAL ${amount} ${unit}`

  return { current, previous, scope: `timestamp >= now() - INTERVAL ${amount * 2} ${unit}` }
}

function toNumber(value: unknown): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

export async function getBackstageAnalyticsSummary(
  period: AnalyticsPeriod
): Promise<BackstageAnalyticsSummary> {
  const config = getConfig()

  if (!config) {
    throw new PostHogUpstreamError("PostHog reporting is not configured.")
  }

  const { current, previous, scope } = windowConditions(period)
  const { bucketSql, amount, unit } = PERIOD_CONFIG[period]

  const summaryQuery = `
    SELECT
      uniqIf(distinct_id, ${ACTIVE_CONDITION_SQL} AND ${current}) AS active_current,
      uniqIf(distinct_id, ${ACTIVE_CONDITION_SQL} AND ${previous}) AS active_previous,
      countIf(event = 'signup' AND ${current}) AS signups_current,
      countIf(event = 'signup' AND ${previous}) AS signups_previous,
      countIf(event = 'analysis_completed' AND ${current}) AS analyses_current,
      countIf(event = 'analysis_completed' AND ${previous}) AS analyses_previous,
      countIf(event = 'playlist_created' AND ${current}) AS playlists_current,
      countIf(event = 'playlist_created' AND ${previous}) AS playlists_previous
    FROM events
    WHERE ${scope}
  `

  // Retention needs per-user membership in both windows, which the aggregate above
  // can't express: uniq() over a union tells you how many distinct people appeared,
  // not which of them appeared twice. Hence the grouped subquery. It reads the same
  // two windows as the summary — no third window, so nothing here can be turned
  // into a trend line out of two data points.
  const retentionQuery = `
    SELECT
      countIf(in_current = 1 AND in_previous = 1) AS returning_users,
      countIf(in_previous = 1) AS prior_active_users
    FROM (
      SELECT
        distinct_id,
        maxIf(1, ${ACTIVE_CONDITION_SQL} AND ${current}) AS in_current,
        maxIf(1, ${ACTIVE_CONDITION_SQL} AND ${previous}) AS in_previous
      FROM events
      WHERE ${scope}
      GROUP BY distinct_id
    )
  `

  // One multi-column pass over the current window feeds both the main
  // chart (analyses) and the per-metric sparklines on the KPI tiles.
  const seriesQuery = `
    SELECT
      ${bucketSql}(timestamp) AS bucket,
      uniqIf(distinct_id, ${ACTIVE_CONDITION_SQL}) AS active,
      countIf(event = 'signup') AS signups,
      countIf(event = 'analysis_completed') AS analyses,
      countIf(event = 'playlist_created') AS playlists
    FROM events
    WHERE timestamp >= now() - INTERVAL ${amount} ${unit}
    GROUP BY bucket
    ORDER BY bucket
  `

  try {
    const [summaryRows, seriesRows, retentionRows] = await Promise.all([
      runHogQLQuery(config, summaryQuery),
      runHogQLQuery(config, seriesQuery),
      runHogQLQuery(config, retentionQuery),
    ])

    const row = summaryRows[0] ?? []
    const retentionRow = retentionRows[0] ?? []

    const filledColumn = (columnIndex: number) =>
      zeroFillSeries(
        seriesRows.map((seriesRow) => ({
          bucket: String(seriesRow[0] ?? ""),
          value: toNumber(seriesRow[columnIndex]),
        })),
        period
      )

    const analysesSeries = filledColumn(3)
    const sparkOf = (points: ReturnType<typeof filledColumn>) =>
      points.map((point) => point.value)

    return {
      period,
      activeUsers: buildMetric(
        toNumber(row[0]),
        toNumber(row[1]),
        sparkOf(filledColumn(1))
      ),
      signups: buildMetric(
        toNumber(row[2]),
        toNumber(row[3]),
        sparkOf(filledColumn(2))
      ),
      analysesCompleted: buildMetric(
        toNumber(row[4]),
        toNumber(row[5]),
        sparkOf(analysesSeries)
      ),
      playlistsCreated: buildMetric(
        toNumber(row[6]),
        toNumber(row[7]),
        sparkOf(filledColumn(4))
      ),
      retention: buildRetention(
        toNumber(retentionRow[0]),
        toNumber(retentionRow[1]),
        toNumber(row[4]),
        toNumber(row[0])
      ),
      series: analysesSeries,
    }
  } catch (error) {
    if (error instanceof PostHogUpstreamError) {
      throw error
    }

    logError("backstage.posthog_query_failed", error, { period })
    throw new PostHogUpstreamError(
      error instanceof Error ? error.message : "PostHog query failed."
    )
  }
}
