import type { PlaylistContext, SupportedGenre } from "@/lib/product/strategy"

export type EnergySource = "manual" | "bpm" | "estimated"

export interface ResolvedTrackEnergy {
  trackId: string | null
  position: number
  score: number
  source: EnergySource
  /** Raw BPM the score came from (null for manual/estimated without BPM). */
  bpm: number | null
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
  | "no_progression"
  | "too_many_rests"
  | "set_too_short"
  | "set_too_long"

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
  contextScores: Record<PlaylistContext, number>
  bestFitContext: PlaylistContext
}
