import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { RatedTransition } from "@/lib/engine/transitions"
import { cn } from "@/lib/utils"

const COPY = DASHBOARD_COPY.transitions

/**
 * The mixes that need a second look, and what to do about them.
 *
 * Only the flagged ones are listed. A set of thirty tracks has twenty-nine
 * transitions and most of them are fine; printing all of them would bury the
 * three that matter, which is the same mistake as flagging none.
 */
export function TransitionList({
  transitions,
  locale,
}: {
  transitions: RatedTransition[]
  locale: SiteLocale
}) {
  const flagged = transitions.filter(
    (transition) => transition.verdict !== "good"
  )

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <h2 className="text-sm font-semibold text-white">{COPY.title[locale]}</h2>
      <p className="mt-1 text-xs leading-5 text-white/40">
        {COPY.subtitle[locale]}
      </p>

      {flagged.length === 0 ? (
        <p className="mt-3 text-sm text-white/56">{COPY.allGood[locale]}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {flagged.map((transition) => (
            <li
              key={`${transition.fromPosition}-${transition.toPosition}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
            >
              <span className="tabular-nums text-white/40">
                {transition.fromPosition} → {transition.toPosition}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  transition.verdict === "rough"
                    ? "text-ec-error/80"
                    : "text-ec-amber/80"
                )}
              >
                {transition.verdict === "rough"
                  ? COPY.rough[locale]
                  : COPY.workable[locale]}
              </span>
              <span className="text-white/56">{reason(transition, locale)}</span>
              {transition.betterFit ? (
                <span className="text-white/40">
                  ·{" "}
                  {formatTemplate(COPY.suggestion[locale], {
                    position: transition.betterFit.position,
                  })}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** The shortest true sentence about why this mix was flagged. */
function reason(transition: RatedTransition, locale: SiteLocale): string {
  const parts: string[] = []

  if (transition.tier === "clash") {
    parts.push(COPY.tierClash[locale])
  } else if (transition.tier === "boost") {
    parts.push(COPY.tierBoost[locale])
  } else if (transition.tier === "unknown") {
    parts.push(COPY.tierUnknown[locale])
  }

  if (transition.excess > 0) {
    parts.push(
      formatTemplate(COPY.bigStep[locale], {
        delta: `${transition.delta > 0 ? "+" : ""}${transition.delta.toFixed(1)}`,
      })
    )
  }

  return parts.join(", ")
}
