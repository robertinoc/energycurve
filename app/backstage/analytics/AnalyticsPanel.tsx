"use client"

import { useCallback, useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
  type BackstageAnalyticsSummary,
  type MetricWithDelta,
} from "@/lib/backstage/analytics"
import { cn } from "@/lib/utils"

type PanelState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: BackstageAnalyticsSummary }

function DeltaTag({ metric }: { metric: MetricWithDelta }) {
  if (metric.deltaPercent === null) {
    return <span className="text-xs text-ec-text-dim">— vs previous</span>
  }

  const positive = metric.deltaPercent >= 0

  return (
    <span
      className={cn(
        "font-mono text-xs font-bold",
        positive ? "text-ec-cyan" : "text-[#FF87BE]"
      )}
    >
      {positive ? "▲" : "▼"} {Math.abs(metric.deltaPercent)}% vs previous
    </span>
  )
}

function MetricTile({
  label,
  metric,
}: {
  label: string
  metric: MetricWithDelta
}) {
  return (
    <Card>
      <CardContent className="space-y-1.5 p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ec-text-dim">
          {label}
        </p>
        <p className="font-heading text-3xl font-bold text-ec-text">
          {metric.current}
        </p>
        <DeltaTag metric={metric} />
      </CardContent>
    </Card>
  )
}

function SeriesBarChart({ summary }: { summary: BackstageAnalyticsSummary }) {
  const max = Math.max(...summary.series.map((point) => point.value), 1)
  const labelEvery = summary.period === "30d" ? 5 : summary.period === "24h" ? 4 : 1

  return (
    <div className="space-y-2">
      <div className="flex h-36 items-end gap-1">
        {summary.series.map((point, index) => (
          <div
            key={`${point.label}-${index}`}
            className="group relative flex-1"
            title={`${point.label}: ${point.value}`}
          >
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-[#A24DE0]/60 to-[#22D3EE]/80 transition-all group-hover:brightness-125"
              style={{
                height: `${Math.max((point.value / max) * 100, point.value > 0 ? 6 : 2)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 font-mono text-[10px] text-ec-text-dim">
        {summary.series.map((point, index) => (
          <span key={`${point.label}-${index}`} className="flex-1 text-center">
            {index % labelEvery === 0 ? point.label : ""}
          </span>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsPanel({ embedUrls }: { embedUrls: string[] }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d")
  const [state, setState] = useState<PanelState>({ status: "loading" })

  // The fetcher returns the next panel state instead of setting it, so the
  // effect only applies it inside the promise callback (with a cancellation
  // flag) — the react-hooks/set-state-in-effect pattern.
  const fetchSummary = useCallback(
    async (nextPeriod: AnalyticsPeriod): Promise<PanelState> => {
      try {
        const response = await fetch(
          `/api/backstage/analytics/summary?period=${nextPeriod}`
        )
        const payload = (await response.json().catch(() => null)) as {
          configured?: boolean
          summary?: BackstageAnalyticsSummary
          error?: string
        } | null

        if (payload?.configured === false) {
          return { status: "unconfigured" }
        }

        if (!response.ok || !payload?.summary) {
          return {
            status: "error",
            message: payload?.error ?? `Request failed (${response.status})`,
          }
        }

        return { status: "ready", summary: payload.summary }
      } catch {
        return {
          status: "error",
          message: "Network error loading analytics.",
        }
      }
    },
    []
  )

  useEffect(() => {
    let cancelled = false

    void fetchSummary(period).then((next) => {
      if (!cancelled) {
        setState(next)
      }
    })

    return () => {
      cancelled = true
    }
  }, [period, fetchSummary])

  function changePeriod(option: AnalyticsPeriod) {
    if (option !== period) {
      setState({ status: "loading" })
      setPeriod(option)
    }
  }

  function retry() {
    setState({ status: "loading" })
    void fetchSummary(period).then(setState)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Product summary</CardTitle>
          <div className="flex gap-1.5">
            {ANALYTICS_PERIODS.map((option) => (
              <Button
                key={option}
                variant={option === period ? "secondary" : "ghost"}
                size="xs"
                onClick={() => changePeriod(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {state.status === "loading" ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-xl bg-white/[0.04]"
                />
              ))}
            </div>
          ) : null}

          {state.status === "unconfigured" ? (
            <Alert>
              <AlertTitle>PostHog reporting is not configured</AlertTitle>
              <AlertDescription>
                Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID to light up
                the live summary. The embedded dashboards below work
                independently.
              </AlertDescription>
            </Alert>
          ) : null}

          {state.status === "error" ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load the summary</AlertTitle>
              <AlertDescription className="flex items-center gap-3">
                {state.message}
                <Button variant="outline" size="xs" onClick={retry}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {state.status === "ready" ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricTile
                  label="Active users"
                  metric={state.summary.activeUsers}
                />
                <MetricTile label="Signups" metric={state.summary.signups} />
                <MetricTile
                  label="Analyses run"
                  metric={state.summary.analysesCompleted}
                />
                <MetricTile
                  label="Playlists created"
                  metric={state.summary.playlistsCreated}
                />
              </div>
              <div className="space-y-2">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ec-text-dim">
                  Analyses completed per{" "}
                  {state.summary.period === "24h" ? "hour" : "day"}
                </p>
                <SeriesBarChart summary={state.summary} />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {embedUrls.length > 0 ? (
        <div className="space-y-4">
          {embedUrls.map((url) => (
            <Card key={url}>
              <CardContent className="p-2">
                <iframe
                  src={url}
                  className="h-[560px] w-full rounded-lg border-0"
                  allowFullScreen
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <AlertTitle>No PostHog dashboards embedded yet</AlertTitle>
          <AlertDescription>
            Share each PostHog dashboard (Share → Embed) and put the URLs in
            BACKSTAGE_POSTHOG_EMBED_URLS (comma-separated).
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
