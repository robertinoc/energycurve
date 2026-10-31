"use client"

import { useState } from "react"

import { formatTemplate } from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { SPLIT_CRITERIA, type SplitCriterion } from "@/lib/engine/set-split"
import type { SplitProposal as Proposal } from "@/lib/playlists/import-readiness"
import {
  CRITERION_COPY,
  SPLIT_COPY,
  durationSource,
  formatMinutes,
} from "@/lib/playlists/split-copy"
import { cn } from "@/lib/utils"

/**
 * The question asked when an uploaded list plays clearly past an hour.
 *
 * Lives inside the import form and only adds two fields to it (`splitCount`,
 * `splitCriterion`); the server recomputes everything from the file and
 * refuses a choice the file does not support. "Keep one set" is selected by
 * default, so a DJ who scrolls past it imports exactly as before.
 *
 * Laid out for a phone first: the count options and the three criteria stack
 * in one column below `sm`, and each criterion keeps its full sentence of what
 * it gives up instead of a smaller font — the trade-off is the point.
 */
export function SplitProposal({
  proposal,
  trackCount,
  locale,
}: {
  proposal: Proposal
  trackCount: number
  locale: SiteLocale
}) {
  const [count, setCount] = useState(0)
  const [criterion, setCriterion] = useState<SplitCriterion>("own_curve")
  const { duration, counts, harmonic } = proposal

  return (
    <fieldset className="space-y-4 rounded-2xl border border-ec-border-strong bg-ec-raised p-4 sm:p-5">
      <legend className="sr-only">{SPLIT_COPY.question[locale]}</legend>
      <input type="hidden" name="splitCount" value={count} />
      <input type="hidden" name="splitCriterion" value={count > 0 ? criterion : ""} />

      <div className="space-y-1.5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ec-cyan">
          {SPLIT_COPY.eyebrow[locale]}
        </p>
        <p className="font-heading text-lg font-semibold text-ec-text">
          {formatTemplate(SPLIT_COPY.plays[locale], {
            time: formatMinutes(duration.minutes),
          })}
        </p>
        {durationSource(duration, trackCount, locale).map((line) => (
          <p
            key={line}
            className={cn(
              "text-sm leading-6",
              duration.method === "rough" ? "text-ec-amber" : "text-ec-text-muted"
            )}
          >
            {line}
          </p>
        ))}
      </div>

      <div role="radiogroup" aria-label={SPLIT_COPY.question[locale]} className="space-y-2">
        <p className="text-sm font-semibold text-ec-text">{SPLIT_COPY.question[locale]}</p>
        <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
          {[0, ...counts].map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={count === option}
              onClick={() => setCount(option)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                count === option
                  ? "border-ec-violet bg-ec-violet/15 text-ec-text"
                  : "border-ec-border bg-ec-surface text-ec-text-muted hover:border-ec-border-strong hover:text-ec-text"
              )}
            >
              {option === 0
                ? SPLIT_COPY.keepOne[locale]
                : formatTemplate(SPLIT_COPY.countOption[locale], {
                    count: option,
                    each: formatMinutes(Math.round(duration.minutes / option)),
                  })}
            </button>
          ))}
        </div>
      </div>

      {count > 0 ? (
        <div role="radiogroup" aria-label={SPLIT_COPY.criterionLegend[locale]} className="space-y-2">
          <p className="text-sm font-semibold text-ec-text">
            {SPLIT_COPY.criterionLegend[locale]}
          </p>
          <div className="grid gap-2 lg:grid-cols-3">
            {SPLIT_CRITERIA.map((option) => {
              const disabled = option === "harmonic" && !harmonic.available
              const copy = CRITERION_COPY[option]

              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={criterion === option}
                  aria-disabled={disabled}
                  disabled={disabled}
                  onClick={() => setCriterion(option)}
                  className={cn(
                    "flex min-w-0 flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
                    disabled
                      ? "cursor-not-allowed border-ec-border bg-ec-surface opacity-70"
                      : criterion === option
                        ? "border-ec-cyan bg-ec-cyan/10"
                        : "border-ec-border bg-ec-surface hover:border-ec-border-strong"
                  )}
                >
                  <span className="font-heading text-base font-semibold text-ec-text">
                    {copy.name[locale]}
                  </span>
                  <span className="text-sm leading-6 text-ec-text-muted">{copy.gives[locale]}</span>
                  <span className="text-sm leading-6 text-ec-text-dim">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                      {SPLIT_COPY.givesUp[locale]}:
                    </span>{" "}
                    {copy.givesUp[locale]}
                  </span>
                  {disabled ? (
                    <span className="text-sm leading-6 text-ec-amber">
                      {formatTemplate(SPLIT_COPY.harmonicDisabled[locale], {
                        missing: harmonic.missingKeys,
                        total: trackCount,
                      })}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <p className="text-sm leading-6 text-ec-text-dim">{SPLIT_COPY.orderNote[locale]}</p>
        </div>
      ) : null}
    </fieldset>
  )
}
