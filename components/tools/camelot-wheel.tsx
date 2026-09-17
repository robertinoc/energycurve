"use client"

import { useMemo, useRef, useState } from "react"

import { LEVEL_COPY, WHEEL_COPY } from "@/lib/content/harmonic-tools-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { camelotColor } from "@/lib/music/camelot-colors"
import { compatibleKeys } from "@/lib/tools/harmonic-tools"
import { captureToolEvent } from "@/lib/tools/tool-events"

/**
 * The Camelot wheel, as 24 selectable keys.
 *
 * Which keys light up comes from `compatibleKeys`, which reads the engine's
 * transition table — the same one the set analyser scores against. This
 * component decides where things are drawn and nothing about what mixes.
 *
 * **Keyboard and screen readers are not an afterthought here.** A wheel is a
 * shape, and a shape is exactly the kind of control that ends up mouse-only. It
 * is a `radiogroup` with roving tabindex: one Tab stop for the whole wheel,
 * arrows to move between keys, Enter or Space to select. Each key's accessible
 * name is its Camelot code and its spoken name, so "8A, A minor" is what gets
 * announced rather than "button".
 */

const SIZE = 340
const CENTRE = SIZE / 2
/** Outer ring = major (B), inner = minor (A). */
const RADIUS = { B: 132, A: 88 }
const KEY_RADIUS = { B: 27, A: 25 }

function position(num: number, ring: "A" | "B") {
  // 1 at the top, clockwise, which is how every printed wheel is drawn.
  const angle = ((num - 1) * 30 - 90) * (Math.PI / 180)

  return {
    x: CENTRE + RADIUS[ring] * Math.cos(angle),
    y: CENTRE + RADIUS[ring] * Math.sin(angle),
  }
}

export function CamelotWheel({
  locale,
  spokenNames,
}: {
  locale: SiteLocale
  /** Camelot code → "A minor", resolved on the server so this holds no copy. */
  spokenNames: Record<string, string>
}) {
  const copy = WHEEL_COPY.ui
  const [selected, setSelected] = useState("8A")
  const groupRef = useRef<SVGGElement>(null)

  const neighbours = useMemo(() => compatibleKeys(selected), [selected])
  const byKey = useMemo(
    () => new Map(neighbours.map((entry) => [entry.camelot, entry])),
    [neighbours]
  )

  function select(camelot: string) {
    setSelected(camelot)
    captureToolEvent("camelot_key_selected", { locale, tool: "camelot_wheel" })
  }

  /** Arrows move around the wheel; up/down cross the rings. */
  function onKeyDown(event: React.KeyboardEvent) {
    const num = Number.parseInt(selected, 10)
    const ring = selected.endsWith("A") ? "A" : "B"
    let next: string | null = null

    if (event.key === "ArrowRight") {
      next = `${(num % 12) + 1}${ring}`
    } else if (event.key === "ArrowLeft") {
      next = `${((num + 10) % 12) + 1}${ring}`
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      next = `${num}${ring === "A" ? "B" : "A"}`
    }

    if (next) {
      event.preventDefault()
      select(next)
      // Roving tabindex: focus has to follow the selection or the next arrow
      // press goes to whatever the browser still thinks is focused.
      groupRef.current
        ?.querySelector<SVGGElement>(`[data-key="${next}"]`)
        ?.focus()
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="mx-auto w-full max-w-[340px] shrink-0">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-full"
          role="group"
          aria-label={copy.wheelLabel[locale]}
        >
          <g ref={groupRef} role="radiogroup" onKeyDown={onKeyDown}>
            {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].flatMap((num) =>
              (["B", "A"] as const).map((ring) => {
                const camelot = `${num}${ring}`
                const { x, y } = position(num, ring)
                const isSelected = camelot === selected
                const match = byKey.get(camelot)
                const colour = camelotColor(camelot) ?? "#6A5CF0"

                return (
                  <g
                    key={camelot}
                    data-key={camelot}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${camelot}, ${spokenNames[camelot] ?? camelot}${
                      match && !isSelected
                        ? ` — ${LEVEL_COPY[match.level].name[locale]}`
                        : ""
                    }`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => select(camelot)}
                    className="cursor-pointer outline-none focus-visible:[&>circle]:stroke-white"
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={KEY_RADIUS[ring]}
                      fill={colour}
                      // Unrelated keys stay visible but recede: hiding them
                      // would make the wheel unreadable as a wheel.
                      fillOpacity={isSelected ? 1 : match ? 0.62 : 0.12}
                      stroke={isSelected ? "#FFFFFF" : "rgba(255,255,255,0.18)"}
                      strokeWidth={isSelected ? 3 : 1}
                    />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      className="pointer-events-none select-none font-mono text-[11px] font-bold"
                      fill={isSelected || match ? "#FFFFFF" : "rgba(255,255,255,0.45)"}
                    >
                      {camelot}
                    </text>
                  </g>
                )
              })
            )}
          </g>
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
          {copy.selected[locale]}
        </p>
        <p className="font-heading text-2xl font-bold text-white">
          {selected}{" "}
          <span className="text-base font-medium text-white/50">
            {spokenNames[selected]}
          </span>
        </p>

        <h2 className="mt-4 font-heading text-base font-semibold text-white">
          {copy.compatibleWith[locale]}
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5" data-testid="wheel-matches">
          {neighbours.map((entry) => (
            <li
              key={entry.camelot}
              className="flex items-baseline gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2"
            >
              <button
                type="button"
                onClick={() => select(entry.camelot)}
                className="font-mono text-sm font-bold text-white underline-offset-4 hover:underline"
              >
                {entry.camelot}
              </button>
              <span className="min-w-0">
                <span className="text-sm font-semibold text-ec-cyan">
                  {LEVEL_COPY[entry.level].name[locale]}
                </span>
                <span className="block text-xs leading-5 text-white/55">
                  {LEVEL_COPY[entry.level].line[locale]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
