import type { EnergyTagField } from "@/lib/playlists/energy-tag"

/**
 * What an import actually managed to read, and — where the answer is "nothing" —
 * whether the file format could ever have carried it.
 *
 * An alpha user imported an M3U8 and reported that it read "not a single tag,
 * not even the duration". He was right, and the honest part of the answer is
 * that Extended M3U carries a path and a duration and nothing else: no BPM, no
 * key, no genre, no energy. The product knew that and said nothing, which left
 * him to conclude the reader was broken. The reader wasn't the problem; the
 * silence was.
 *
 * So: count what came through, and distinguish "your files don't have this"
 * from "this format cannot express this". They call for different actions —
 * fix your tags, or export in a different format.
 */

export type CoverageMetric = "bpm" | "key" | "genre" | "energy" | "duration"

export const COVERAGE_METRICS: CoverageMetric[] = [
  "bpm",
  "key",
  "genre",
  "energy",
  "duration",
]

export interface CoverageTrack {
  bpm: number | null
  musicalKey: string | null
  genre: string | null
  energyScore: number | null
  durationSeconds: number | null
  energySource?: string | null
}

export interface ImportCoverage {
  tracks: number
  counts: Record<CoverageMetric, number>
  /** How many tracks got their energy from each tag, most common first. */
  energyFields: Array<{ field: EnergyTagField; count: number }>
}

/**
 * Metrics a format is capable of carrying at all.
 *
 * Only M3U8 is constrained here, and only because the constraint is a property
 * of the format itself rather than of anyone's library. Every other source is
 * left unconstrained: a Rekordbox XML with no keys means the keys aren't in the
 * library, and telling someone their format can't do keys when it can would be
 * a different kind of wrong.
 */
const FORMAT_CANNOT_CARRY: Record<string, CoverageMetric[]> = {
  m3u8: ["bpm", "key", "genre", "energy"],
}

export function formatCannotCarry(
  importSource: string | null,
  metric: CoverageMetric
): boolean {
  return (FORMAT_CANNOT_CARRY[importSource ?? ""] ?? []).includes(metric)
}

/** True when this format is missing enough that it's worth naming the format. */
export function formatIsLimited(importSource: string | null): boolean {
  return (FORMAT_CANNOT_CARRY[importSource ?? ""] ?? []).length > 0
}

export function importCoverage(tracks: CoverageTrack[]): ImportCoverage {
  const counts: Record<CoverageMetric, number> = {
    bpm: 0,
    key: 0,
    genre: 0,
    energy: 0,
    duration: 0,
  }
  const byField = new Map<EnergyTagField, number>()

  for (const track of tracks) {
    if (track.bpm !== null) counts.bpm++
    if (track.musicalKey) counts.key++
    if (track.genre) counts.genre++
    if (track.energyScore !== null) counts.energy++
    if (track.durationSeconds !== null) counts.duration++

    const field = track.energySource as EnergyTagField | null | undefined

    if (track.energyScore !== null && field) {
      byField.set(field, (byField.get(field) ?? 0) + 1)
    }
  }

  return {
    tracks: tracks.length,
    counts,
    energyFields: [...byField.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field)),
  }
}

export type CoverageStatus = "full" | "partial" | "none" | "unsupported"

export function coverageStatus(
  coverage: ImportCoverage,
  metric: CoverageMetric,
  importSource: string | null
): CoverageStatus {
  const count = coverage.counts[metric]

  if (count === 0 && formatCannotCarry(importSource, metric)) {
    return "unsupported"
  }

  if (coverage.tracks === 0 || count === 0) {
    return "none"
  }

  return count === coverage.tracks ? "full" : "partial"
}

/**
 * True when the import is thin enough to be worth explaining unprompted.
 *
 * The bar is deliberately low on the two metrics that drive the whole product:
 * a set with no BPM and no energy can still be analysed, but only from
 * position, and someone should be told that before they read the curve as a
 * measurement.
 */
export function coverageWorthExplaining(coverage: ImportCoverage): boolean {
  if (coverage.tracks === 0) {
    return false
  }

  return (
    coverage.counts.bpm < coverage.tracks ||
    coverage.counts.energy < coverage.tracks
  )
}
