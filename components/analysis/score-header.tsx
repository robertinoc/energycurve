import Link from "next/link"
import { ArrowRight, AudioLines } from "lucide-react"

import { ANALYSIS_UI, formatTemplate } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  INVENTED_SHARE_WARN,
  scoreIsMeaningful,
  type EnergyCoverage,
} from "@/lib/engine/energy-coverage"

interface ScoreHeaderProps {
  /** Score recalculated by the engine over the CURRENT derived order. */
  currentScore: number
  /** base + Σ points of non-discarded fixes, capped at 10 (never < current). */
  potentialScore: number
  /** Engine-measured points already gained (current − base, ≥ 0). */
  gainedPoints: number
  /** Total points on the table (potential − base). */
  totalPoints: number
  /** Actionable fixes not yet applied nor discarded. */
  remainingCount: number
  /** Actionable fixes total / already decided (applied or discarded). */
  decidableCount: number
  decidedCount: number
  /** True once the order came from the smart-order feature (zone 4). */
  smartOrdered?: boolean
  /**
   * How much of the curve behind these numbers came from the music.
   *
   * Rendered here rather than left to the issue list because the score is at its
   * most flattering exactly when this is at its worst: a set with no data at all
   * scores 9.2, since the curve the engine grades is the ideal ramp it drew itself.
   * A caveat the reader has to scroll for is a caveat that doesn't work.
   */
  coverage?: EnergyCoverage
  /**
   * Where the measuring panel lives, when the reader owns this set. Absent means
   * no link is offered — the no-score state still explains itself.
   */
  playlistHref?: string
  locale: SiteLocale
}

/**
 * Zone 1 of the analysis redesign: `score now → you can reach`, with a
 * progress bar of engine-measured points gained over the points on the
 * table. The two numbers always come from the scoring engine — the header
 * only renders them.
 */
export function ScoreHeader({
  currentScore,
  potentialScore,
  gainedPoints,
  totalPoints,
  remainingCount,
  decidableCount,
  decidedCount,
  smartOrdered = false,
  coverage,
  playlistHref,
  locale,
}: ScoreHeaderProps) {
  const progress =
    totalPoints > 0 ? Math.min(1, Math.max(0, gainedPoints / totalPoints)) : 0

  /**
   * Whether the two numbers are worth showing at all.
   *
   * Below the line they aren't: the curve being scored is a ramp drawn from track
   * positions, and the target it's graded against comes from the same context, so
   * a set with no data at all scored 9.2. The caveat that used to sit *beside* the
   * number now takes its place — a headline and its retraction don't carry equal
   * weight, and the headline was winning.
   */
  const scorable = !coverage || scoreIsMeaningful(coverage)

  const caveat =
    coverage && scorable && coverage.inventedShare >= INVENTED_SHARE_WARN
      ? coverage.inventedShare === 1
        ? ANALYSIS_UI.coverageInventedAll[locale]
        : formatTemplate(ANALYSIS_UI.coverageInventedSome[locale], {
            count: coverage.inventedCount,
            total: coverage.trackCount,
          })
      : null

  const note = smartOrdered
    ? ANALYSIS_UI.claudeOrderNote[locale]
    : remainingCount === 0
      ? null
      : remainingCount === decidableCount
        ? formatTemplate(ANALYSIS_UI.applyAllNote[locale], {
            count: remainingCount,
          })
        : formatTemplate(ANALYSIS_UI.applyRemainingNote[locale], {
            count: remainingCount,
          })

  /**
   * The no-score state. Not an error and not an empty state: the analysis ran and
   * the tools below work — only the verdict is withheld, with what's missing and
   * how to get it, so the screen still tells the DJ what to do next.
   */
  if (!scorable) {
    return (
      <section className="rounded-[30px] border border-ec-amber/30 bg-ec-amber/[0.05] p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ec-amber">
            {ANALYSIS_UI.scoreNow[locale]}
          </p>
          <h2 className="font-heading text-[22px] font-bold leading-tight text-ec-text sm:text-[26px]">
            {ANALYSIS_UI.scoreUnavailable[locale]}
          </h2>
          <p className="max-w-[62ch] text-[13.5px] leading-6 text-white/70">
            {formatTemplate(ANALYSIS_UI.scoreUnavailableBody[locale], {
              count: coverage!.inventedCount,
              total: coverage!.trackCount,
            })}
          </p>
          <p className="max-w-[62ch] text-[13px] leading-6 text-ec-text-dim">
            {ANALYSIS_UI.scoreUnavailableFix[locale]}
          </p>
          {/* Back to the playlist, where the measuring panel lives. A link rather
              than the panel itself: measuring reads files from disk and belongs
              next to the tracklist it changes, not inside a results screen. */}
          {playlistHref ? (
            <Link
              href={playlistHref}
              className="mt-1 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-ec-amber underline-offset-4 hover:underline"
            >
              <AudioLines className="size-3.5" />
              {ANALYSIS_UI.scoreUnavailableCta[locale]}
            </Link>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[30px] border border-white/10 bg-ec-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
            {ANALYSIS_UI.scoreNow[locale]}
          </p>
          <p className="mt-1 font-mono text-[46px] font-bold leading-none text-ec-text">
            {currentScore.toFixed(1)}
          </p>
        </div>

        <ArrowRight
          aria-hidden
          className="mb-2 size-6 shrink-0 text-ec-text-dim"
        />

        <div>
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ec-cyan">
            {ANALYSIS_UI.canReach[locale]}
          </p>
          <p className="ec-gradient-text mt-1 font-mono text-[46px] font-bold leading-none">
            {potentialScore.toFixed(1)}
          </p>
        </div>

        {note ? (
          <p className="mb-2 max-w-[220px] text-[12.5px] leading-5 text-ec-text-dim">
            {note}
          </p>
        ) : null}
      </div>

      {caveat ? (
        <p className="mt-4 rounded-xl border border-ec-amber/35 bg-ec-amber/[0.06] px-3.5 py-2.5 text-[12.5px] leading-5 text-white/80">
          {caveat}
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="h-2 flex-1 overflow-hidden rounded-[5px] bg-ec-raised"
        >
          <div
            className="h-full rounded-[5px] motion-safe:transition-[width] motion-safe:duration-[350ms] motion-safe:ease-[cubic-bezier(.4,0,.2,1)]"
            style={{
              width: `${progress * 100}%`,
              background:
                "linear-gradient(96deg, #A24DE0 0%, #6A5CF0 46%, #22D3EE 100%)",
            }}
          />
        </div>
        <span className="shrink-0 font-mono text-[11px] text-ec-text-dim">
          {formatTemplate(ANALYSIS_UI.decidedCounter[locale], {
            done: decidedCount,
            total: decidableCount,
          })}
        </span>
      </div>
    </section>
  )
}
