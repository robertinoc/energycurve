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
  "techno",
  "hard-techno",
  "melodic-techno",
  "progressive",
] as const
export type SupportedGenre = (typeof SUPPORTED_GENRES)[number]

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

export const GENRE_ENGINE_V1 = {
  house: {
    penalizeEarlyPeak: false,
    penalizeAbruptDrop: true,
    favorsGradualProgression: true,
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
