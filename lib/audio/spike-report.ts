/**
 * Turns a batch of raw measurements into a readable verdict.
 *
 * The first version of the spike screen printed numbers and left the reader to
 * work out what they meant — which failed its only real test: if the person who
 * has to make the call can't read it, it isn't a report, it's a data dump. So the
 * thresholds and the conclusions live here, as pure functions, next to the
 * reasoning for each one.
 */

import { toCamelot } from "@/lib/music/camelot"
import type { TrackAnalysis } from "./analysis-types"

/** How a measurement reads against its threshold. */
export type Verdict = "good" | "warn" | "bad" | "unknown"

/** A track longer than this is almost certainly a recorded set, not a track. */
export const LONG_TRACK_SECONDS = 15 * 60

/** Playlist size the time estimate is quoted for — a normal club set. */
export const REFERENCE_PLAYLIST_TRACKS = 40

export interface Measure {
  value: string
  verdict: Verdict
  /** What this number means, in plain language. */
  meaning: string
}

/**
 * Octave-agnostic Camelot comparison. Both sides go through `toCamelot` so a tag
 * in Open Key ("7m", the notation Mixed In Key writes) compares correctly
 * against a detected musical key ("Am").
 */
export function keysAgree(
  detected: string | null,
  tagged: string | null
): boolean | null {
  if (!detected || !tagged) {
    return null
  }

  const a = toCamelot(detected)
  const b = toCamelot(tagged)

  return a && b ? a === b : null
}

/**
 * BPM comparison tolerating half- and double-time tags, which are a real
 * convention rather than an error: a 160 BPM track is often tagged 80.
 */
export function bpmAgrees(
  detected: number | null,
  tagged: number | null
): boolean | null {
  if (!detected || !tagged) {
    return null
  }

  const close = (a: number, b: number) => Math.abs(a - b) <= 1.5
  return close(detected, tagged) || close(detected, tagged * 2) || close(detected, tagged / 2)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.round(0.95 * (sorted.length - 1)))]
}

export function formatDuration(ms: number): string {
  if (ms >= 60_000) {
    const minutes = Math.floor(ms / 60_000)
    const seconds = Math.round((ms % 60_000) / 1000)
    return `${minutes}m ${seconds}s`
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`
}

function ratio(hits: number, total: number): string {
  return total === 0 ? "no tagged files" : `${hits}/${total}`
}

/** Columns the detail table can be ordered by. */
export type SortKey =
  | "fileName"
  | "durationSeconds"
  | "totalMs"
  | "realtimeFactor"
  | "bpm"
  | "detectedKey"
  | "keyConfidence"

/**
 * Orders rows for the detail table.
 *
 * Nulls always sort last, in both directions: a track with no detected key
 * isn't "the smallest key", and burying the unknowns at the bottom is what makes
 * sorting by key or tempo useful for finding the mismatches.
 */
export function sortTracks(
  rows: readonly TrackAnalysis[],
  key: SortKey,
  desc: boolean
): TrackAnalysis[] {
  return [...rows].sort((left, right) => {
    const a = left[key]
    const b = right[key]

    if (a === null && b === null) return 0
    if (a === null) return 1
    if (b === null) return -1

    const comparison =
      typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b))

    return desc ? -comparison : comparison
  })
}

export interface AccuracyBreakdown {
  /** Files that carried a tag to compare against. */
  comparable: number
  agreed: number
  /** Files with no tag — not a failure, just nothing to check. */
  untagged: number
}

export interface SpikeReport {
  tracks: number
  failed: number
  audioSeconds: number
  /** Files that look like full recorded sets rather than single tracks. */
  longFiles: number

  speed: {
    medianPerTrack: Measure
    p95PerTrack: Measure
    realtimeFactor: Measure
    /** The number that actually matters: how long a real playlist would take. */
    playlistEstimate: Measure
  }
  responsiveness: {
    worstFreeze: Measure
  }
  accuracy: {
    bpm: Measure
    key: Measure
    bpmBreakdown: AccuracyBreakdown
    keyBreakdown: AccuracyBreakdown
  }
  /** One-line conclusions, ordered most important first. */
  headlines: { verdict: Verdict; text: string }[]
}

function accuracyOf(
  rows: TrackAnalysis[],
  compare: (row: TrackAnalysis) => boolean | null
): AccuracyBreakdown {
  let comparable = 0
  let agreed = 0
  let untagged = 0

  for (const row of rows) {
    const result = compare(row)
    if (result === null) {
      untagged += 1
      continue
    }
    comparable += 1
    if (result) {
      agreed += 1
    }
  }

  return { comparable, agreed, untagged }
}

function share(breakdown: AccuracyBreakdown): number | null {
  return breakdown.comparable === 0
    ? null
    : breakdown.agreed / breakdown.comparable
}

export function buildSpikeReport(
  rows: TrackAnalysis[],
  worstFreezeMs: number | null
): SpikeReport {
  const ok = rows.filter((row) => !row.error)
  const totals = ok.map((row) => row.totalMs)
  const audioSeconds = ok.reduce((sum, row) => sum + row.durationSeconds, 0)

  const medianMs = median(totals)
  const realtime = median(ok.map((row) => row.realtimeFactor))
  const playlistMs = medianMs * REFERENCE_PLAYLIST_TRACKS

  const bpmBreakdown = accuracyOf(ok, (row) => bpmAgrees(row.bpm, row.taggedBpm))
  const keyBreakdown = accuracyOf(ok, (row) => keysAgree(row.detectedKey, row.taggedKey))
  const bpmShare = share(bpmBreakdown)
  const keyShare = share(keyBreakdown)

  // Thresholds, and why each one sits where it does:
  //
  // playlist estimate — a DJ preparing a 40-track set will wait for this once.
  //   Under a minute is unremarkable; over three and they'll leave the tab.
  // UI freeze — 100ms is the limit of "instant"; past 500ms it reads as broken.
  // BPM — this feeds the whole engine, so it has to be near-perfect to ship.
  // KEY — Mixed In Key is the benchmark users compare against. Below ~85% we'd
  //   be shipping something that contradicts the tags they already trust.
  const speedVerdict: Verdict =
    playlistMs < 60_000 ? "good" : playlistMs < 180_000 ? "warn" : "bad"
  const freezeVerdict: Verdict =
    worstFreezeMs === null
      ? "unknown"
      : worstFreezeMs < 100
        ? "good"
        : worstFreezeMs < 500
          ? "warn"
          : "bad"
  const bpmVerdict: Verdict =
    bpmShare === null ? "unknown" : bpmShare >= 0.9 ? "good" : bpmShare >= 0.7 ? "warn" : "bad"
  const keyVerdict: Verdict =
    keyShare === null ? "unknown" : keyShare >= 0.85 ? "good" : keyShare >= 0.6 ? "warn" : "bad"

  const headlines: { verdict: Verdict; text: string }[] = []

  if (bpmShare !== null) {
    headlines.push({
      verdict: bpmVerdict,
      text:
        bpmVerdict === "good"
          ? `Tempo is production-ready — it matched your tags on ${bpmBreakdown.agreed} of ${bpmBreakdown.comparable} tagged files.`
          : `Tempo matched only ${bpmBreakdown.agreed} of ${bpmBreakdown.comparable} tagged files. Not safe to rely on yet.`,
    })
  }

  if (keyShare !== null) {
    headlines.push({
      verdict: keyVerdict,
      text:
        keyVerdict === "good"
          ? `Key detection agrees with your tags on ${keyBreakdown.agreed} of ${keyBreakdown.comparable}.`
          : `Key detection is not shippable — it agreed on ${keyBreakdown.agreed} of ${keyBreakdown.comparable} (${Math.round((keyShare ?? 0) * 100)}%). Ship tempo first and hold key back.`,
    })
  }

  headlines.push({
    verdict: speedVerdict,
    text:
      speedVerdict === "good"
        ? `Fast enough: a ${REFERENCE_PLAYLIST_TRACKS}-track playlist would take about ${formatDuration(playlistMs)}.`
        : `Too slow to ship as-is: a ${REFERENCE_PLAYLIST_TRACKS}-track playlist would take about ${formatDuration(playlistMs)}. Analyse 30-second windows instead of whole tracks.`,
  })

  if (worstFreezeMs !== null) {
    headlines.push({
      verdict: freezeVerdict,
      text:
        freezeVerdict === "good"
          ? "The interface stayed responsive throughout."
          : `The interface froze for ${formatDuration(worstFreezeMs)} at worst. Decoding still happens on the main thread — that has to move or run in smaller chunks before this ships.`,
    })
  }

  if (ok.length > 0 && rows.length - ok.length > 0) {
    headlines.push({
      verdict: "warn",
      text: `${rows.length - ok.length} file(s) failed to analyse — see the table.`,
    })
  }

  return {
    tracks: ok.length,
    failed: rows.length - ok.length,
    audioSeconds,
    longFiles: ok.filter((row) => row.durationSeconds >= LONG_TRACK_SECONDS).length,

    speed: {
      medianPerTrack: {
        value: formatDuration(medianMs),
        verdict: speedVerdict,
        meaning: "Typical wall-clock time to analyse one file end to end.",
      },
      p95PerTrack: {
        value: formatDuration(percentile95(totals)),
        verdict: "unknown",
        meaning:
          "The slow tail. A long recorded set will dominate this — cost scales with duration.",
      },
      realtimeFactor: {
        value: `${Math.round(realtime)}×`,
        verdict: "unknown",
        meaning:
          "Seconds of audio analysed per second of waiting. Higher is better; it's independent of track length.",
      },
      playlistEstimate: {
        value: formatDuration(playlistMs),
        verdict: speedVerdict,
        meaning: `How long a ${REFERENCE_PLAYLIST_TRACKS}-track playlist would take. Under a minute is comfortable; over three and nobody waits.`,
      },
    },

    responsiveness: {
      worstFreeze: {
        value: worstFreezeMs === null ? "not measured" : formatDuration(worstFreezeMs),
        verdict: freezeVerdict,
        meaning:
          "Longest the interface was frozen. Under 100ms is imperceptible; over 500ms feels broken. Keep this tab in front while measuring, or the browser throttles the probe and reports zero.",
      },
    },

    accuracy: {
      bpm: {
        value: ratio(bpmBreakdown.agreed, bpmBreakdown.comparable),
        verdict: bpmVerdict,
        meaning:
          "Detected tempo vs the tag already on the file, within 1.5 BPM. Half- and double-time tags count as a match, since that's a real convention.",
      },
      key: {
        value: ratio(keyBreakdown.agreed, keyBreakdown.comparable),
        verdict: keyVerdict,
        meaning:
          "Detected key vs the tag, as exact Camelot positions. Mixed In Key wrote most of those tags, so this is a comparison against the tool DJs already trust.",
      },
      bpmBreakdown,
      keyBreakdown,
    },

    headlines,
  }
}
