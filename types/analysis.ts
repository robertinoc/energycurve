import type { PlaylistContext, SupportedGenre } from "@/lib/product/strategy"

export type EnergySource = "manual" | "bpm" | "estimated"

export interface ResolvedTrackEnergy {
  trackId: string | null
  position: number
  score: number
  source: EnergySource
}

export type IssueType =
  | "abrupt_drop"
  | "abrupt_spike"
  | "flat_zone"
  | "early_peak"
  | "weak_ending"
  | "context_range"
  | "context_high_peak"
  | "no_progression"
  | "too_many_rests"

export type IssueSeverity = "penalty" | "info"

export type PenaltyCategory = "drop" | "flat" | "context" | "genre"

export interface DetectedIssue {
  type: IssueType
  severity: IssueSeverity
  /** 1-based playlist positions involved in the issue. */
  trackPositions: number[]
  /** Absolute score points subtracted for this issue (0 when informational). */
  penaltyApplied: number
  penaltyCategory: PenaltyCategory | null
  /** Energy delta for drop/spike issues. */
  delta?: number
}

export interface SetScoreBreakdown {
  startingScore: number
  dropPenalty: number
  flatZonePenalty: number
  contextPenalty: number
  genrePenalty: number
  rawScore: number
  finalScore: number
}

export interface PlaylistAnalysisInput {
  curve: number[]
  genre: SupportedGenre
  context: PlaylistContext
}

export interface PlaylistAnalysis {
  genre: SupportedGenre
  context: PlaylistContext
  curve: number[]
  issues: DetectedIssue[]
  breakdown: SetScoreBreakdown
  setScore: number
  /** Final score the same curve would get under each context (A9). */
  contextScores: Record<PlaylistContext, number>
  bestFitContext: PlaylistContext
}
