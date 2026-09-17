"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { CHECKER_COPY, LEVEL_COPY } from "@/lib/content/harmonic-tools-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  checkCompatibility,
  PITCH_RANGES,
  type PitchRange,
} from "@/lib/tools/harmonic-tools"
import { captureToolEvent } from "@/lib/tools/tool-events"

/**
 * Two tracks in, three readings out.
 *
 * The harmonic verdict is `harmonicMove`'s, unmodified — the same call the set
 * analyser makes. What this component adds is the tempo presentation and the
 * pitch consequence, and it keeps the three readings visually separate because
 * they disagree often: a pair can be in perfect keys and nine percent apart, and
 * one verdict for both would have to pick which fact to bury.
 */

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
        {label}
      </p>
      <div className="mt-1.5 text-sm leading-6 text-white/80">{children}</div>
    </div>
  )
}

export function KeyBpmChecker({ locale }: { locale: SiteLocale }) {
  const copy = CHECKER_COPY.ui
  const [a, setA] = useState({ key: "8A", bpm: "128" })
  const [b, setB] = useState({ key: "", bpm: "" })
  const [range, setRange] = useState<PitchRange>(8)
  const [keyLock, setKeyLock] = useState(false)

  const result = useMemo(
    () => checkCompatibility(a, b, { pitchLock: keyLock }),
    [a, b, keyLock]
  )

  const hasInput = Boolean(b.key.trim() || b.bpm.trim())

  /**
   * One track's two inputs.
   *
   * `set` takes an updater, not a value, and that is load-bearing rather than
   * style. Both inputs write to the same state object, so `set({ ...track, bpm })`
   * closes over whatever `track` was at render — and two changes landing before a
   * re-render make the second one overwrite the first with a stale field. CI
   * caught exactly that: a filled key vanishing the moment the BPM beside it was
   * typed.
   */
  function field(
    track: typeof a,
    set: (update: (prev: typeof a) => typeof a) => void,
    id: string,
    label: string
  ) {
    return (
      <fieldset className="flex-1 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-ec-cyan">
          {label}
        </legend>
        <div className="mt-1 flex gap-3">
          <div className="min-w-0 flex-1">
            <label
              htmlFor={`${id}-key`}
              className="text-xs font-semibold text-white/60"
            >
              {copy.keyLabel[locale]}
            </label>
            <input
              id={`${id}-key`}
              value={track.key}
              onChange={(event) =>
                set((prev) => ({ ...prev, key: event.target.value }))
              }
              placeholder={copy.keyPlaceholder[locale]}
              className="mt-1 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-ec-cyan focus:outline-none"
              data-testid={`${id}-key`}
            />
          </div>
          <div className="w-24">
            <label
              htmlFor={`${id}-bpm`}
              className="text-xs font-semibold text-white/60"
            >
              {copy.bpmLabel[locale]}
            </label>
            <input
              id={`${id}-bpm`}
              inputMode="decimal"
              value={track.bpm}
              onChange={(event) =>
                set((prev) => ({ ...prev, bpm: event.target.value }))
              }
              placeholder={copy.bpmPlaceholder[locale]}
              className="mt-1 w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-ec-cyan focus:outline-none"
              data-testid={`${id}-bpm`}
            />
          </div>
        </div>
      </fieldset>
    )
  }

  const tempo = result.tempo
  const pct = tempo ? Math.abs(tempo.ratio) * 100 : 0

  return (
    <div className="rounded-[26px] bg-[linear-gradient(140deg,rgba(162,77,224,0.85),rgba(106,92,240,0.35)_40%,rgba(34,211,238,0.75))] p-px shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div className="rounded-[25px] bg-ec-surface p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row">
          {field(a, setA, "track-a", copy.trackA[locale])}
          {field(b, setB, "track-b", copy.trackB[locale])}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/60">
              {copy.pitchRange[locale]}
            </span>
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {PITCH_RANGES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRange(value)}
                  aria-pressed={range === value}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    range === value
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  ±{value}%
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-white/60">
            <input
              type="checkbox"
              checked={keyLock}
              onChange={(event) => setKeyLock(event.target.checked)}
              className="size-4 accent-ec-cyan"
              data-testid="key-lock"
            />
            {copy.keyLock[locale]}
          </label>

          <button
            type="button"
            onClick={() => {
              captureToolEvent("compatibility_checked", {
                locale,
                tool: "key_bpm",
              })
            }}
            className="ml-auto rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
            data-testid="check"
          >
            {copy.check[locale]}
          </button>
        </div>

        {hasInput && (
          <div className="mt-5 flex flex-col gap-3" data-testid="checker-result">
            <Row label={copy.harmonyTitle[locale]}>
              {result.move ? (
                result.move.level ? (
                  <>
                    <span className="font-semibold text-white">
                      {LEVEL_COPY[result.move.level].name[locale]}
                    </span>{" "}
                    — {LEVEL_COPY[result.move.level].line[locale]}
                  </>
                ) : (
                  copy.notInTable[locale]
                )
              ) : (
                <span className="text-white/50">{copy.noKeys[locale]}</span>
              )}
            </Row>

            <Row label={copy.tempoTitle[locale]}>
              {tempo ? (
                <>
                  <span className="font-semibold text-white">
                    {pct.toFixed(1)}%{" "}
                    {tempo.ratio >= 0 ? copy.faster[locale] : copy.slower[locale]}
                  </span>
                  {tempo.relation !== "same" && (
                    <span className="block text-white/60">
                      {tempo.relation === "half"
                        ? copy.halfTime[locale]
                        : copy.doubleTime[locale]}
                    </span>
                  )}
                  <span className="block text-white/60">
                    {tempo.beyondMargin
                      ? copy.beyondMargin[locale]
                      : copy.withinMargin[locale]}
                  </span>
                  <span className="block text-white/60">
                    {(result.withinPitchRange?.[range]
                      ? copy.fitsRange[locale]
                      : copy.missesRange[locale]
                    ).replace("{range}", String(range))}
                  </span>
                </>
              ) : (
                <span className="text-white/50">{copy.noBpm[locale]}</span>
              )}
            </Row>

            <Row label={copy.pitchTitle[locale]}>
              {keyLock ? (
                <span className="text-white/60">{copy.keyLockHeld[locale]}</span>
              ) : result.pitchedKey && result.to.camelot ? (
                <>
                  <span className="font-mono font-semibold text-white">
                    {result.to.camelot}
                  </span>{" "}
                  {copy.keyBecomes[locale]}{" "}
                  <span className="font-mono font-semibold text-white">
                    {result.pitchedKey.camelot}
                  </span>{" "}
                  <span className="text-white/50">
                    ({result.pitchedKey.semitones >= 0 ? "+" : ""}
                    {result.pitchedKey.semitones.toFixed(2)} st)
                  </span>
                  {result.pitchedKey.approximate && (
                    <span className="block text-amber-200/70">
                      {copy.approximate[locale]}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-white/50">{copy.noBpm[locale]}</span>
              )}
            </Row>

            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm">
              <Link
                href={localizedPath("/tools/camelot-wheel", locale)}
                className="text-ec-cyan underline-offset-4 hover:underline"
              >
                {copy.seeOnWheel[locale]}
              </Link>
              <Link
                href={localizedPath("/tools/energy-curve", locale)}
                className="text-ec-cyan underline-offset-4 hover:underline"
              >
                {copy.analyzeSet[locale]}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
