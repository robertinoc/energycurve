"use client"

import { Sparkles } from "lucide-react"

import { ANALYSIS_UI, formatTemplate } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { ENERGY_SCORE_RANGE } from "@/lib/product/strategy"
import { cn } from "@/lib/utils"

export interface LiveTracklistRow {
  id: string
  artist: string
  name: string
  /** Resolved energy score (0–10) — drives the mini bar + mono number. */
  score: number
  /** 1-based position in the ORIGINAL saved order (amber chip when moved). */
  originalPosition: number
}

export type SmartOrderStatus = "idle" | "thinking" | "done" | "fallback"

interface LiveTracklistProps {
  /** Rows in the CURRENT derived order. */
  rows: LiveTracklistRow[]
  movedCount: number
  /** True when any decision or smart order diverges from the original. */
  dirty: boolean
  smartStatus: SmartOrderStatus
  onSmartOrder: () => void
  onReset: () => void
  /** Export dropdown for the current derived order (rendered next to the
   * smart-order button so the flow ends where the user's eye ends). */
  exportSlot?: React.ReactNode
  locale: SiteLocale
}

/**
 * Zone 3 of the analysis redesign: the single live tracklist that replaces
 * the two side-by-side 48-row lists. Purely presentational — the order is
 * derived upstream (original order + applied fix operations + smart order),
 * so every change here is exact and reversible.
 */
export function LiveTracklist({
  rows,
  movedCount,
  dirty,
  smartStatus,
  onSmartOrder,
  onReset,
  exportSlot,
  locale,
}: LiveTracklistProps) {
  const subtitle =
    movedCount > 0
      ? formatTemplate(ANALYSIS_UI.movedSubtitle[locale], {
          moved: movedCount,
          total: rows.length,
        })
      : ANALYSIS_UI.unmovedSubtitle[locale]

  const smartLabel =
    smartStatus === "thinking"
      ? ANALYSIS_UI.smartOrderThinking[locale]
      : smartStatus === "done" || smartStatus === "fallback"
        ? ANALYSIS_UI.smartOrderDone[locale]
        : ANALYSIS_UI.smartOrderCta[locale]

  // Two columns read DOWN each column (positions 1..24 left, 25..48 right),
  // like a printed tracklist — grid-flow-col with an explicit row count.
  const columnRows = Math.ceil(rows.length / 2)

  return (
    <section className="rounded-2xl border border-ec-border bg-ec-surface p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
            {ANALYSIS_UI.liveOrderEyebrow[locale]}
          </p>
          <p className="mt-1 text-sm text-ec-text-muted">{subtitle}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {exportSlot}
          <button
            type="button"
            onClick={onSmartOrder}
            disabled={smartStatus === "thinking"}
            className={cn(
              "inline-flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0",
              "shadow-[0_8px_26px_rgba(106,92,240,0.35)]"
            )}
            style={{
              background:
                "linear-gradient(96deg, #A24DE0 0%, #6A5CF0 46%, #22D3EE 100%)",
            }}
          >
            <Sparkles className="size-4" aria-hidden />
            {smartLabel}
          </button>
          {dirty ? (
            <button
              type="button"
              onClick={onReset}
              className="rounded-[13px] border border-white/14 px-4 py-2.5 text-sm text-white/64 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {ANALYSIS_UI.backToOriginal[locale]}
            </button>
          ) : null}
        </div>
      </div>

      <ol
        className="grid gap-1.5 sm:grid-flow-col sm:grid-cols-2"
        style={{ gridTemplateRows: `repeat(${columnRows}, minmax(0, 1fr))` }}
      >
        {rows.map((row, index) => {
          const position = index + 1
          const moved = row.originalPosition !== position
          const fill = Math.max(
            0,
            Math.min(1, row.score / ENERGY_SCORE_RANGE.max)
          )

          return (
            <li
              key={row.id}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-[10px] bg-ec-sunken px-3 py-2",
                "motion-safe:transition-colors",
                moved && "outline outline-1 -outline-offset-1 outline-ec-amber/20"
              )}
            >
              <span className="w-6 shrink-0 text-right font-mono text-xs text-ec-text-dim">
                {position}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ec-text"
                title={`${row.artist} — ${row.name}`}
              >
                {row.name}
              </span>
              {moved ? (
                <span className="shrink-0 rounded-md border border-ec-amber/40 bg-ec-amber/[0.08] px-1.5 py-px font-mono text-[10px] font-bold text-ec-amber">
                  {formatTemplate(ANALYSIS_UI.fromChip[locale], {
                    n: row.originalPosition,
                  })}
                </span>
              ) : null}
              <span
                className="h-[5px] w-14 shrink-0 overflow-hidden rounded-full bg-ec-raised"
                aria-hidden
              >
                <span
                  className="block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300"
                  style={{
                    width: `${fill * 100}%`,
                    background:
                      "linear-gradient(90deg, #6A5CF0 0%, #A24DE0 100%)",
                  }}
                />
              </span>
              <span className="w-7 shrink-0 text-right font-mono text-xs text-ec-text-muted">
                {row.score.toFixed(1)}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
