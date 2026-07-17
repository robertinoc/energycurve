import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import {
  STANDARD_TRACK_DURATION_MINUTES,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import type { Track } from "@/types/domain"

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
}

/**
 * Set stats rendered as muted pills on the detail-page header, in the same
 * row as the genre/context badges (V3 feedback — they used to live as a
 * footer line under the tracklist). Server-computed snapshot of the SAVED
 * order; resolveTrackEnergies is pure, so this runs fine server-side.
 */
export function PlaylistStatsPills({
  tracks,
  genre,
  context,
  locale,
}: {
  tracks: Track[]
  genre: SupportedGenre | null
  context: PlaylistContext | null
  locale: SiteLocale
}) {
  if (tracks.length === 0) {
    return null
  }

  const copy = DASHBOARD_COPY.workspace

  const scores = resolveTrackEnergies(tracks, context, genre).map(
    (entry) => entry.score
  )
  const bpms = tracks
    .map((track) => track.bpm)
    .filter((bpm): bpm is number => bpm !== null)
  const avgBpm =
    bpms.length > 0
      ? Math.round(bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length)
      : null
  const everyHasDuration = tracks.every(
    (track) => track.duration_seconds !== null
  )
  const totalMinutes = everyHasDuration
    ? Math.round(
        tracks.reduce((sum, track) => sum + (track.duration_seconds ?? 0), 0) /
          60
      )
    : tracks.length * STANDARD_TRACK_DURATION_MINUTES
  const eMin = scores.length ? Math.min(...scores) : null
  const eMax = scores.length ? Math.max(...scores) : null

  const pills: string[] = [
    `${tracks.length} ${copy.statsTracks[locale]}`,
    `${everyHasDuration ? "" : "~"}${formatMinutes(totalMinutes)}`,
  ]

  if (avgBpm !== null) {
    pills.push(`${copy.statsAvg[locale]} ${avgBpm} BPM`)
  }

  if (eMin !== null) {
    pills.push(`${copy.statsEnergy[locale]} ${eMin}–${eMax}`)
  }

  return (
    <>
      {pills.map((pill) => (
        <span
          key={pill}
          className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] font-medium tracking-[0.02em] text-white/56"
        >
          {pill}
        </span>
      ))}
    </>
  )
}
