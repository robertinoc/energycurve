/**
 * The CUE harness's results, as rows a person can diff between runs.
 *
 * Pure so the export format is pinned by a test: the point of exporting is to put
 * two runs side by side, and a column that silently changes meaning between them
 * makes the comparison worthless.
 */

import type { TrackAnalysis } from "./analysis-types"
import { findCueCandidates, type BeatGrid, type CueCandidates } from "./cue-candidates"

export interface CueRow {
  fileName: string
  durationSeconds: number
  /** `analyze()` — what the import uses today. */
  analyzeBpm: number | null
  /** `guess()` — rounded by the library. */
  guessBpm: number | null
  guessTempo: number | null
  guessOffsetSeconds: number | null
  /** Whether guess()'s BPM equals analyze()'s rounded the same way. */
  bpmAgrees: boolean | null
  entrySeconds: number | null
  dropSeconds: number | null
  exitSeconds: number | null
  entryStrength: number | null
  dropStrength: number | null
  exitStrength: number | null
  snapped: boolean
  /** The sampled feature pass, i.e. today's analysis. */
  featuresMs: number
  envelopeMs: number | null
  analyzeMs: number
  guessMs: number | null
  decodeMs: number
  notes: string
  error: string | null
}

export function gridFrom(analysis: TrackAnalysis): BeatGrid | null {
  const guess = analysis.cue?.guess
  if (!guess || !(guess.bpm > 0) || !Number.isFinite(guess.offset)) return null
  return { bpm: guess.bpm, offsetSeconds: guess.offset }
}

export function candidatesFor(analysis: TrackAnalysis): CueCandidates | null {
  if (!analysis.cue) return null
  return findCueCandidates(analysis.cue.envelope, gridFrom(analysis))
}

export function toCueRow(analysis: TrackAnalysis, cues: CueCandidates | null): CueRow {
  const guess = analysis.cue?.guess ?? null
  return {
    fileName: analysis.fileName,
    durationSeconds: analysis.durationSeconds,
    analyzeBpm: analysis.bpm,
    guessBpm: guess?.bpm ?? null,
    guessTempo: guess?.tempo ?? null,
    guessOffsetSeconds: guess?.offset ?? null,
    bpmAgrees:
      guess && analysis.bpm !== null ? Math.round(analysis.bpm) === guess.bpm : null,
    entrySeconds: cues?.entry?.seconds ?? null,
    dropSeconds: cues?.drop?.seconds ?? null,
    exitSeconds: cues?.exit?.seconds ?? null,
    entryStrength: cues?.entry?.strength ?? null,
    dropStrength: cues?.drop?.strength ?? null,
    exitStrength: cues?.exit?.strength ?? null,
    snapped: Boolean(cues?.entry?.snapped || cues?.drop?.snapped || cues?.exit?.snapped),
    featuresMs: analysis.featuresMs,
    envelopeMs: analysis.cue?.envelopeMs ?? null,
    analyzeMs: analysis.bpmMs,
    guessMs: analysis.cue?.guessMs ?? null,
    decodeMs: analysis.decodeMs,
    notes: [...(cues?.notes ?? []), analysis.cue?.guessError ?? ""]
      .filter(Boolean)
      .join("; "),
    error: analysis.error,
  }
}

const COLUMNS: Array<keyof CueRow> = [
  "fileName",
  "durationSeconds",
  "analyzeBpm",
  "guessBpm",
  "guessTempo",
  "guessOffsetSeconds",
  "bpmAgrees",
  "entrySeconds",
  "dropSeconds",
  "exitSeconds",
  "entryStrength",
  "dropStrength",
  "exitStrength",
  "snapped",
  "featuresMs",
  "envelopeMs",
  "analyzeMs",
  "guessMs",
  "decodeMs",
  "notes",
  "error",
]

function csvCell(value: CueRow[keyof CueRow]) {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") {
    // Milliseconds of precision on times; more is noise, less loses the beat.
    return Number.isInteger(value) ? String(value) : value.toFixed(4)
  }
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: CueRow[]) {
  return [COLUMNS.join(","), ...rows.map((row) => COLUMNS.map((c) => csvCell(row[c])).join(","))].join("\n")
}

/**
 * The JSON export keeps the half-second envelope so a later run can redraw or
 * re-derive candidates without the audio, and drops the 10 ms one: at 36 000
 * points per track it would make twenty tracks a ~15 MB file for data nobody
 * reads by eye.
 */
export function toJsonExport(analyses: TrackAnalysis[], generatedAt: string) {
  return {
    format: "energycurve-cue-spike/1",
    generatedAt,
    tracks: analyses.map((analysis) => {
      const cues = candidatesFor(analysis)
      return {
        ...toCueRow(analysis, cues),
        candidates: cues,
        envelope: analysis.cue
          ? {
              secondsPerPoint: analysis.cue.envelope.secondsPerPoint,
              full: analysis.cue.envelope.full,
              low: analysis.cue.envelope.low,
            }
          : null,
      }
    }),
  }
}

export function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export interface CueSummary {
  tracks: number
  failed: number
  /** guess() BPM equal to analyze() rounded, out of tracks where both answered. */
  bpmAgree: number
  bpmCompared: number
  medianFeaturesMs: number | null
  medianEnvelopeMs: number | null
  medianAnalyzeMs: number | null
  medianGuessMs: number | null
  /** Each track's added cost (envelope + guess) over today's (decode + BPM + features). */
  medianAddedShare: number | null
}

export function summarise(rows: CueRow[]): CueSummary {
  const ok = rows.filter((row) => !row.error)
  const compared = ok.filter((row) => row.bpmAgrees !== null)
  const numbers = (pick: (row: CueRow) => number | null) =>
    ok.map(pick).filter((value): value is number => value !== null)

  return {
    tracks: ok.length,
    failed: rows.length - ok.length,
    bpmAgree: compared.filter((row) => row.bpmAgrees).length,
    bpmCompared: compared.length,
    medianFeaturesMs: median(numbers((row) => row.featuresMs)),
    medianEnvelopeMs: median(numbers((row) => row.envelopeMs)),
    medianAnalyzeMs: median(numbers((row) => row.analyzeMs)),
    medianGuessMs: median(numbers((row) => row.guessMs)),
    medianAddedShare: median(
      numbers((row) => {
        const today = row.decodeMs + row.analyzeMs + row.featuresMs
        if (row.envelopeMs === null || row.guessMs === null || !(today > 0)) return null
        return (row.envelopeMs + row.guessMs) / today
      })
    ),
  }
}
