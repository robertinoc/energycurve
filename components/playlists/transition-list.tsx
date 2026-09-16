"use client"

import { useEffect, useState } from "react"

import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { RatedTransition } from "@/lib/engine/transitions"
import { camelotColor } from "@/lib/music/camelot-colors"
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
  // Tempo joins the verdict as a reason to list a row: a mix can be
  // harmonically perfect and still be beyond the ±7% crossfade margin, and
  // that is exactly the row a DJ wants to find before the night, not during.
  const flagged = transitions.filter(
    (transition) =>
      transition.verdict !== "good" || transition.tempo?.beyondMargin === true
  )
  const [colored, setColored] = useState(false)

  // Read after mount: localStorage doesn't exist during SSR, so the server and
  // the first client render must agree on "off" before this syncs in.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColored(window.localStorage.getItem(COLOR_KEYS_STORAGE_KEY) === "1")
    } catch {
      // Private mode and friends: the preference just doesn't persist.
    }
  }, [])

  function toggleColored(next: boolean) {
    setColored(next)
    try {
      window.localStorage.setItem(COLOR_KEYS_STORAGE_KEY, next ? "1" : "0")
    } catch {
      // Ignore storage failures — the toggle still works for this session.
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            {COPY.title[locale]}
          </h2>
          <p className="mt-1 text-xs leading-5 text-white/40">
            {COPY.subtitle[locale]}
          </p>
        </div>
        {flagged.length > 0 ? (
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-white/45 hover:text-white/70">
            <input
              type="checkbox"
              checked={colored}
              onChange={(event) => toggleColored(event.target.checked)}
              className="size-3.5 accent-[#A24DE0]"
            />
            {COPY.colorKeys[locale]}
          </label>
        ) : null}
      </div>

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
              {/* The keys themselves: "keys clash" is more useful when it says
                  which two. */}
              {transition.fromCamelot || transition.toCamelot ? (
                <span className="flex items-baseline gap-1 font-mono text-[11px]">
                  <KeyChip code={transition.fromCamelot} colored={colored} />
                  <span className="text-white/28">→</span>
                  <KeyChip code={transition.toCamelot} colored={colored} />
                </span>
              ) : null}
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  transition.verdict === "rough"
                    ? "text-ec-error/80"
                    : transition.verdict === "workable"
                      ? "text-ec-amber/80"
                      : "text-white/45"
                )}
              >
                {transition.verdict === "rough"
                  ? COPY.rough[locale]
                  : transition.verdict === "workable"
                    ? COPY.workable[locale]
                    : // Listed for its tempo alone: the keys and the energy
                      // step are fine, so calling the row "workable" would
                      // report a problem it doesn't have.
                      COPY.tempo[locale]}
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

const COLOR_KEYS_STORAGE_KEY = "ec:transitions:color-keys"

function KeyChip({
  code,
  colored,
}: {
  code: string | null
  colored: boolean
}) {
  if (!code) {
    return <span className="text-white/28">—</span>
  }

  const color = colored ? camelotColor(code) : null

  return (
    <span
      // Colour goes on the text, not a filled pill: a block of saturated colour
      // next to a verdict would read as the verdict's severity.
      style={color ? { color } : undefined}
      className={color ? "font-semibold" : "text-white/70"}
    >
      {code}
    </span>
  )
}

/**
 * The transition table's name for a move, when it has one.
 *
 * Preferred over the generic "energy-boost jump" because the table
 * distinguishes moves our tiers cannot: `+`, `++` and `+++` are different
 * sizes of lift, and a mood change is not a lift at all.
 */
const LEVEL_LABEL: Record<
  NonNullable<RatedTransition["level"]>,
  keyof typeof COPY | null
> = {
  // A perfect match is never the reason a row is listed, so it has no label.
  perfect: null,
  boost_1: "levelBoost1",
  boost_2: "levelBoost2",
  boost_3: "levelBoost3",
  drop_1: "levelDrop1",
  drop_2: "levelDrop2",
  drop_3: "levelDrop3",
  mood: "levelMood",
}

/** The shortest true sentence about why this mix was flagged. */
function reason(transition: RatedTransition, locale: SiteLocale): string {
  const parts: string[] = []
  const levelKey = transition.level ? LEVEL_LABEL[transition.level] : null

  if (transition.tier === "clash") {
    parts.push(COPY.tierClash[locale])
  } else if (levelKey) {
    const label = (COPY[levelKey] as Record<SiteLocale, string>)[locale]

    parts.push(
      transition.option === "secondary"
        ? `${label} (${COPY.levelSecondary[locale]})`
        : label
    )
  } else if (transition.tier === "boost") {
    parts.push(
      transition.direction === "down"
        ? COPY.tierDrop[locale]
        : COPY.tierBoost[locale]
    )
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

  if (transition.tempo?.beyondMargin) {
    const gap = `${transition.tempo.ratio > 0 ? "+" : "−"}${(
      Math.abs(transition.tempo.ratio) * 100
    ).toFixed(1)}%`

    const relation =
      transition.tempo.relation === "half"
        ? ` ${COPY.tempoHalf[locale]}`
        : transition.tempo.relation === "double"
          ? ` ${COPY.tempoDouble[locale]}`
          : ""

    parts.push(formatTemplate(COPY.tempoGap[locale], { gap }) + relation)
  }

  return parts.join(", ")
}
