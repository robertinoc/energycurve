export const PRODUCT_VISION =
  "Help DJs design better sets through energy-curve analysis with clear, actionable feedback adapted to context and genre."

export const PRIMARY_ICP = {
  label: "Beginner/intermediate DJs",
  ageRange: "18-35",
  tools: ["Rekordbox", "Serato", "Traktor"],
  behaviors: [
    "Mix at home or at small events",
    "Upload sets to platforms",
    "Actively want to improve",
  ],
  painPoints: [
    "Insecurity when building sets",
    "Lack of objective feedback",
    "Difficulty understanding progression",
  ],
} as const

export const SECONDARY_ICP = {
  label: "Semi-pro DJs",
  jobsToBeDone: [
    "Optimize sets",
    "Validate decisions",
    "Save prep time",
  ],
} as const

export const MVP_INCLUDED_CAPABILITIES = [
  "Manual playlist input",
  "Track energy score calculation",
  "Energy curve analysis",
  "Genre-aware adaptation",
  "Context-aware adaptation",
  "Set score",
  "Recommendations",
] as const

export const MVP_EXCLUDED_CAPABILITIES = [
  "DJ software integrations",
  "Audio analysis",
  "External track recommendations",
  "Social features",
] as const

export const PRODUCT_KPIS = {
  adoption: ["Registered users", "Playlists analyzed"],
  engagement: [
    "Time on results screen",
    "Recommendation interactions",
  ],
  retention: ["Returning users", "Analyzed sets per user"],
} as const

export const SET_CONTEXTS = ["opening", "main", "closing"] as const
export type PlaylistContext = (typeof SET_CONTEXTS)[number]

export const SUPPORTED_GENRES = [
  "house",
  "deep-house",
  "organic-house",
  "disco-house",
  "tech-house",
  "techno",
  "hard-techno",
  "melodic-techno",
  "progressive",
  "trance",
  "psy-trance",
  "bounce",
] as const
export type SupportedGenre = (typeof SUPPORTED_GENRES)[number]

/**
 * Single source of truth for genre display names. Importing this everywhere
 * (create form, playlist pages, analysis) means adding a genre is one edit
 * here, not four scattered label maps.
 */
export const GENRE_LABELS: Record<SupportedGenre, string> = {
  house: "House",
  "deep-house": "Deep House",
  "organic-house": "Organic House",
  "disco-house": "Disco House",
  "tech-house": "Tech House",
  techno: "Techno",
  "hard-techno": "Hard Techno",
  "melodic-techno": "Melodic Techno",
  progressive: "Progressive",
  trance: "Trance",
  "psy-trance": "Psy Trance",
  bounce: "Bounce",
}

export const PRODUCT_PRINCIPLES = [
  "Simple over complex",
  "Explainable over magical",
  "Assist, do not impose",
  "Focus on flow, not on isolated tracks",
] as const

export const ENERGY_SCORE_RANGE = {
  min: 1,
  max: 10,
} as const

export const ENERGY_SCORE_BPM_BANDS = [
  { minBpmExclusive: Number.NEGATIVE_INFINITY, maxBpmInclusive: 114.99, scoreMin: 3, scoreMax: 4 },
  { minBpmInclusive: 115, maxBpmInclusive: 122, scoreMin: 4, scoreMax: 5 },
  { minBpmInclusive: 122.01, maxBpmInclusive: 128, scoreMin: 5, scoreMax: 7 },
  { minBpmInclusive: 128.01, maxBpmInclusive: 135, scoreMin: 6, scoreMax: 8 },
  { minBpmInclusive: 135.01, maxBpmInclusive: Number.POSITIVE_INFINITY, scoreMin: 7, scoreMax: 10 },
] as const

export const ANALYSIS_RULES_V1 = {
  abruptDropDifferenceThreshold: 3,
  flatZoneMinimumTrackCount: 3,
  weakEndingThresholdFloor: 5,
} as const

export const CONTEXT_ENGINE_V1 = {
  opening: {
    expectedEnergyMin: 3,
    expectedEnergyMax: 6,
    allowHighPeaks: false,
  },
  main: {
    expectedEnergyMin: 6,
    expectedEnergyMax: 9,
    allowHighPeaks: true,
  },
  closing: {
    expectedEnergyMin: 7,
    expectedEnergyMax: 9,
    allowHighPeaks: true,
  },
} as const satisfies Record<
  PlaylistContext,
  {
    expectedEnergyMin: number
    expectedEnergyMax: number
    allowHighPeaks: boolean
  }
>

// Per-genre behavioral flags. Defaults for the newly added genres are
// sensible starting points from DJ practice — review/tune with real sets:
//   penalizeEarlyPeak: genres that build slowly hate an early climax
//   penalizeAbruptDrop: driving/hypnotic genres punish sudden energy loss
//   favorsGradualProgression: genres whose sets should trend steadily up
export const GENRE_ENGINE_V1 = {
  house: {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: true,
    favorsGradualProgression: true,
  },
  "deep-house": {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: true,
    favorsGradualProgression: true,
  },
  "organic-house": {
    penalizeEarlyPeak: true,
    penalizeAbruptDrop: true,
    favorsGradualProgression: true,
  },
  "disco-house": {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: false,
    favorsGradualProgression: false,
  },
  "tech-house": {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: true,
    favorsGradualProgression: false,
  },
  techno: {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: true,
    favorsGradualProgression: false,
  },
  "hard-techno": {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: true,
    favorsGradualProgression: false,
  },
  "melodic-techno": {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: false,
    favorsGradualProgression: false,
  },
  progressive: {
    penalizeEarlyPeak: true,
    penalizeAbruptDrop: false,
    favorsGradualProgression: true,
  },
  trance: {
    penalizeEarlyPeak: true,
    penalizeAbruptDrop: true,
    favorsGradualProgression: true,
  },
  "psy-trance": {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: true,
    favorsGradualProgression: false,
  },
  bounce: {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: false,
    favorsGradualProgression: false,
  },
} as const satisfies Record<
  SupportedGenre,
  {
    penalizeEarlyPeak: boolean
    penalizeAbruptDrop: boolean
    favorsGradualProgression: boolean
  }
>

export const SET_SCORE_RULES_V1 = {
  startingScore: 10,
  abruptDropPenalty: 1,
  flatZonePenalty: 1,
  contextPenalty: 2,
  genrePenalty: 1,
  clampMin: 1,
  clampMax: 10,
} as const

export const STANDARD_TRACK_DURATION_MINUTES = 3

export const RESULT_OUTPUTS_V1 = [
  "Set score",
  "Energy curve",
  "Issue list",
  "Recommendations",
  "Suggested order",
] as const

// ---------------------------------------------------------------------------
// Analysis engine V2 — "target curve" model.
//
// V1 subtracted a fixed point per detected issue, which made scores depend on
// set length, cliff-edged on thresholds (Δ2.9 free, Δ3.0 penalized), and only
// ever punished. V2 scores how the set compares to an ideal energy curve for
// its context and genre, with proportional penalties and genre-aware
// tolerances. The V1 blocks above stay frozen as the historical spec; every
// V2 rule lives in the *_V2 constants below. Interpretations are documented
// as B1–B12 in docs/product-feature-02-set-analysis.md.
// ---------------------------------------------------------------------------

/**
 * Single source of truth for the engine version. Written to every analyses
 * snapshot and mixed into the dedupe hash — bump ONLY this constant when the
 * scoring rules change.
 */
export const CURRENT_ANALYSIS_ALGORITHM_VERSION = 2

export interface GenreBpmProfile {
  /** BPM that maps to energy 3 for this genre. */
  bpmLow: number
  /** BPM that maps to energy 9 for this genre. */
  bpmHigh: number
}

/**
 * Genre-relative BPM→energy anchors (B1): 126 BPM is peak-time house but a
 * hard-techno warm-up. Within [bpmLow, bpmHigh] energy interpolates 3→9;
 * outside, it keeps sliding toward 1/10 across a 10-BPM ramp, then clamps.
 * Genres missing here (future additions) fall back to
 * DEFAULT_GENRE_BPM_PROFILE so an expanded genre list never breaks scoring.
 */
export const GENRE_BPM_PROFILES_V2: Record<SupportedGenre, GenreBpmProfile> = {
  house: { bpmLow: 118, bpmHigh: 128 },
  "deep-house": { bpmLow: 112, bpmHigh: 124 },
  "organic-house": { bpmLow: 108, bpmHigh: 122 },
  "disco-house": { bpmLow: 112, bpmHigh: 126 },
  "tech-house": { bpmLow: 120, bpmHigh: 130 },
  techno: { bpmLow: 125, bpmHigh: 140 },
  "hard-techno": { bpmLow: 138, bpmHigh: 158 },
  "melodic-techno": { bpmLow: 116, bpmHigh: 126 },
  progressive: { bpmLow: 116, bpmHigh: 126 },
  trance: { bpmLow: 130, bpmHigh: 142 },
  "psy-trance": { bpmLow: 136, bpmHigh: 148 },
  bounce: { bpmLow: 124, bpmHigh: 136 },
}

export const DEFAULT_GENRE_BPM_PROFILE: GenreBpmProfile = {
  bpmLow: 118,
  bpmHigh: 140,
}

/** BPM distance past a genre band over which energy slides to the 1/10 extremes (B1). */
export const BPM_PROFILE_EDGE_RAMP = 10

export interface GenreCurveCharacter {
  /** Slow-build genres get gentler opening ramps and later climaxes. */
  build: "slow" | "standard" | "driving"
  /** Driving genres hold the peak as a plateau instead of one climax. */
  sustainedPeak: boolean
  /** Emotional genres may land the last track ~1 point below the peak. */
  softLanding: boolean
}

export const GENRE_CURVE_CHARACTER_V2: Record<
  SupportedGenre,
  GenreCurveCharacter
> = {
  house: { build: "standard", sustainedPeak: false, softLanding: false },
  "deep-house": { build: "slow", sustainedPeak: false, softLanding: true },
  "organic-house": { build: "slow", sustainedPeak: false, softLanding: true },
  "disco-house": { build: "standard", sustainedPeak: false, softLanding: false },
  "tech-house": { build: "standard", sustainedPeak: false, softLanding: false },
  techno: { build: "standard", sustainedPeak: false, softLanding: false },
  "hard-techno": { build: "driving", sustainedPeak: true, softLanding: false },
  "melodic-techno": { build: "slow", sustainedPeak: false, softLanding: true },
  progressive: { build: "slow", sustainedPeak: false, softLanding: true },
  trance: { build: "standard", sustainedPeak: false, softLanding: false },
  "psy-trance": { build: "driving", sustainedPeak: true, softLanding: false },
  bounce: { build: "standard", sustainedPeak: false, softLanding: false },
}

export const DEFAULT_GENRE_CURVE_CHARACTER: GenreCurveCharacter = {
  build: "standard",
  sustainedPeak: false,
  softLanding: false,
}

export interface GenreTransitionTolerance {
  /** Upward energy step that is still comfortable for this genre. */
  rise: number
  /** Downward energy step that is still comfortable for this genre. */
  drop: number
}

/**
 * Per-genre transition comfort (B4). Only the excess beyond the tolerance is
 * penalized, proportionally — no more Δ2.9-free / Δ3.0-penalized cliff.
 */
export const GENRE_TRANSITION_TOLERANCE_V2: Record<
  SupportedGenre,
  GenreTransitionTolerance
> = {
  house: { rise: 2, drop: 2 },
  "deep-house": { rise: 2, drop: 2 },
  "organic-house": { rise: 1.5, drop: 2 },
  "disco-house": { rise: 3, drop: 3 },
  "tech-house": { rise: 2.5, drop: 2 },
  techno: { rise: 2.5, drop: 2 },
  "hard-techno": { rise: 3, drop: 2 },
  "melodic-techno": { rise: 3, drop: 3 },
  progressive: { rise: 1.5, drop: 2 },
  trance: { rise: 1.5, drop: 2 },
  "psy-trance": { rise: 3, drop: 2 },
  bounce: { rise: 3, drop: 3 },
}

export const DEFAULT_GENRE_TRANSITION_TOLERANCE: GenreTransitionTolerance = {
  rise: 2,
  drop: 2,
}

/**
 * Ideal-curve anchors per context (B2). Values are energies; positions are
 * fractions of the set (0 = first track, 1 = last). The builder samples the
 * continuous shape at the set's actual track count, so the fit is
 * length-invariant by construction.
 */
export const TARGET_CURVE_V2 = {
  opening: {
    startEnergy: 3,
    endEnergy: 6,
    slowBuildEndEnergy: 5.5,
  },
  main: {
    standard: { startEnergy: 6, peakEnergy: 9, climaxAt: 0.7 },
    slow: { startEnergy: 6, peakEnergy: 9, climaxAt: 0.8 },
    driving: { startEnergy: 7, peakEnergy: 9.5, climaxAt: 0.6 },
  },
  closing: {
    startEnergy: 7,
    peakEnergy: 9,
    drivingPeakEnergy: 9.5,
    climaxAt: 0.4,
    /** Fraction of the set where a soft landing may descend (B2). */
    softLandingFrom: 0.9,
    softLandingDip: 1,
  },
} as const

/** Curve-shape sub-score rules (B3). */
export const SHAPE_FIT_RULES_V2 = {
  /** Deviations from the target within this band are free (waves are craft). */
  toleranceBand: 0.75,
  /** Score points lost per unit of tolerated RMSE. */
  rmseWeight: 3.5,
  /** How close the set's max must get to the target's max to count as a climax. */
  climaxTolerance: 0.5,
  /** Score points lost per energy point of missing climax. */
  climaxWeight: 1.5,
} as const

/** Energy-dynamics sub-score rules: transitions + monotony (B4, B5, B6). */
export const DYNAMICS_RULES_V2 = {
  /** Penalty per energy point beyond the genre transition tolerance. */
  excessWeight: 1.5,
  /** Cap for a single transition's penalty. */
  transitionPenaltyCap: 4,
  /**
   * Worst problems dominate: penalties are ranked and each successive one is
   * discounted by this factor, so long sets aren't punished for length (B6).
   */
  decayFactor: 0.6,
  /** Flat zone = a window of this many tracks... */
  flatWindowMinTracks: 3,
  /** ...whose energy range stays within this tolerance (B5). */
  flatRangeTolerance: 0.3,
  flatBasePenalty: 1,
  flatPerExtraTrack: 0.5,
  flatPenaltyCap: 4,
  /**
   * A deliberate post-peak breather is craft, not a flaw (B7): a controlled
   * step down right after a sustained peak carries no penalty.
   */
  breather: {
    minDrop: 2,
    maxDrop: 3,
    precedingTracks: 2,
    precedingEnergyMin: 8,
    landingMin: 5.5,
  },
} as const

/** Ending sub-score rules (B8): proportional, replaces the binary weak-ending. */
export const ENDING_RULES_V2 = {
  tolerance: 0.5,
  lastTrackWeight: 2 / 3,
  secondToLastWeight: 1 / 3,
  /** Score points lost per weighted energy point away from the target ending. */
  scale: 2.5,
} as const

/** Final blend (B9): three explainable sub-scores instead of penalty counting. */
export const SET_SCORE_WEIGHTS_V2 = {
  shape: 0.5,
  dynamics: 0.35,
  ending: 0.15,
} as const

/** Minimum improvement before the reorder optimizer suggests a new order (B11). */
export const REORDER_MIN_IMPROVEMENT_V2 = 0.5
