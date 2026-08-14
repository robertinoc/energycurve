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

/** Display names for set contexts (single source of truth). */
export const CONTEXT_LABELS: Record<PlaylistContext, string> = {
  opening: "Opening",
  main: "Main time",
  closing: "Closing",
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
 *
 * v3 (B13–B16): per-track genre anchors, wider BPM edge ramp, confidence
 * layer (BPM-only artifacts no longer penalized), BPM-aware genre detection.
 * v4 (B17–B20): full key coverage from Traktor's numeric MUSICAL_KEY,
 * perceived-loudness as an energy signal, and a harmonic (Camelot) objective
 * in the reorder optimizer. The set score's meaning is unchanged — harmony
 * only shapes the suggested order.
 */
export const CURRENT_ANALYSIS_ALGORITHM_VERSION = 4

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

/**
 * BPM distance past a genre band over which energy slides to the 1/10
 * extremes (B1). Widened 10 → 20 in v3 (B14): a mis-detected genre no longer
 * collapses every out-of-band BPM to the same clamped value, and nearby BPMs
 * outside the band keep differentiating.
 */
export const BPM_PROFILE_EDGE_RAMP = 20

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

/**
 * Named target-curve shapes the DJ can pick explicitly.
 *
 * Until now the target curve was *derived* from context + genre and the DJ never
 * saw it, let alone chose it. That works for the three ordinary cases and fails
 * for the ones a booking actually throws at you: an after-hours set whose whole
 * craft is a long hypnotic plateau, or a closing set that is supposed to come
 * down rather than end on the peak. Both score badly against a derived target
 * that assumes every set climbs.
 *
 * Anchors instead of formulas: each shape is a handful of (progress, energy)
 * points, linearly interpolated. A DJ can be shown the shape and argue with it,
 * which is the whole product principle — explainable over magical. Adding a
 * shape is adding a line here, not a branch in the sampler.
 */
export const CURVE_SHAPES = [
  "warm_up",
  "peak_time",
  "after_hours",
  "journey",
  "landing",
] as const
export type CurveShape = (typeof CURVE_SHAPES)[number]

/**
 * Narrows a value coming from the database or a form into a shape the engine can
 * index with. The column is `text` with a CHECK, not a PG enum, so the boundary
 * is where a bad value has to die — indexing the anchor table with an unknown
 * key would hand the scorer an undefined target instead of an error.
 */
export function parseCurveShape(value: unknown): CurveShape | null {
  return typeof value === "string" && (CURVE_SHAPES as readonly string[]).includes(value)
    ? (value as CurveShape)
    : null
}

export const CURVE_SHAPE_ANCHORS: Record<
  CurveShape,
  readonly (readonly [number, number])[]
> = {
  /** Hands the floor over warm, never peaks. The ceiling is the promise. */
  warm_up: [
    [0, 3],
    [0.5, 4.8],
    [1, 6.5],
  ],
  /** Already busy at track one, tops out early, then holds. */
  peak_time: [
    [0, 7],
    [0.55, 9.5],
    [1, 9.5],
  ],
  /**
   * A long plateau on purpose. The flat stretch is exempt from the monotony
   * penalty for free, because that rule already forgives a set that rides a
   * flat target — declaring the shape is what makes the target flat.
   */
  after_hours: [
    [0, 7],
    [0.2, 8.5],
    [0.85, 8.5],
    [1, 8],
  ],
  /** Two acts: build, deliberate mid-set breath, bigger second build. */
  journey: [
    [0, 5.5],
    [0.4, 8],
    [0.55, 6.5],
    [0.9, 9.5],
    [1, 9],
  ],
  /** Peaks early and comes down on purpose, so descending is correct. */
  landing: [
    [0, 7.5],
    [0.3, 9],
    [0.7, 7],
    [1, 5.5],
  ],
}

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

// ---------------------------------------------------------------------------
// Engine V3 additions (B13–B16).
// ---------------------------------------------------------------------------

/**
 * Energy-confidence rules (B13). BPM alone cannot discriminate energy inside
 * a homogeneous-BPM set, so fine-grained penalties that require per-track
 * differentiation are suppressed when the data cannot support them — the
 * engine says "I don't know" instead of punishing its own lack of signal.
 */
export const ENERGY_CONFIDENCE_RULES_V3 = {
  /** A flat zone is unjudgeable when all its tracks are BPM-sourced and their BPMs span ≤ this. */
  flatZoneBpmRange: 2,
  /** Global low-confidence: at least this share of tracks is BPM-sourced... */
  bpmSourceShareThreshold: 0.7,
  /** ...and the resolved energies span less than this range. */
  resolvedEnergyRangeThreshold: 1.5,
} as const

/**
 * A track's own genre tag only anchors its BPM→energy mapping when the BPM
 * is plausible for that genre — within [bpmLow − margin, bpmHigh + margin]
 * (B14). A "Techno"-tagged track at 158 BPM is mislabeled; trusting the tag
 * would saturate its energy on the wrong band, so it falls back to the
 * playlist's genre instead.
 */
export const TRACK_GENRE_ANCHOR_BPM_MARGIN = 8

/**
 * Half/double-time BPM tag correction (B21). BPM detectors routinely tag fast
 * tracks at half their real tempo (a 160 BPM hard-techno track tagged "80"),
 * and occasionally double a slow one. When a track's tagged BPM falls OUTSIDE
 * the genre band but multiplying by one of these factors lands INSIDE it
 * (± TRACK_GENRE_ANCHOR_BPM_MARGIN), the energy mapping uses the corrected
 * tempo. Non-destructive: the stored/displayed BPM keeps the tag's value.
 * Ordered — the half-time case (×2) is far more common than double-time (×0.5).
 */
export const BPM_TAG_TIME_MULTIPLIERS_V4 = [2, 0.5] as const

/**
 * Genre-detection scoring (B15): file tags vote, but the set's BPMs act as a
 * prior — "Techno" tags on a 157-BPM set point at hard techno, not techno.
 * bpmFitWeight > voteWeight on purpose: unanimous mislabeled tags must lose
 * to a perfect BPM fit (tags describe tracks loosely; BPMs don't lie).
 */
export const GENRE_DETECTION_RULES_V3 = {
  /** Weight of the tag-vote share in a candidate genre's score. */
  voteWeight: 0.45,
  /** Weight of the BPM-band fit in a candidate genre's score. */
  bpmFitWeight: 0.55,
  /** BPMs within [bpmLow − margin, bpmHigh + margin] count as fitting the band. */
  bpmFitMargin: 5,
  /** Unvoted genres still become candidates when their BPM fit reaches this. */
  bpmFitCandidateThreshold: 0.6,
} as const

// ---------------------------------------------------------------------------
// Engine V4 additions (B17–B20): harmony-aware reordering + loudness signal.
// ---------------------------------------------------------------------------

/**
 * Harmonic-mixing costs per Camelot transition tier (B18). perfect/smooth are
 * the classic wheel moves (free); "boost" (+2 same ring) is usable but not
 * seamless; a clash costs full. harmonicRatio = 1 − Σcosts / knownTransitions.
 */
export const HARMONY_RULES_V4 = {
  tierCosts: {
    perfect: 0,
    smooth: 0,
    boost: 0.5,
    clash: 1,
  },
} as const

/**
 * Perceived loudness (Traktor PERCEIVED_DB) as an energy signal (B19): within
 * a set, louder tracks read as higher energy. Only applied when the set has
 * enough dB data to be meaningful — never fabricated from thin signal.
 */
export const LOUDNESS_RULES_V4 = {
  /** Minimum tracks with a dB reading before the adjustment kicks in. */
  minTracksWithDb: 6,
  /** Minimum dB spread (max − min) — below this the tracks are equally loud. */
  minSpreadDb: 1.5,
  /** Energy points a track can gain/lose relative to its BPM anchor. */
  maxAdjustment: 0.8,
} as const

/**
 * Harmony in the reorder objective (B20): the optimizer maximizes
 * energyScore + harmonyWeight × harmonicRatio. Harmony can be worth up to
 * `harmonyWeight` points — enough to dominate energy ties without trading
 * away the curve (energy remains a 10-point scale). Applies only when at
 * least `minKeyCoverage` of the transitions have both keys.
 */
export const REORDER_HARMONY_V4 = {
  harmonyWeight: 2.0,
  minKeyCoverage: 0.5,
  /** Suggest on harmonic gain ≥ this even without an energy gain... */
  minHarmonicImprovement: 0.2,
  /** ...as long as energy doesn't get worse than this. */
  maxEnergyRegression: 0.3,
} as const
