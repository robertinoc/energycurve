/**
 * Pure types + math for the backstage Analytics tab. The PostHog fetch
 * lives in posthog-reporting.ts; everything here is unit-testable.
 */

export const ANALYTICS_PERIODS = ["24h", "7d", "30d"] as const

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]

export function isAnalyticsPeriod(value: string): value is AnalyticsPeriod {
  return (ANALYTICS_PERIODS as readonly string[]).includes(value)
}

interface PeriodConfig {
  /** HogQL interval unit + amount for the current window. */
  unit: "HOUR" | "DAY"
  amount: number
  /** HogQL bucket function for the time series. */
  bucketSql: "toStartOfHour" | "toStartOfDay"
  bucketMs: number
  bucketCount: number
}

export const PERIOD_CONFIG: Record<AnalyticsPeriod, PeriodConfig> = {
  "24h": {
    unit: "HOUR",
    amount: 24,
    bucketSql: "toStartOfHour",
    bucketMs: 60 * 60 * 1000,
    bucketCount: 24,
  },
  "7d": {
    unit: "DAY",
    amount: 7,
    bucketSql: "toStartOfDay",
    bucketMs: 24 * 60 * 60 * 1000,
    bucketCount: 7,
  },
  "30d": {
    unit: "DAY",
    amount: 30,
    bucketSql: "toStartOfDay",
    bucketMs: 24 * 60 * 60 * 1000,
    bucketCount: 30,
  },
}

export interface MetricWithDelta {
  current: number
  previous: number
  /** Percent change vs the previous window; null when previous is 0. */
  deltaPercent: number | null
  /** Per-bucket values across the current window, for mini sparklines. */
  spark: number[]
}

export function buildMetric(
  current: number,
  previous: number,
  spark: number[] = []
): MetricWithDelta {
  return {
    current,
    previous,
    deltaPercent:
      previous === 0
        ? null
        : Math.round(((current - previous) / previous) * 100),
    spark,
  }
}

export interface SeriesPoint {
  label: string
  value: number
}

export interface BackstageAnalyticsSummary {
  period: AnalyticsPeriod
  activeUsers: MetricWithDelta
  signups: MetricWithDelta
  analysesCompleted: MetricWithDelta
  playlistsCreated: MetricWithDelta
  /** Analyses completed per bucket (hourly for 24h, daily otherwise). */
  series: SeriesPoint[]
}

function bucketLabel(date: Date, period: AnalyticsPeriod): string {
  if (period === "24h") {
    return `${String(date.getUTCHours()).padStart(2, "0")}h`
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  })
}

/**
 * PostHog only returns buckets that have events; the chart needs the empty
 * ones too. Bucket keys from HogQL come as "YYYY-MM-DD HH:mm:ss" (UTC).
 */
export function zeroFillSeries(
  rows: Array<{ bucket: string; value: number }>,
  period: AnalyticsPeriod,
  now: Date = new Date()
): SeriesPoint[] {
  const config = PERIOD_CONFIG[period]
  const valuesByBucket = new Map<number, number>()

  for (const row of rows) {
    // The Query API serializes datetimes either as "YYYY-MM-DD HH:mm:ss"
    // or as ISO with T/offset — normalize both, defaulting to UTC.
    let key = row.bucket.replace(" ", "T")

    if (!/(z|[+-]\d{2}:?\d{2})$/i.test(key)) {
      key += "Z"
    }

    const parsed = new Date(key)

    if (!Number.isNaN(parsed.getTime())) {
      // Floor to the bucket grid so a non-UTC project timezone still lands
      // on a bucket instead of silently dropping the value.
      const bucketStart =
        Math.floor(parsed.getTime() / config.bucketMs) * config.bucketMs

      valuesByBucket.set(
        bucketStart,
        (valuesByBucket.get(bucketStart) ?? 0) + row.value
      )
    }
  }

  const nowBucketStart =
    Math.floor(now.getTime() / config.bucketMs) * config.bucketMs
  const points: SeriesPoint[] = []

  for (let i = config.bucketCount - 1; i >= 0; i -= 1) {
    const bucketStart = nowBucketStart - i * config.bucketMs

    points.push({
      label: bucketLabel(new Date(bucketStart), period),
      value: valuesByBucket.get(bucketStart) ?? 0,
    })
  }

  return points
}
