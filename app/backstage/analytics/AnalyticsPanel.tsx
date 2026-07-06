"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, ListMusic, UserPlus, Waves } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
  type BackstageAnalyticsSummary,
  type MetricWithDelta,
} from "@/lib/backstage/analytics"

import {
  Bento,
  BentoLabel,
  Sparkbars,
  Sparkline,
  TrendPill,
} from "../BackstagePrimitives"

type PanelState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: BackstageAnalyticsSummary }

const numberFormat = new Intl.NumberFormat("en-GB")

/** KPI tile pattern from StageLink's analytics redesign (KpiTile). */
function StatTile({
  label,
  metric,
  color,
  icon,
}: {
  label: string
  metric: MetricWithDelta
  color: string
  icon: React.ReactNode
}) {
  return (
    <Bento tone="panel" className="flex flex-col justify-between gap-3 p-5">
      <div className="flex items-center gap-2">
        <span
          className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-white/[0.05]"
          style={{ color }}
        >
          {icon}
        </span>
        <span className="text-[11.5px] font-medium text-white/70">{label}</span>
      </div>
      <p className="font-heading text-[32px] font-bold leading-none text-white">
        {numberFormat.format(metric.current)}
      </p>
      <div className="flex items-center gap-2">
        <TrendPill value={metric.current} prev={metric.previous} />
        <div className="min-w-0 flex-1">
          <Sparkline data={metric.spark} color={color} height={28} />
        </div>
      </div>
    </Bento>
  )
}

/** Hero pattern from StageLink's HeroCard: big stat left, chart right. */
function AnalysesHero({ summary }: { summary: BackstageAnalyticsSummary }) {
  const labelEvery =
    summary.period === "30d" ? 5 : summary.period === "24h" ? 4 : 1
  const periodLabel =
    summary.period === "24h"
      ? "last 24 hours"
      : `last ${summary.period.replace("d", " days")}`

  return (
    <Bento tone="accent" glow className="p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-end">
        <div className="space-y-3">
          <BentoLabel className="text-[#CDA2F1]">
            Analyses completed · {periodLabel}
          </BentoLabel>
          <p className="bg-[linear-gradient(135deg,#fff_0%,#A24DE0_100%)] bg-clip-text font-heading text-[56px] font-bold leading-none text-transparent">
            {numberFormat.format(summary.analysesCompleted.current)}
          </p>
          <div className="flex items-center gap-2">
            <TrendPill
              value={summary.analysesCompleted.current}
              prev={summary.analysesCompleted.previous}
            />
            <span className="text-xs text-white/50">vs previous window</span>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-white/60">
            The north-star metric: every bar is one{" "}
            {summary.period === "24h" ? "hour" : "day"} of set analyses across
            the whole platform.
          </p>
        </div>
        <div className="space-y-2">
          <Sparkbars
            data={summary.series.map((point) => point.value)}
            color="#22D3EE"
            height={120}
          />
          <div className="flex gap-[2px] font-mono text-[10px] text-white/40">
            {summary.series.map((point, index) => (
              <span
                key={`${point.label}-${index}`}
                className="flex-1 text-center"
              >
                {index % labelEvery === 0 ? point.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Bento>
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
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BentoLabel>Product summary</BentoLabel>
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
        </div>

        {state.status === "loading" ? (
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-[20px] bg-white/[0.04]" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-[20px] bg-white/[0.04]"
                />
              ))}
            </div>
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
            <AnalysesHero summary={state.summary} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Active users"
                metric={state.summary.activeUsers}
                color="#A24DE0"
                icon={<Activity className="size-3.5" />}
              />
              <StatTile
                label="Signups"
                metric={state.summary.signups}
                color="#22D3EE"
                icon={<UserPlus className="size-3.5" />}
              />
              <StatTile
                label="Analyses run"
                metric={state.summary.analysesCompleted}
                color="#F0348A"
                icon={<Waves className="size-3.5" />}
              />
              <StatTile
                label="Playlists created"
                metric={state.summary.playlistsCreated}
                color="#F5A524"
                icon={<ListMusic className="size-3.5" />}
              />
            </div>
          </>
        ) : null}
      </div>

      {embedUrls.length > 0 ? (
        <div className="space-y-4">
          <BentoLabel>PostHog dashboards</BentoLabel>
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
