"use client"

/**
 * The booth view.
 *
 * Every other screen in this product is for planning a set at a desk. This one is
 * used *during* the set, which changes every constraint: it is read at arm's
 * length in the dark, touched with one thumb while the other hand is on a mixer,
 * and it must not need the venue's wifi. So the current track is the largest thing
 * on screen, the only frequently-used control is a target big enough to hit
 * without looking, and everything it needs is already in memory.
 */

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, ChevronLeft, Lock, RotateCcw, WifiOff } from "lucide-react"
import Link from "next/link"

import { GigOfflineRegistrar } from "@/components/pwa/gig-offline-registrar"
import { SetCurve } from "@/components/playlists/set-curve"
import { Button } from "@/components/ui/button"
import type { SiteLocale } from "@/lib/content/site-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { formatClock } from "@/lib/engine/slot"
import {
  bpmDelta,
  clampGigPosition,
  readGigPosition,
  writeGigPosition,
  type GigTrack,
} from "@/lib/playlists/gig-mode"
import { useIsClient } from "@/lib/use-is-client"
import { useWakeLock } from "@/lib/use-wake-lock"
import { cn } from "@/lib/utils"

interface GigModeProps {
  playlistId: string
  playlistName: string
  tracks: GigTrack[]
  /** Ideal arc for this genre + context, same length as tracks, or null. */
  target: number[] | null
  peakPosition: number | null
  backHref: string
  locale: SiteLocale
}

export function GigMode({
  playlistId,
  playlistName,
  tracks,
  target,
  peakPosition,
  backHref,
  locale,
}: GigModeProps) {
  const copy = DASHBOARD_COPY.gigMode
  const [offline, setOffline] = useState(false)
  const wakeLock = useWakeLock()

  /**
   * The position is derived, not copied out of storage by an effect.
   *
   * `useIsClient` is false through the hydration render and true after, so the
   * stored bookmark can be read without a mismatch — and `moved` stays null until
   * the DJ actually touches a control. That makes "did we resume?" a fact about
   * the two values rather than a third piece of state that has to be kept in sync
   * with them.
   */
  const isClient = useIsClient()
  const [moved, setMoved] = useState<number | null>(null)
  const stored = isClient ? readGigPosition(playlistId, tracks.length) : 0
  const position = moved ?? stored
  const resumed = moved === null && stored > 0

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine)
    sync()
    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    return () => {
      window.removeEventListener("online", sync)
      window.removeEventListener("offline", sync)
    }
  }, [])

  const move = useCallback(
    (next: number) => {
      const clamped = clampGigPosition(next, tracks.length)
      setMoved(clamped)
      writeGigPosition(playlistId, clamped)
    },
    [playlistId, tracks.length]
  )

  // Hardware keyboards exist in booths (laptop DJs), and space/arrows are what a
  // hand reaches for without looking.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault()
        move(position + 1)
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        move(position - 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [move, position])

  const current = tracks[position]
  const next = tracks[position + 1]
  const delta = bpmDelta(current, next)
  const isLast = position >= tracks.length - 1
  const scores = tracks.map((track) => track.energy)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-4 py-5">
        <header className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-white/45 transition hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            {copy.back[locale]}
          </Link>
          <div className="flex items-center gap-2">
            {offline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-[0.7rem] font-medium text-amber-300">
                <WifiOff className="size-3" />
                {copy.offlineNow[locale]}
              </span>
            ) : null}
            {wakeLock.supported ? (
              <button
                type="button"
                onClick={wakeLock.toggle}
                aria-pressed={wakeLock.active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium transition",
                  wakeLock.active
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-white/[0.06] text-white/50 hover:text-white"
                )}
              >
                <Lock className="size-3" />
                {wakeLock.active
                  ? copy.keepAwakeOn[locale]
                  : copy.keepAwake[locale]}
              </button>
            ) : null}
          </div>
        </header>

        <p className="truncate text-xs uppercase tracking-[0.2em] text-white/35">
          {playlistName}
        </p>

        {/* Now playing — deliberately the largest thing on the screen. */}
        <section className="flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[0.7rem] uppercase tracking-[0.2em] text-white/40">
              {copy.nowPlaying[locale]}
            </span>
            <span className="text-[0.7rem] tabular-nums text-white/40">
              {copy.position[locale]} {position + 1} {copy.of[locale]}{" "}
              {tracks.length}
            </span>
          </div>

          <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-5xl">
            {current.name}
          </h1>
          <p className="mt-1 text-lg text-white/55 sm:text-2xl">{current.artist}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Stat label="BPM" value={current.bpm ? String(current.bpm) : "—"} />
            <Stat label="Key" value={current.camelot ?? "—"} />
            <Stat label="Energy" value={`${current.energy}`} />
            {current.clockMinutes !== null ? (
              <Stat
                label={copy.due[locale]}
                value={formatClock(current.clockMinutes)}
              />
            ) : null}
            {peakPosition === current.position ? (
              <span className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                {copy.peak[locale]}
              </span>
            ) : null}
          </div>

          {/* Up next, with the tempo move already worked out — the arithmetic a DJ
              would otherwise be doing in their head under a monitor. */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="text-[0.7rem] uppercase tracking-[0.2em] text-white/40">
              {copy.upNext[locale]}
            </span>
            {next ? (
              <>
                <p className="mt-1.5 text-lg font-medium leading-snug sm:text-xl">
                  {next.name}
                </p>
                <p className="text-sm text-white/50">{next.artist}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="tabular-nums text-white/60">
                    {next.bpm ? `${next.bpm} BPM` : "— BPM"}
                    {delta !== null ? (
                      <span
                        className={cn(
                          "ml-1.5 font-semibold",
                          Math.abs(delta) <= 3 ? "text-emerald-300" : "text-amber-300"
                        )}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/60">{next.camelot ?? "—"}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/60">E {next.energy}</span>
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-lg font-medium text-white/45">
                {copy.setEnd[locale]}
              </p>
            )}
          </div>
        </section>

        {/* The arc, with a marker where the DJ actually is in it. */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-2">
          <SetCurve scores={scores} target={target} hoveredIndex={position} />
        </div>

        {resumed ? (
          <p className="text-center text-xs text-white/40">{copy.resumed[locale]}</p>
        ) : null}

        <GigOfflineRegistrar locale={locale} />

        {/* Controls last in the DOM and pinned low on screen: this is where a
            thumb rests, and the big target is the one used every few minutes. */}
        <div className="flex items-stretch gap-2 pb-1">
          <Button
            variant="outline"
            onClick={() => move(position - 1)}
            disabled={position === 0}
            className="h-16 w-16 shrink-0 border-white/15 text-white/70"
            aria-label={copy.prev[locale]}
          >
            <ChevronLeft className="size-6" />
          </Button>
          {isLast ? (
            <Button
              variant="outline"
              onClick={() => move(0)}
              className="h-16 flex-1 border-white/15 text-base font-semibold text-white/70"
            >
              <RotateCcw className="size-5" />
              {copy.restart[locale]}
            </Button>
          ) : (
            <Button
              onClick={() => move(position + 1)}
              className="h-16 flex-1 text-lg font-semibold"
            >
              {copy.next[locale]}
            </Button>
          )}
        </div>

        <p className="text-center text-[0.7rem] leading-5 text-white/30">
          {copy.hint[locale]}
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs">
      <span className="text-white/40">{label} </span>
      <span className="font-semibold tabular-nums text-white/85">{value}</span>
    </span>
  )
}
