"use client"

import { useMemo, useState } from "react"

import type {
  BackstageAcquisitionStatus,
  ToolUsage,
} from "@/lib/backstage/acquisition"
import {
  PERIOD_OPTIONS,
  resolveRange,
  type BackstageUserRow,
  type CustomRange,
  type PeriodId,
} from "@/lib/backstage/users"
import { cn } from "@/lib/utils"

import { AcquisitionDashboard } from "./AcquisitionDashboard"
import { UsersDashboard } from "./UsersDashboard"

/**
 * One period, two dashboards. The cohort view and the acquisition view answer
 * the same question from different angles ("who joined in this window, and
 * what happened to them"), so they share a single joined-at window instead of
 * each carrying its own — before this, the cohort dashboard had presets and
 * the acquisition section silently meant "all time", and comparing the two
 * was comparing different people. Custom dates are inclusive on both ends.
 */

const dateLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

export function DecisionDashboards({
  users,
  acquisition,
  toolUsage,
}: {
  users: BackstageUserRow[]
  acquisition: BackstageAcquisitionStatus
  toolUsage: ToolUsage | null
}) {
  const [period, setPeriod] = useState<PeriodId | "custom">("all")
  const [custom, setCustom] = useState<CustomRange>({})
  // Fixed at mount so nobody crosses a window line between renders.
  const now = useMemo(() => new Date(), [])

  const range = useMemo(
    () => resolveRange(period, custom, now),
    [period, custom, now]
  )

  const periodLabel = useMemo(() => {
    if (period !== "custom") {
      return PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? ""
    }

    const from = range.from ? dateLabel.format(range.from) : "the beginning"
    // range.to carries the +1-day exclusive end; show the day that was picked.
    const to = range.to
      ? dateLabel.format(new Date(range.to.getTime() - 24 * 60 * 60 * 1000))
      : "today"

    return `${from} → ${to}`
  }, [period, range])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] font-bold tracking-[0.15em] text-ec-text-dim uppercase">
          Joined
        </span>
        <div
          role="radiogroup"
          aria-label="Cohort period"
          className="flex flex-wrap gap-1.5"
        >
          {[...PERIOD_OPTIONS, { id: "custom" as const, label: "Custom…" }].map(
            (option) => (
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
            )
          )}
        </div>
        {period === "custom" ? (
          <div className="flex items-center gap-1.5">
            <label className="sr-only" htmlFor="cohort-from">
              From
            </label>
            <input
              id="cohort-from"
              type="date"
              value={custom.from ?? ""}
              onChange={(event) =>
                setCustom((prev) => ({ ...prev, from: event.target.value }))
              }
              className="rounded-lg border border-ec-border bg-ec-sunken px-2 py-1 font-mono text-[12px] text-ec-text [color-scheme:dark]"
            />
            <span className="text-ec-text-dim">→</span>
            <label className="sr-only" htmlFor="cohort-to">
              To
            </label>
            <input
              id="cohort-to"
              type="date"
              value={custom.to ?? ""}
              onChange={(event) =>
                setCustom((prev) => ({ ...prev, to: event.target.value }))
              }
              className="rounded-lg border border-ec-border bg-ec-sunken px-2 py-1 font-mono text-[12px] text-ec-text [color-scheme:dark]"
            />
          </div>
        ) : null}
      </div>

      <UsersDashboard users={users} range={range} periodLabel={periodLabel} />

      <AcquisitionDashboard
        users={users}
        acquisition={acquisition}
        toolUsage={toolUsage}
        range={range}
        periodLabel={periodLabel}
      />
    </div>
  )
}
