import { Check } from "lucide-react"

import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { FirstRunState, FirstRunStepId } from "@/lib/product/first-run"
import { cn } from "@/lib/utils"

const COPY = DASHBOARD_COPY.firstRun

const STEP_COPY: Record<
  FirstRunStepId,
  { title: keyof typeof COPY; body: keyof typeof COPY }
> = {
  import: { title: "importTitle", body: "importBody" },
  analyze: { title: "analyzeTitle", body: "analyzeBody" },
  improve: { title: "improveTitle", body: "improveBody" },
}

/**
 * What a new account sees instead of an empty dashboard.
 *
 * Server-rendered and stateless: every step's completion is derived from data
 * the page already loaded, so there is nothing to click, nothing to dismiss, and
 * nothing that can disagree with reality.
 *
 * Deliberately not a modal or a tour. Someone who just signed up came to do a
 * thing, and the fastest way to be useful is to name the three steps and get out
 * of the way — not to trap them behind an overlay they'll dismiss unread.
 */
export function FirstRunGuide({
  state,
  locale,
}: {
  state: FirstRunState
  locale: SiteLocale
}) {
  if (!state.visible) {
    return null
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#0C0917] p-5">
      <h2 className="text-sm font-semibold text-white">{COPY.title[locale]}</h2>
      <p className="mt-1 text-xs leading-5 text-white/40">
        {COPY.subtitle[locale]}
      </p>

      <ol className="mt-4 space-y-3">
        {state.steps.map((step, index) => {
          const isCurrent = index === state.currentIndex
          const copy = STEP_COPY[step.id]

          return (
            <li key={step.id} className="flex gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold tabular-nums",
                  step.done
                    ? "border-ec-cyan/40 bg-ec-cyan/15 text-ec-cyan"
                    : isCurrent
                      ? "border-white/40 text-white"
                      : "border-white/15 text-white/35"
                )}
              >
                {step.done ? <Check className="size-3" /> : index + 1}
              </span>

              <div className="min-w-0">
                <p
                  className={cn(
                    "flex flex-wrap items-center gap-2 text-sm font-medium",
                    // A finished step stays visible but stops competing for
                    // attention: the point of the list is what's next.
                    step.done
                      ? "text-white/40 line-through decoration-white/20"
                      : "text-white"
                  )}
                >
                  {COPY[copy.title][locale]}
                  {isCurrent ? (
                    <span className="rounded border border-white/20 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/50 no-underline">
                      {COPY.currentBadge[locale]}
                    </span>
                  ) : null}
                </p>
                {step.done ? null : (
                  <p className="mt-0.5 text-xs leading-5 text-white/48">
                    {COPY[copy.body][locale]}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
