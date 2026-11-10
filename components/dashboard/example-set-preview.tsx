"use client"

import { useRef } from "react"
import { ChevronDown } from "lucide-react"

import { SetCurve } from "@/components/playlists/set-curve"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { CONTEXT_LABELS } from "@/lib/content/analysis-copy"
import { EXAMPLE_SET_COPY } from "@/lib/content/example-set-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { captureExampleSetEvent } from "@/lib/analytics/example-set-events"
import type { ExampleSetView } from "@/lib/product/example-set-analysis"
import { GENRE_LABELS } from "@/lib/product/strategy"
import { cn } from "@/lib/utils"

const COPY = EXAMPLE_SET_COPY

/**
 * Step 1.1 of docs/conversion-plan.md: an example set, one click from the first
 * step, for someone who hasn't imported anything.
 *
 * A native <details>: it opens without JavaScript, stays inside the first-run
 * guide instead of a screen of its own, and costs nothing to ignore. The only
 * script is the event on opening, gated on consent like every browser event.
 *
 * Read-only by construction — it receives an analysis computed on the server
 * from lib/product/example-set.ts and has nothing to save — and labelled an
 * example at every level: the summary, a badge, the title and a sentence that
 * says it isn't in the account. It ends on the import form, not on itself.
 *
 * Phone first: one column, the curve inside a `min-w-0` box so its width
 * follows the guide's instead of pushing the page sideways.
 */
export function ExampleSetPreview({
  example,
  locale,
  importHref,
}: {
  example: ExampleSetView
  locale: SiteLocale
  /** Where "try it with yours" goes: the import form on this page. */
  importHref: string
}) {
  // One event per page view: closing and reopening is the same person
  // reading the same example.
  const opened = useRef(false)

  return (
    <details
      className="group mt-3"
      data-example-set
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open && !opened.current) {
          opened.current = true
          captureExampleSetEvent("example_set_opened", locale)
        }
      }}
    >
      <summary
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          // The design-system buttons never wrap; this one's sentence is longer
          // than a phone is wide, and a cut-off invitation reads as broken.
          "h-auto min-h-8 max-w-full cursor-pointer list-none whitespace-normal py-1.5 text-left [&::-webkit-details-marker]:hidden"
        )}
      >
        {COPY.open[locale]}
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="mt-3 min-w-0 space-y-4 rounded-2xl border border-ec-border-strong bg-ec-raised p-4">
        <div className="space-y-1.5">
          <p className="flex flex-wrap items-center gap-2 font-heading text-base font-semibold text-ec-text">
            <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
              {COPY.badge[locale]}
            </Badge>
            {COPY.title[locale]}
          </p>
          <p className="text-sm leading-6 text-ec-text-muted">{COPY.note[locale]}</p>
          <p className="font-mono text-[12px] text-ec-text-muted">
            {formatTemplate(COPY.meta[locale], {
              count: example.trackCount,
              genre: GENRE_LABELS[example.genre],
              context: CONTEXT_LABELS[example.context]?.[locale] ?? example.context,
              minutes: example.minutes,
            })}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ec-text-muted">
            {COPY.scoreLabel[locale]}
          </span>
          <span className="font-heading text-3xl font-bold text-ec-text" data-example-score>
            {example.score.toFixed(1)}
          </span>
          <span className="text-sm text-ec-text-muted">/10</span>
        </div>

        <div className="min-w-0 rounded-xl bg-ec-sunken p-2">
          <SetCurve
            scores={example.curve}
            target={example.targetCurve}
            hoveredIndex={null}
            ariaLabel={COPY.curveLabel[locale]}
          />
        </div>
        <p className="text-xs leading-5 text-ec-text-muted">{COPY.curveLegend[locale]}</p>

        {example.problems.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ec-text">{COPY.problemsTitle[locale]}</p>
            <ul className="space-y-2">
              {example.problems.map((problem) => (
                <li
                  key={problem.title + problem.action}
                  className="rounded-xl border border-ec-border bg-ec-surface px-3.5 py-3"
                >
                  <p className="text-sm font-medium text-ec-text">{problem.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-ec-text-muted">{problem.action}</p>
                </li>
              ))}
            </ul>
            {example.moreProblems > 0 ? (
              <p className="text-xs text-ec-text-muted">
                {formatTemplate(COPY.moreProblems[locale], { count: example.moreProblems })}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1.5 border-t border-ec-border pt-4">
          <a
            href={importHref}
            onClick={() => captureExampleSetEvent("example_set_import_click", locale)}
            className={cn(buttonVariants({ size: "sm" }), "w-fit")}
          >
            {COPY.cta[locale]}
          </a>
          <p className="text-xs text-ec-text-muted">{COPY.ctaHint[locale]}</p>
        </div>
      </div>
    </details>
  )
}
