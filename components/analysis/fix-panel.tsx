"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import {
  buildSmoothCurvePath,
  mapValuesToCurvePoints,
} from "@/lib/charts/curve-geometry"
import { ANALYSIS_UI, formatTemplate } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { SetFix } from "@/lib/engine/fixes"
import { ENERGY_SCORE_RANGE } from "@/lib/product/strategy"
import { cn } from "@/lib/utils"

const MINI_WIDTH = 300
const MINI_HEIGHT = 96
const MINI_PADDING = 10

export type FixStatus = "pending" | "applied" | "discarded"

interface FixPanelProps {
  fix: SetFix
  title: string
  actionText: string
  whyText: string
  /** 1-based index among navigable fixes ("Arreglo i de N"). */
  index: number
  total: number
  status: FixStatus
  /** Curve segment around the fix, before vs after applying it. */
  beforeWindow: number[]
  afterWindow: number[]
  /** Chips shown when the fix involves several tracks (e.g. out of range). */
  chips: { position: number; name: string }[]
  onPrev: () => void
  onNext: () => void
  onApply: () => void
  onUndo: () => void
  onDiscard: () => void
  onReconsider: () => void
  locale: SiteLocale
}

function miniPath(values: number[]): string {
  return buildSmoothCurvePath(
    mapValuesToCurvePoints(values, MINI_WIDTH, MINI_HEIGHT, MINI_PADDING, {
      min: ENERGY_SCORE_RANGE.min,
      max: ENERGY_SCORE_RANGE.max,
    })
  )
}

/**
 * Zone 2 right panel: the selected fix as one problem = one action = one
 * button. Short title, one action sentence, one grey why line, a real
 * before/after segment of the curve, and the Apply / Leave-it CTAs.
 */
export function FixPanel({
  fix,
  title,
  actionText,
  whyText,
  index,
  total,
  status,
  beforeWindow,
  afterWindow,
  chips,
  onPrev,
  onNext,
  onApply,
  onUndo,
  onDiscard,
  onReconsider,
  locale,
}: FixPanelProps) {
  const isPositive = fix.severity === "positive"
  const actionable = fix.operations.length > 0

  const beforePath = useMemo(
    () => (beforeWindow.length > 1 ? miniPath(beforeWindow) : null),
    [beforeWindow]
  )
  const afterPath = useMemo(
    () => (afterWindow.length > 1 ? miniPath(afterWindow) : null),
    [afterWindow]
  )
  const windowsDiffer =
    beforeWindow.length !== afterWindow.length ||
    beforeWindow.some((value, i) => value !== afterWindow[i])

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-ec-border bg-ec-surface p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
          {isPositive
            ? "—"
            : formatTemplate(ANALYSIS_UI.fixCounter[locale], { index, total })}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={ANALYSIS_UI.prevFixAria[locale]}
            onClick={onPrev}
            className="grid size-8 place-items-center rounded-lg text-white/56 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={ANALYSIS_UI.nextFixAria[locale]}
            onClick={onNext}
            className="grid size-8 place-items-center rounded-lg text-white/56 hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <h3 className="font-heading text-2xl font-semibold leading-tight text-ec-text">
        {title}
      </h3>

      {isPositive ? (
        <p className="text-sm leading-6 text-ec-text-muted">
          {ANALYSIS_UI.positiveNothing[locale]}
        </p>
      ) : (
        <>
          {fix.points > 0 ? (
            <p className="flex items-baseline gap-2">
              <span className="font-mono text-[26px] font-bold leading-none text-ec-amber">
                +{fix.points.toFixed(1)}
              </span>
              <span className="text-[12.5px] text-ec-text-dim">
                {ANALYSIS_UI.recoverable[locale]}
              </span>
            </p>
          ) : null}

          <div className="rounded-xl border border-ec-border bg-ec-sunken p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
              {ANALYSIS_UI.theFixLabel[locale]}
            </p>
            <p className="mt-2 text-[15px] font-medium leading-6 text-ec-text">
              {actionText}
            </p>
            <p className="mt-1.5 text-[13px] leading-5 text-ec-text-dim">
              {whyText}
            </p>
            {chips.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip.position}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/12 bg-white/[0.03] px-2 py-0.5 text-xs text-white/72"
                  >
                    <span className="font-mono font-bold text-ec-cyan">
                      {chip.position}
                    </span>
                    <span className="truncate">{chip.name}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {actionable && windowsDiffer && beforePath && afterPath ? (
            <div className="rounded-xl border border-ec-border bg-ec-sunken p-4">
              <div className="flex items-center gap-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
                <span className="flex items-center gap-1.5 text-ec-text-dim">
                  <span className="inline-block h-0 w-4 border-t-2 border-dashed border-white/40" />
                  {ANALYSIS_UI.beforeLabel[locale]}
                </span>
                <span className="flex items-center gap-1.5 text-ec-cyan">
                  <span className="inline-block h-0.5 w-4 rounded bg-ec-cyan" />
                  {ANALYSIS_UI.afterLabel[locale]}
                </span>
              </div>
              <svg
                viewBox={`0 0 ${MINI_WIDTH} ${MINI_HEIGHT}`}
                className="mt-2 h-24 w-full"
                aria-hidden
              >
                <path
                  d={beforePath}
                  fill="none"
                  stroke="rgba(245,242,252,0.40)"
                  strokeWidth="2"
                  strokeDasharray="5 6"
                  strokeLinecap="round"
                />
                <path
                  d={afterPath}
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.5))" }}
                />
              </svg>
            </div>
          ) : null}

          <div className="mt-auto flex flex-col gap-2.5">
            {actionable ? (
              <button
                type="button"
                onClick={status === "applied" ? onUndo : onApply}
                className={cn(
                  "rounded-[13px] px-4 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-px",
                  status === "applied"
                    ? "border border-ec-cyan/50 bg-ec-cyan/10 text-ec-cyan"
                    : "shadow-[0_8px_26px_rgba(106,92,240,0.35)]"
                )}
                style={
                  status === "applied"
                    ? undefined
                    : {
                        background:
                          "linear-gradient(96deg, #A24DE0 0%, #6A5CF0 46%, #22D3EE 100%)",
                      }
                }
              >
                {status === "applied"
                  ? ANALYSIS_UI.appliedCta[locale]
                  : ANALYSIS_UI.applyCta[locale]}
              </button>
            ) : null}
            <button
              type="button"
              onClick={status === "discarded" ? onReconsider : onDiscard}
              className={cn(
                "rounded-[13px] border px-4 py-2.5 text-sm transition-colors",
                status === "discarded"
                  ? "border-ec-amber/40 text-ec-amber hover:bg-ec-amber/10"
                  : "border-white/14 text-white/64 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              {status === "discarded"
                ? ANALYSIS_UI.discardedCta[locale]
                : ANALYSIS_UI.discardCta[locale]}
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
