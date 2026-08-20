import type { EnergyCoverage } from "@/lib/engine/energy-coverage"
import type { SetTiming, SlotFit } from "@/lib/engine/set-timing"
import type { ResolvedSlot, SlotAssessment } from "@/lib/engine/slot"
import type {
  CurveShape,
  PlaylistContext,
  SupportedGenre,
} from "@/lib/product/strategy"

/**
 * Where a track's resolved energy came from. "bpm_loudness" = BPM anchor
 * refined by the track's perceived loudness within the set (B19) — real
 * differentiation, unlike plain "bpm".
 */
/**
 * Where a track's energy number came from, in descending order of trust.
 * "audio" is Energy Model v3 — measured from the track's own spectrum.
 */
export type EnergySource =
  | "manual"
  | "audio"
  | "bpm"
  | "bpm_loudness"
  | "estimated"

export interface ResolvedTrackEnergy {
  trackId: string | null
  position: number
  score: number
  source: EnergySource
  /** Raw BPM the score came from (null for manual/estimated without BPM). */
  bpm: number | null
  /** Camelot code of the track's key ("8A"), null when unknown (B18). */
  camelot: string | null
}

/** Per-track provenance the confidence layer needs (B13). */
export interface TrackEnergyMeta {
  source: EnergySource
  bpm: number | null
}

export type IssueType =
  | "abrupt_drop"
  | "abrupt_spike"
  | "flat_zone"
  | "early_peak"
  | "weak_ending"
  | "context_range"
  | "context_high_peak"
  | "no_climax"
  | "good_breather"
  | "low_energy_confidence"
  | "energy_data_missing"
  | "no_progression"
  | "too_many_rests"
  | "set_too_short"
  | "set_too_long"
  // Slot-aware timing. Informational by design: see the note on
  // PlaylistAnalysis.slot for why these never cost score points.
  | "set_short_for_slot"
  | "set_over_slot"
  | "peak_too_early_for_slot"
  | "peak_too_late_for_slot"

export type IssueSeverity = "penalty" | "info" | "positive"

export type PenaltyCategory = "shape" | "dynamics" | "ending"

export interface DetectedIssue {
  type: IssueType
  severity: IssueSeverity
  /** 1-based playlist positions involved in the issue. */
  trackPositions: number[]
  /**
   * Estimated final-score points this issue costs (V2 attribution): the
   * sub-score loss it contributed, scaled by the sub-score's weight. 0 when
   * informational or positive.
   */
  penaltyApplied: number
  penaltyCategory: PenaltyCategory | null
  /** Energy delta for drop/spike/breather issues. */
  delta?: number
}

/**
 * V2 breakdown: the set score is a weighted blend of three explainable
 * sub-scores (each 0–10) instead of V1's penalty subtraction.
 */
export interface SetScoreBreakdown {
  /** How closely the curve follows the ideal shape for context + genre. */
  shapeFit: number
  /** Transition smoothness + monotony: jumps beyond genre tolerance, flat zones. */
  dynamicsQuality: number
  /** How the set lands relative to the ideal ending. */
  endingQuality: number
  weights: { shape: number; dynamics: number; ending: number }
  /** Weighted blend before clamping. */
  rawScore: number
  /** Clamped to [1, 10], one decimal. */
  finalScore: number
}

export interface PlaylistAnalysisInput {
  curve: number[]
  genre: SupportedGenre
  context: PlaylistContext
  /**
   * Per-track energy provenance, same length/order as `curve` (B13). When
   * present, penalties that require per-track differentiation are suppressed
   * where BPM-only data cannot support them. Optional for backward compat.
   */
  trackMeta?: TrackEnergyMeta[]
  /**
   * Real track lengths in seconds, same length/order as `curve`, with null for
   * tracks whose file carried no duration.
   *
   * Separate from `trackMeta` on purpose: that field is energy *provenance*, and a
   * track's length has nothing to do with how its energy was derived. Optional, and
   * a set that omits it falls back to the standard-track estimate exactly as before.
   */
  durationsSeconds?: (number | null)[]
  /**
   * The wall-clock slot the set is played in, when the DJ declared one. Absent
   * for every set that hasn't, which is the default — the analysis works exactly
   * as before without it.
   */
  slot?: ResolvedSlot | null
  /**
   * Named shape the DJ is aiming at. Absent (the default) keeps the target
   * derived from context + genre, so no existing set's score moves.
   */
  targetShape?: CurveShape | null
  /**
   * Anchors from a saved template. Wins over `targetShape` — a DJ who saved
   * their own shape and selected it is asking for theirs.
   */
  targetAnchors?: readonly (readonly [number, number])[] | null
}

export interface PlaylistAnalysis {
  genre: SupportedGenre
  context: PlaylistContext
  curve: number[]
  /** Ideal curve the set was scored against (same length as `curve`). */
  targetCurve: number[]
  issues: DetectedIssue[]
  breakdown: SetScoreBreakdown
  setScore: number
  /** Final score the same curve would get under each context (A9/B10). */
  /** The shape the set was actually scored against, null when derived. */
  targetShape: CurveShape | null
  contextScores: Record<PlaylistContext, number>
  bestFitContext: PlaylistContext
  /**
   * Where the peak lands on the clock, when a slot was declared.
   *
   * Deliberately **not** part of the score. The score measures the curve; timing
   * is a separate axis, and folding it in would mean the same set scores
   * differently depending on whether a field was filled — a set with no slot
   * would outscore an identical one with a slot, which is perverse. So the two
   * slot issues are informational and cost zero points.
   */
  slot: SlotAssessment | null
  /**
   * How much of the curve came from the music rather than from track positions.
   *
   * On every analysis, not only the bad cases, because anything that displays the
   * set score needs to be able to qualify it — and the score is at its most
   * flattering exactly where this is at its worst. See lib/engine/energy-coverage.
   */
  coverage: EnergyCoverage
  /**
   * How much music the set actually holds, from real file lengths where they exist.
   *
   * Present on every analysis because the previous answer — track count times three
   * minutes — was wrong for anyone whose tracks aren't three minutes long, and the
   * engine was emitting "short set" advice on the strength of it. `measured` says
   * whether the number is worth stating out loud.
   */
  timing: SetTiming
  /**
   * Whether the set has enough music for the declared slot. Null without a slot, and
   * null when the length is only estimated — a fit computed from a guess is a guess
   * wearing a number.
   */
  slotFit: SlotFit | null
}
