"use client"

import { useEffect, useMemo, useState } from "react"

import { countryFlagEmoji, countryName } from "@/lib/backstage/country"
import {
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_META,
  type BackstageUserRow,
  type PeriodId,
  PERIOD_OPTIONS,
  activityStatus,
  countBy,
  joinedInPeriod,
} from "@/lib/backstage/users"
import { PLANS, type Plan } from "@/lib/product/plans"
import { cn } from "@/lib/utils"

import { Bento, BentoLabel } from "./BackstagePrimitives"

/**
 * The cohort dashboard under the users table — StageLink's UsersDashboard
 * ("Where they are, what they pay, whether they come back") on EnergyCurve
 * data. The period picks WHO is counted (joined-at window); plan and status
 * are always as of today.
 */

const PLAN_COLORS: Record<Plan, string> = {
  free: "#F5A524",
  pro: "#22D3EE",
  pro_plus: "#A24DE0",
}

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "PRO",
  pro_plus: "PRO+",
}

const MAP_TINT = "162, 77, 224" // --ec-violet

interface WorldMapData {
  viewBox: string
  locations: Array<{ id: string; name: string; path: string }>
}

// Module-level promise: the ~200 KB of country paths load once per session,
// only when this component actually mounts.
let worldMapPromise: Promise<WorldMapData> | null = null

function loadWorldMap(): Promise<WorldMapData> {
  worldMapPromise ??= import("@svg-maps/world").then(
    (module) => (module.default ?? module) as WorldMapData
  )

  return worldMapPromise
}

function WorldMapChart({
  counts,
}: {
  counts: Array<{ key: string; count: number }>
}) {
  const [map, setMap] = useState<WorldMapData | null>(null)
  const [failed, setFailed] = useState(false)
  const [hover, setHover] = useState<{
    code: string
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    loadWorldMap()
      .then((data) => {
        if (!cancelled) setMap(data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const countByCode = useMemo(
    () => new Map(counts.map((row) => [row.key.toLowerCase(), row.count])),
    [counts]
  )
  const max = Math.max(...counts.map((row) => row.count), 1)

  if (failed) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 p-4 text-[13px] text-white/40">
        The map could not load — the country list below has the same data.
      </p>
    )
  }

  if (!map) {
    return (
      <div
        className="w-full animate-pulse rounded-xl bg-white/[0.04]"
        style={{ aspectRatio: "1010 / 666" }}
      />
    )
  }

  const hoverCount = hover ? (countByCode.get(hover.code) ?? 0) : 0

  return (
    <div className="relative">
      <svg
        viewBox={map.viewBox}
        role="img"
        aria-label="Users by country"
        className="w-full"
        onMouseMove={(event) => {
          const code = (event.target as SVGElement).dataset.country

          if (!code) {
            setHover(null)
            return
          }

          const bounds = event.currentTarget.getBoundingClientRect()

          setHover({
            code,
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          })
        }}
        onMouseLeave={() => setHover(null)}
      >
        {map.locations.map((location) => {
          const count = countByCode.get(location.id) ?? 0
          const opacity =
            count > 0 ? 0.35 + 0.65 * Math.sqrt(count / max) : 0

          return (
            <path
              key={location.id}
              d={location.path}
              data-country={location.id}
              fill={
                count > 0
                  ? `rgba(${MAP_TINT}, ${opacity})`
                  : "rgba(255,255,255,0.06)"
              }
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
            />
          )
        })}
      </svg>
      {hover ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-ec-border bg-ec-surface px-2.5 py-1.5 text-[12px] whitespace-nowrap text-ec-text shadow-lg"
          style={{ left: hover.x + 12, top: hover.y - 12 }}
        >
          {countryFlagEmoji(hover.code)} {countryName(hover.code)} ·{" "}
          <span className="font-mono font-bold">{hoverCount}</span>
        </div>
      ) : null}
    </div>
  )
}

function CountryList({
  counts,
  unknown,
  total,
}: {
  counts: Array<{ key: string; count: number }>
  unknown: number
  total: number
}) {
  const top = counts.slice(0, 8)
  const restCount = counts.length - top.length
  const restUsers = counts.slice(8).reduce((sum, row) => sum + row.count, 0)
  const max = Math.max(...counts.map((row) => row.count), 1)

  if (counts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 p-4 text-[13px] text-white/40">
        No countries recorded for this cohort yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {top.map((row) => (
          <li key={row.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate text-white/80">
                {countryFlagEmoji(row.key)} {countryName(row.key)}
              </span>
              <span className="shrink-0 font-mono text-[11.5px] text-white/60">
                <strong className="text-white">{row.count}</strong> ·{" "}
                {total > 0 ? Math.round((row.count / total) * 100) : 0}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-ec-violet"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="font-mono text-[11px] text-white/40">
        {restCount > 0
          ? `+${restUsers} in ${restCount} other ${restCount === 1 ? "country" : "countries"} · `
          : ""}
        {unknown} with no country recorded
      </p>
    </div>
  )
}

function BarList({
  rows,
  total,
}: {
  rows: Array<{ key: string; label: string; count: number; color: string; title?: string }>
  total: number
}) {
  const max = Math.max(...rows.map((row) => row.count), 1)

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="space-y-1.5" title={row.title}>
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="inline-flex items-center gap-2 text-white/80">
              <span
                className="size-2 rounded-[3px]"
                style={{ background: row.color }}
              />
              {row.label}
            </span>
            <span className="font-mono text-[11.5px] text-white/60">
              <strong className="text-white">{row.count}</strong> ·{" "}
              {total > 0 ? Math.round((row.count / total) * 100) : 0}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.count / max) * 100}%`,
                background: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function UsersDashboard({ users }: { users: BackstageUserRow[] }) {
  const [period, setPeriod] = useState<PeriodId>("all")
  // Fixed at mount so nobody crosses the 30-day line between renders.
  const now = useMemo(() => new Date(), [])

  const cohort = useMemo(
    () => users.filter((user) => joinedInPeriod(user, period, now)),
    [users, period, now]
  )

  const byCountry = useMemo(
    () => countBy(cohort, (user) => user.countryCode),
    [cohort]
  )
  const knownCountryUsers = byCountry.reduce((sum, row) => sum + row.count, 0)

  const byPlan = PLANS.map((plan) => ({
    key: plan,
    label: PLAN_LABELS[plan],
    count: cohort.filter((user) => user.plan === plan).length,
    color: PLAN_COLORS[plan],
  }))

  const byStatus = ACTIVITY_STATUSES.map((status) => ({
    key: status,
    label: ACTIVITY_STATUS_META[status].label,
    title: ACTIVITY_STATUS_META[status].description,
    count: cohort.filter((user) => activityStatus(user, now) === status)
      .length,
    color: ACTIVITY_STATUS_META[status].color,
  }))

  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? ""

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-bold">
            Where they are, what they pay, whether they come back
          </h2>
          <p className="text-sm text-ec-text-dim">
            {cohort.length} users joined · {periodLabel}. Plan and status are
            as of today.
          </p>
        </div>
        <div role="radiogroup" aria-label="Cohort period" className="flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={option.id === period}
              onClick={() => setPeriod(option.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-bold transition-colors",
                option.id === period
                  ? "ec-gradient-bg border-transparent text-white"
                  : "border-ec-border text-ec-text-dim hover:text-ec-text-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr_1fr]">
        <Bento tone="panel" className="space-y-4 p-5">
          <BentoLabel>
            By country · {byCountry.length}{" "}
            {byCountry.length === 1 ? "country" : "countries"} ·{" "}
            {cohort.length - knownCountryUsers} unknown
          </BentoLabel>
          <WorldMapChart counts={byCountry} />
          <CountryList
            counts={byCountry}
            unknown={cohort.length - knownCountryUsers}
            total={cohort.length}
          />
        </Bento>

        <Bento tone="accent" className="space-y-4 p-5">
          <BentoLabel>By plan</BentoLabel>
          <p className="text-[12px] text-white/50">
            Entitled plan today (Stripe status applied).
          </p>
          <BarList rows={byPlan} total={cohort.length} />
        </Bento>

        <Bento tone="panel" className="space-y-4 p-5">
          <BentoLabel>By status</BentoLabel>
          <p className="text-[12px] text-white/50">
            Active = used the app in the last 30 days.
          </p>
          <BarList rows={byStatus} total={cohort.length} />
        </Bento>
      </div>
    </section>
  )
}
