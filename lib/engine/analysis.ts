import {
  ANALYSIS_RULES_V1,
  CONTEXT_ENGINE_V1,
  GENRE_ENGINE_V1,
  SET_CONTEXTS,
  SET_SCORE_RULES_V1,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import type {
  DetectedIssue,
  PlaylistAnalysis,
  PlaylistAnalysisInput,
  SetScoreBreakdown,
} from "@/types/analysis"

/** A score at or above this value counts as a "high peak" (A8). */
export const HIGH_PEAK_SCORE = 8

/** Minimum tracks before early-peak detection makes sense (A6). */
const EARLY_PEAK_MIN_TRACKS = 4

/** Minimum energy a peak must reach to count as an early peak (A6). */
const EARLY_PEAK_MIN_SCORE = 7

/** Minimum tracks before progression analysis makes sense (A7). */
const PROGRESSION_MIN_TRACKS = 4

/** Adjacent downward step that counts as a "rest" for too_many_rests. */
const REST_DELTA_THRESHOLD = 2

/** Number of separate rests that triggers the too_many_rests hint. */
const TOO_MANY_RESTS_COUNT = 2

function detectDropAndSpikeIssues(
  curve: number[],
  genre: SupportedGenre
): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const genreRules = GENRE_ENGINE_V1[genre]
  const threshold = ANALYSIS_RULES_V1.abruptDropDifferenceThreshold

  for (let i = 1; i < curve.length; i += 1) {
    const delta = curve[i] - curve[i - 1]

    if (delta <= -threshold) {
      // Drops are always reported; they only cost points when the genre
      // penalizes abrupt drops (A5).
      const penalized = genreRules.penalizeAbruptDrop

      issues.push({
        type: "abrupt_drop",
        severity: penalized ? "penalty" : "info",
        trackPositions: [i, i + 1],
        penaltyApplied: penalized ? SET_SCORE_RULES_V1.abruptDropPenalty : 0,
        penaltyCategory: penalized ? "drop" : null,
        delta,
      })
    } else if (delta >= threshold) {
      // Upward spikes carry no standalone penalty; genres that favor
      // gradual progression count each spike as a genre error (A5).
      const penalized = genreRules.favorsGradualProgression

      issues.push({
        type: "abrupt_spike",
        severity: penalized ? "penalty" : "info",
        trackPositions: [i, i + 1],
        penaltyApplied: penalized ? SET_SCORE_RULES_V1.genrePenalty : 0,
        penaltyCategory: penalized ? "genre" : null,
        delta,
      })
    }
  }

  return issues
}

function detectFlatZones(curve: number[]): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const minRun = ANALYSIS_RULES_V1.flatZoneMinimumTrackCount
  let runStart = 0

  for (let i = 1; i <= curve.length; i += 1) {
    if (i < curve.length && curve[i] === curve[runStart]) {
      continue
    }

    const runLength = i - runStart

    if (runLength >= minRun) {
      issues.push({
        type: "flat_zone",
        severity: "penalty",
        trackPositions: Array.from(
          { length: runLength },
          (_, offset) => runStart + offset + 1
        ),
        penaltyApplied: SET_SCORE_RULES_V1.flatZonePenalty,
        penaltyCategory: "flat",
      })
    }

    runStart = i
  }

  return issues
}

function detectEarlyPeak(
  curve: number[],
  genre: SupportedGenre
): DetectedIssue | null {
  if (curve.length < EARLY_PEAK_MIN_TRACKS) {
    return null
  }

  const maxScore = Math.max(...curve)

  if (maxScore < EARLY_PEAK_MIN_SCORE) {
    return null
  }

  const firstMaxIndex = curve.indexOf(maxScore)

  if (firstMaxIndex >= Math.ceil(curve.length / 3)) {
    return null
  }

  const penalized = GENRE_ENGINE_V1[genre].penalizeEarlyPeak

  return {
    type: "early_peak",
    severity: penalized ? "penalty" : "info",
    trackPositions: [firstMaxIndex + 1],
    penaltyApplied: penalized ? SET_SCORE_RULES_V1.genrePenalty : 0,
    penaltyCategory: penalized ? "genre" : null,
  }
}

function detectContextIssues(
  curve: number[],
  context: PlaylistContext
): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const rules = CONTEXT_ENGINE_V1[context]

  curve.forEach((score, index) => {
    const outOfRange =
      score < rules.expectedEnergyMin || score > rules.expectedEnergyMax

    if (!outOfRange) {
      return
    }

    // A track contributes at most one context error; the high-peak label is
    // only a more specific description of the same violation (A8).
    const isDisallowedHighPeak =
      !rules.allowHighPeaks && score >= HIGH_PEAK_SCORE

    issues.push({
      type: isDisallowedHighPeak ? "context_high_peak" : "context_range",
      severity: "penalty",
      trackPositions: [index + 1],
      penaltyApplied: SET_SCORE_RULES_V1.contextPenalty,
      penaltyCategory: "context",
    })
  })

  return issues
}

function detectWeakEnding(
  curve: number[],
  context: PlaylistContext,
  contextIssues: DetectedIssue[]
): DetectedIssue | null {
  if (curve.length === 0) {
    return null
  }

  const threshold = Math.max(
    ANALYSIS_RULES_V1.weakEndingThresholdFloor,
    CONTEXT_ENGINE_V1[context].expectedEnergyMin
  )
  const lastPosition = curve.length
  const lastScore = curve[lastPosition - 1]

  if (lastScore >= threshold) {
    return null
  }

  // The final track can contribute at most one context error (A4): when it
  // already has an out-of-range violation, the weak ending stays visible in
  // the issue list but carries no additional penalty.
  const lastTrackAlreadyPenalized = contextIssues.some((issue) =>
    issue.trackPositions.includes(lastPosition)
  )

  return {
    type: "weak_ending",
    severity: lastTrackAlreadyPenalized ? "info" : "penalty",
    trackPositions: [lastPosition],
    penaltyApplied: lastTrackAlreadyPenalized
      ? 0
      : SET_SCORE_RULES_V1.contextPenalty,
    penaltyCategory: lastTrackAlreadyPenalized ? null : "context",
  }
}

function averageOf(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function detectNoProgression(curve: number[]): DetectedIssue | null {
  if (curve.length < PROGRESSION_MIN_TRACKS) {
    return null
  }

  const thirdSize = Math.ceil(curve.length / 3)
  const firstThird = curve.slice(0, thirdSize)
  const lastThird = curve.slice(curve.length - thirdSize)

  if (averageOf(lastThird) > averageOf(firstThird)) {
    return null
  }

  return {
    type: "no_progression",
    severity: "info",
    trackPositions: [],
    penaltyApplied: 0,
    penaltyCategory: null,
  }
}

function detectTooManyRests(curve: number[]): DetectedIssue | null {
  const restPositions: number[] = []

  for (let i = 1; i < curve.length; i += 1) {
    if (curve[i] - curve[i - 1] <= -REST_DELTA_THRESHOLD) {
      restPositions.push(i + 1)
    }
  }

  if (restPositions.length < TOO_MANY_RESTS_COUNT) {
    return null
  }

  return {
    type: "too_many_rests",
    severity: "info",
    trackPositions: restPositions,
    penaltyApplied: 0,
    penaltyCategory: null,
  }
}

function detectIssuesForContext(
  curve: number[],
  genre: SupportedGenre,
  context: PlaylistContext
): DetectedIssue[] {
  const issues: DetectedIssue[] = [
    ...detectDropAndSpikeIssues(curve, genre),
    ...detectFlatZones(curve),
  ]

  const earlyPeak = detectEarlyPeak(curve, genre)

  if (earlyPeak) {
    issues.push(earlyPeak)
  }

  const contextIssues = detectContextIssues(curve, context)
  issues.push(...contextIssues)

  const weakEnding = detectWeakEnding(curve, context, contextIssues)

  if (weakEnding) {
    issues.push(weakEnding)
  }

  const noProgression = detectNoProgression(curve)

  if (noProgression) {
    issues.push(noProgression)
  }

  const tooManyRests = detectTooManyRests(curve)

  if (tooManyRests) {
    issues.push(tooManyRests)
  }

  return issues
}

export function computeSetScore(issues: DetectedIssue[]): SetScoreBreakdown {
  const sumFor = (category: DetectedIssue["penaltyCategory"]) =>
    issues
      .filter((issue) => issue.penaltyCategory === category)
      .reduce((sum, issue) => sum + issue.penaltyApplied, 0)

  const dropPenalty = sumFor("drop")
  const flatZonePenalty = sumFor("flat")
  const contextPenalty = sumFor("context")
  const genrePenalty = sumFor("genre")

  const rawScore =
    SET_SCORE_RULES_V1.startingScore -
    dropPenalty -
    flatZonePenalty -
    contextPenalty -
    genrePenalty

  const finalScore = Math.min(
    SET_SCORE_RULES_V1.clampMax,
    Math.max(SET_SCORE_RULES_V1.clampMin, rawScore)
  )

  return {
    startingScore: SET_SCORE_RULES_V1.startingScore,
    dropPenalty,
    flatZonePenalty,
    contextPenalty,
    genrePenalty,
    rawScore,
    finalScore,
  }
}

/**
 * Scores the same curve under every context (A9) so the UI can surface which
 * context the set fits best.
 */
export function scoreUnderAllContexts(
  curve: number[],
  genre: SupportedGenre
): Record<PlaylistContext, number> {
  const scores = {} as Record<PlaylistContext, number>

  for (const context of SET_CONTEXTS) {
    const issues = detectIssuesForContext(curve, genre, context)
    scores[context] = computeSetScore(issues).finalScore
  }

  return scores
}

export function analyzePlaylist({
  curve,
  genre,
  context,
}: PlaylistAnalysisInput): PlaylistAnalysis {
  const issues = detectIssuesForContext(curve, genre, context)
  const breakdown = computeSetScore(issues)
  const contextScores = scoreUnderAllContexts(curve, genre)

  const bestFitContext = SET_CONTEXTS.reduce((best, candidate) =>
    contextScores[candidate] > contextScores[best] ? candidate : best
  )

  return {
    genre,
    context,
    curve,
    issues,
    breakdown,
    setScore: breakdown.finalScore,
    contextScores,
    bestFitContext,
  }
}
