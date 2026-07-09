"use client"

import { useMemo, useState } from "react"

import { GenreNote } from "@/components/playlists/genre-note"
import { SetCurve } from "@/components/playlists/set-curve"
import { TrackTable, type TrackEnergyView } from "@/components/playlists/track-table"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import {
  STANDARD_TRACK_DURATION_MINUTES,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import type { Track } from "@/types/domain"

interface PlaylistWorkspaceProps {
  playlistId: string
  genre: SupportedGenre | null
  context: PlaylistContext | null
  tracks: Track[]
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
}

export function PlaylistWorkspace({
  playlistId,
  genre,
  context,
  tracks,
}: PlaylistWorkspaceProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const energies: TrackEnergyView[] = useMemo(
    () =>
      resolveTrackEnergies(tracks, context, genre).map((e) => ({
        score: e.score,
        source: e.source,
      })),
    [tracks, context, genre]
  )

  const scores = useMemo(() => energies.map((e) => e.score), [energies])

  const target = useMemo(
    () =>
      genre && context ? buildTargetCurve(tracks.length, context, genre) : null,
    [genre, context, tracks.length]
  )

  const stats = useMemo(() => {
    const n = tracks.length
    const bpms = tracks.map((t) => t.bpm).filter((b): b is number => b !== null)
    const avgBpm =
      bpms.length > 0 ? Math.round(bpms.reduce((s, b) => s + b, 0) / bpms.length) : null

    const everyHasDuration =
      n > 0 && tracks.every((t) => t.duration_seconds !== null)
    const totalMinutes = everyHasDuration
      ? Math.round(tracks.reduce((s, t) => s + (t.duration_seconds ?? 0), 0) / 60)
      : n * STANDARD_TRACK_DURATION_MINUTES

    const eMin = scores.length ? Math.min(...scores) : null
    const eMax = scores.length ? Math.max(...scores) : null

    return { n, avgBpm, totalMinutes, everyHasDuration, eMin, eMax }
  }, [tracks, scores])

  return (
    <div className="flex flex-col gap-4">
      {tracks.length > 0 ? (
        <div className="rounded-[16px] border border-ec-border bg-[#14101F] p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/42">
                Set energy curve
              </p>
              <h2 className="mt-0.5 font-heading text-[15px] font-semibold text-white">
                The shape of the night
              </h2>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-white/42">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-4 rounded-full"
                  style={{ background: "linear-gradient(90deg,#4C6EF5,#A24DE0,#F0348A)" }}
                />
                your set
              </span>
              {target ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-t-2 border-dashed border-white/55" />
                  target
                </span>
              ) : null}
            </div>
          </div>
          <SetCurve scores={scores} target={target} hoveredIndex={hoveredIndex} />
        </div>
      ) : null}

      <GenreNote genre={genre} context={context} tracks={tracks} />

      <TrackTable
        playlistId={playlistId}
        tracks={tracks}
        energies={energies}
        onHover={setHoveredIndex}
      />

      {tracks.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-[12.5px] text-white/45">
          <span>
            <b className="font-mono font-bold text-white">{stats.n}</b> tracks
          </span>
          <span className="text-white/20">·</span>
          <span>
            {stats.everyHasDuration ? "" : "~"}
            <b className="font-mono font-bold text-white">
              {formatMinutes(stats.totalMinutes)}
            </b>
          </span>
          {stats.avgBpm !== null ? (
            <>
              <span className="text-white/20">·</span>
              <span>
                avg <b className="font-mono font-bold text-white">{stats.avgBpm}</b> BPM
              </span>
            </>
          ) : null}
          {stats.eMin !== null ? (
            <>
              <span className="text-white/20">·</span>
              <span>
                energy{" "}
                <b className="font-mono font-bold text-white">
                  {stats.eMin}–{stats.eMax}
                </b>
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
