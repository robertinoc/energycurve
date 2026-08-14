import {
  DEFAULT_GENRE_TRANSITION_TOLERANCE,
  DYNAMICS_RULES_V2,
  ENDING_RULES_V2,
  ENERGY_CONFIDENCE_RULES_V3,
  GENRE_TRANSITION_TOLERANCE_V2,
  SET_CONTEXTS,
  SET_SCORE_WEIGHTS_V2,
  SHAPE_FIT_RULES_V2,
  STANDARD_TRACK_DURATION_MINUTES,
  type CurveShape,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import { assessSlot } from "@/lib/engine/slot"
import { buildTargetCurve, genreCurveCharacter } from "@/lib/engine/target-curve"
import type {
  DetectedIssue,
  PlaylistAnalysis,
  PlaylistAnalysisInput,
  SetScoreBreakdown,
  TrackEnergyMeta,
} from "@/types/analysis"

/** Minimum tracks before early-peak detection makes sense (A6/B3). */
const EARLY_PEAK_MIN_TRACKS = 4

/** How far above the target a first-third max must sit to be an early peak. */
const EARLY_PEAK_TARGET_EXCESS = 1.5

/** Minimum tracks before progression analysis makes sense (A7). */
const PROGRESSION_MIN_TRACKS = 4

/** Adjacent downward step that counts as a "rest" for too_many_rests. */
const REST_DELTA_THRESHOLD = 2

/** Number of separate non-breather rests that triggers the hint. */
const TOO_MANY_RESTS_COUNT = 2

/** Maximum shape deviations surfaced as individual issues (explanation layer). */
const MAX_SHAPE_ISSUES = 3

/** Ending sub-score below which a weak_ending issue is surfaced. */
const WEAK_ENDING_ISSUE_THRESHOLD = 8.5

/**
 * Informational guideline for total set duration (minutes). Typical club
 * slots run 45–150 minutes; outside that range a hint is emitted. No score
 * impact.
 */
export const SET_DURATION_GUIDELINE_MINUTES = {
  min: 45,
  max: 150,
} as const

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function averageOf(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Displayed penalty attribution: one decimal, never rounding down to zero. */
function attributedPenalty(finalPoints: number): number {
  return Math.max(0.1, roundToOneDecimal(finalPoints))
}

// ---------------------------------------------------------------------------
// Confidence (B13): BPM alone can't discriminate energy inside a
// homogeneous-BPM set, so penalties that require per-track differentiation
// are suppressed when the data can't support them.
// ---------------------------------------------------------------------------

/** Meta is only usable when it matches the curve one-to-one. */
function usableMeta(
  curve: number[],
  meta: TrackEnergyMeta[] | undefined
): TrackEnergyMeta[] | null {
  return meta && meta.length === curve.length ? meta : null
}

/**
 * Global low-confidence: most energies came from BPM and the resolved curve
 * barely moves — any "no climax" or monotony reading would be an artifact of
 * missing signal, not of the set (B13).
 */
function isLowEnergyConfidence(
  curve: number[],
  meta: TrackEnergyMeta[] | null
): boolean {
  if (!meta || curve.length === 0) {
    return false
  }

  const rules = ENERGY_CONFIDENCE_RULES_V3
  const bpmShare =
    meta.filter((entry) => entry.source === "bpm").length / meta.length
  const range = Math.max(...curve) - Math.min(...curve)

  return (
    bpmShare >= rules.bpmSourceShareThreshold &&
    range < rules.resolvedEnergyRangeThreshold
  )
}

// ---------------------------------------------------------------------------
// Shape fit (B3): tolerated RMSE against the target curve + missing climax.
// ---------------------------------------------------------------------------

interface ShapeAssessment {
  score: number
  /** Per-track deviation beyond the tolerance band (0 when within it). */
  deviations: number[]
  /** Energy points by which the set's max misses the target's max. */
  climaxGap: number
  /** Sub-score points lost to RMSE (before clamping). */
  rmseLoss: number
}

function assessShape(
  curve: number[],
  target: number[],
  suppressClimax = false
): ShapeAssessment {
  const rules = SHAPE_FIT_RULES_V2
  const deviations = curve.map((score, index) =>
    Math.max(0, Math.abs(score - target[index]) - rules.toleranceBand)
  )
  const rmse = Math.sqrt(
    averageOf(deviations.map((deviation) => deviation ** 2))
  )
  // With low-confidence BPM-only energies a missing climax is an artifact of
  // missing signal, not of the set — it neither costs points nor gets
  // reported (B13).
  const climaxGap = suppressClimax
    ? 0
    : Math.max(
        0,
        Math.max(...target) - Math.max(...curve) - rules.climaxTolerance
      )
  const rmseLoss = rules.rmseWeight * rmse
  const score = roundToOneDecimal(
    clamp(10 - rmseLoss - rules.climaxWeight * climaxGap, 0, 10)
  )

  return { score, deviations, climaxGap, rmseLoss }
}

// ---------------------------------------------------------------------------
// Energy dynamics (B4–B7): transitions beyond genre tolerance + flat zones,
// ranked so the worst problems dominate instead of stacking with set length.
// ---------------------------------------------------------------------------

interface TransitionAssessment {
  /** 0-based index of the transition's first track. */
  index: number
  delta: number
  penalty: number
  isBreather: boolean
}

function assessTransitions(
  curve: number[],
  genre: SupportedGenre
): TransitionAssessment[] {
  const tolerance =
    GENRE_TRANSITION_TOLERANCE_V2[genre] ?? DEFAULT_GENRE_TRANSITION_TOLERANCE
  const rules = DYNAMICS_RULES_V2
  const assessments: TransitionAssessment[] = []

  for (let i = 1; i < curve.length; i += 1) {
    const delta = curve[i] - curve[i - 1]

    // A controlled step down right after a sustained peak is craft (B7).
    const breatherRules = rules.breather
    const drop = -delta
    const precedingSlice = curve.slice(
      Math.max(0, i - breatherRules.precedingTracks),
      i
    )
    const isBreather =
      drop >= breatherRules.minDrop &&
      drop <= breatherRules.maxDrop &&
      curve[i] >= breatherRules.landingMin &&
      precedingSlice.length >= breatherRules.precedingTracks &&
      precedingSlice.every(
        (score) => score >= breatherRules.precedingEnergyMin
      )

    const excess = isBreather
      ? 0
      : delta > 0
        ? Math.max(0, delta - tolerance.rise)
        : Math.max(0, drop - tolerance.drop)

    const penalty = Math.min(
      excess * rules.excessWeight,
      rules.transitionPenaltyCap
    )

    if (penalty > 0 || isBreather) {
      assessments.push({ index: i - 1, delta, penalty, isBreather })
    }
  }

  return assessments
}

interface FlatZone {
  /** 0-based inclusive bounds. */
  start: number
  end: number
  penalty: number
  exempt: boolean
  /** True when BPM-only data can't support a monotony claim here (B13). */
  suppressed: boolean
}

/**
 * Flat zone = a run of 3+ tracks whose energy range stays within a small
 * tolerance (B5) — no more exact-equality blind spot. A zone is exempt when
 * the ideal curve is equally flat there and the set is riding it (a sustained
 * peak plateau is craft, a mid-energy stall is not). A zone is suppressed —
 * no penalty, no issue — when every track in it is BPM-sourced and the BPMs
 * barely differ: identical BPMs prove nothing about real energy (B13).
 */
function findFlatZones(
  curve: number[],
  target: number[],
  meta: TrackEnergyMeta[] | null
): FlatZone[] {
  const rules = DYNAMICS_RULES_V2
  const zones: FlatZone[] = []
  let start = 0

  while (start <= curve.length - rules.flatWindowMinTracks) {
    let min = curve[start]
    let max = curve[start]
    let end = start

    for (let i = start + 1; i < curve.length; i += 1) {
      const nextMin = Math.min(min, curve[i])
      const nextMax = Math.max(max, curve[i])

      if (nextMax - nextMin > rules.flatRangeTolerance) {
        break
      }

      min = nextMin
      max = nextMax
      end = i
    }

    const length = end - start + 1

    if (length >= rules.flatWindowMinTracks) {
      const targetSlice = target.slice(start, end + 1)
      const targetIsFlat =
        Math.max(...targetSlice) - Math.min(...targetSlice) <=
        rules.flatRangeTolerance
      const ridesTarget = curve
        .slice(start, end + 1)
        .every(
          (score, offset) =>
            Math.abs(score - targetSlice[offset]) <=
            SHAPE_FIT_RULES_V2.toleranceBand
        )

      let suppressed = false

      if (meta) {
        const zoneMeta = meta.slice(start, end + 1)
        const allBpmSourced = zoneMeta.every(
          (entry) => entry.source === "bpm" && entry.bpm !== null
        )

        if (allBpmSourced) {
          const zoneBpms = zoneMeta.map((entry) => entry.bpm as number)
          suppressed =
            Math.max(...zoneBpms) - Math.min(...zoneBpms) <=
            ENERGY_CONFIDENCE_RULES_V3.flatZoneBpmRange
        }
      }

      zones.push({
        start,
        end,
        penalty: Math.min(
          rules.flatBasePenalty +
            rules.flatPerExtraTrack * (length - rules.flatWindowMinTracks),
          rules.flatPenaltyCap
        ),
        exempt: targetIsFlat && ridesTarget,
        suppressed,
      })

      start = end + 1
    } else {
      start += 1
    }
  }

  return zones
}

interface RankedDynamicsProblem {
  kind: "transition" | "flat"
  transition?: TransitionAssessment
  flatZone?: FlatZone
  penalty: number
  /** Penalty after the worst-first decay ranking (B6). */
  weightedPenalty: number
}

interface DynamicsAssessment {
  score: number
  problems: RankedDynamicsProblem[]
  breathers: TransitionAssessment[]
  /** Flat zones dropped for lack of energy signal, not because they're fine (B13). */
  suppressedFlatZoneCount: number
}

function assessDynamics(
  curve: number[],
  genre: SupportedGenre,
  target: number[],
  meta: TrackEnergyMeta[] | null
): DynamicsAssessment {
  const transitions = assessTransitions(curve, genre)
  const flatZones = findFlatZones(curve, target, meta)

  const pool: RankedDynamicsProblem[] = [
    ...transitions
      .filter((transition) => transition.penalty > 0)
      .map((transition) => ({
        kind: "transition" as const,
        transition,
        penalty: transition.penalty,
        weightedPenalty: 0,
      })),
    ...flatZones
      .filter((zone) => !zone.exempt && !zone.suppressed)
      .map((zone) => ({
        kind: "flat" as const,
        flatZone: zone,
        penalty: zone.penalty,
        weightedPenalty: 0,
      })),
  ].sort((a, b) => b.penalty - a.penalty)

  // Worst problems dominate: each successive problem is discounted, so a long
  // set with one cliff is judged by the cliff, not by its track count (B6).
  let totalPenalty = 0

  pool.forEach((problem, rank) => {
    problem.weightedPenalty =
      problem.penalty * DYNAMICS_RULES_V2.decayFactor ** rank
    totalPenalty += problem.weightedPenalty
  })

  return {
    score: roundToOneDecimal(clamp(10 - totalPenalty, 0, 10)),
    problems: pool,
    breathers: transitions.filter((transition) => transition.isBreather),
    suppressedFlatZoneCount: flatZones.filter(
      (zone) => zone.suppressed && !zone.exempt
    ).length,
  }
}

// ---------------------------------------------------------------------------
// Ending quality (B8): proportional distance from the ideal landing.
// ---------------------------------------------------------------------------

interface EndingAssessment {
  score: number
  /** True when the last track lands below the target (vs overshooting). */
  landsLow: boolean
}

function assessEnding(curve: number[], target: number[]): EndingAssessment {
  const rules = ENDING_RULES_V2
  const lastIndex = curve.length - 1
  const deviationAt = (index: number) =>
    index >= 0
      ? Math.max(0, Math.abs(curve[index] - target[index]) - rules.tolerance)
      : 0

  const weighted =
    rules.lastTrackWeight * deviationAt(lastIndex) +
    rules.secondToLastWeight * deviationAt(lastIndex - 1)

  return {
    score: roundToOneDecimal(clamp(10 - rules.scale * weighted, 0, 10)),
    landsLow: curve[lastIndex] < target[lastIndex],
  }
}

// ---------------------------------------------------------------------------
// Blend + issue derivation.
// ---------------------------------------------------------------------------

interface ScoredCurve {
  breakdown: SetScoreBreakdown
  shape: ShapeAssessment
  dynamics: DynamicsAssessment
  ending: EndingAssessment
  target: number[]
  /** Global low-confidence flag (B13). */
  lowConfidence: boolean
}

function scoreCurve(
  curve: number[],
  genre: SupportedGenre,
  context: PlaylistContext,
  trackMeta?: TrackEnergyMeta[],
  targetShape: CurveShape | null = null,
  target = buildTargetCurve(curve.length, context, genre, targetShape)
): ScoredCurve {
  const meta = usableMeta(curve, trackMeta)
  const lowConfidence = isLowEnergyConfidence(curve, meta)
  const shape = assessShape(curve, target, lowConfidence)
  const dynamics = assessDynamics(curve, genre, target, meta)
  const ending = assessEnding(curve, target)
  const weights = SET_SCORE_WEIGHTS_V2

  const rawScore =
    weights.shape * shape.score +
    weights.dynamics * dynamics.score +
    weights.ending * ending.score

  const breakdown: SetScoreBreakdown = {
    shapeFit: shape.score,
    dynamicsQuality: dynamics.score,
    endingQuality: ending.score,
    weights: { ...weights },
    rawScore: roundToOneDecimal(rawScore),
    finalScore: roundToOneDecimal(clamp(rawScore, 1, 10)),
  }

  return { breakdown, shape, dynamics, ending, target, lowConfidence }
}

/** Convenience export for callers that only need the number (reorder search). */
export function computeSetScore(
  curve: number[],
  genre: SupportedGenre,
  context: PlaylistContext,
  trackMeta?: TrackEnergyMeta[],
  targetShape: CurveShape | null = null
): number {
  return scoreCurve(curve, genre, context, trackMeta, targetShape).breakdown
    .finalScore
}

function deriveDynamicsIssues(scored: ScoredCurve): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const weights = SET_SCORE_WEIGHTS_V2

  for (const problem of scored.dynamics.problems) {
    const finalPoints = weights.dynamics * problem.weightedPenalty

    if (problem.kind === "transition" && problem.transition) {
      const { index, delta } = problem.transition

      issues.push({
        type: delta < 0 ? "abrupt_drop" : "abrupt_spike",
        severity: "penalty",
        trackPositions: [index + 1, index + 2],
        penaltyApplied: attributedPenalty(finalPoints),
        penaltyCategory: "dynamics",
        delta,
      })
    } else if (problem.flatZone) {
      const { start, end } = problem.flatZone

      issues.push({
        type: "flat_zone",
        severity: "penalty",
        trackPositions: Array.from(
          { length: end - start + 1 },
          (_, offset) => start + offset + 1
        ),
        penaltyApplied: attributedPenalty(finalPoints),
        penaltyCategory: "dynamics",
      })
    }
  }

  for (const breather of scored.dynamics.breathers) {
    issues.push({
      type: "good_breather",
      severity: "positive",
      trackPositions: [breather.index + 1, breather.index + 2],
      penaltyApplied: 0,
      penaltyCategory: null,
      delta: breather.delta,
    })
  }

  return issues
}

function deriveShapeIssues(
  scored: ScoredCurve,
  curve: number[],
  genre: SupportedGenre,
  context: PlaylistContext
): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const weights = SET_SCORE_WEIGHTS_V2
  const { deviations, climaxGap, rmseLoss } = scored.shape

  const totalSquared = deviations.reduce(
    (sum, deviation) => sum + deviation ** 2,
    0
  )
  const shapeLossFinal = weights.shape * rmseLoss
  const deviationShareInFinalPoints = (index: number) =>
    totalSquared > 0
      ? (deviations[index] ** 2 / totalSquared) * shapeLossFinal
      : 0

  // Early peak (B3): the set maxes out in the first third, clearly above the
  // ideal curve. Slow-build genres treat it as a real flaw; for the rest it
  // is a heads-up. Either way it already influenced the shape sub-score.
  let earlyPeakIndex: number | null = null

  if (curve.length >= EARLY_PEAK_MIN_TRACKS) {
    const maxScore = Math.max(...curve)
    const maxIndex = curve.indexOf(maxScore)
    const firstThird = Math.ceil(curve.length / 3)

    if (
      maxIndex < firstThird &&
      maxScore >= scored.target[maxIndex] + EARLY_PEAK_TARGET_EXCESS
    ) {
      earlyPeakIndex = maxIndex

      const slowBuild = genreCurveCharacter(genre).build === "slow"

      issues.push({
        type: "early_peak",
        severity: slowBuild ? "penalty" : "info",
        trackPositions: [maxIndex + 1],
        penaltyApplied: slowBuild
          ? attributedPenalty(deviationShareInFinalPoints(maxIndex))
          : 0,
        penaltyCategory: slowBuild ? "shape" : null,
      })
    }
  }

  // Worst deviations from the ideal curve become individual, attributable
  // issues (B3) — no longer one fixed penalty per out-of-range track.
  if (totalSquared > 0) {
    const ranked = deviations
      .map((deviation, index) => ({ deviation, index }))
      .filter(
        (entry) => entry.deviation > 0 && entry.index !== earlyPeakIndex
      )
      .sort((a, b) => b.deviation - a.deviation)
      .slice(0, MAX_SHAPE_ISSUES)

    for (const entry of ranked) {
      const overshootsIntoPeak =
        curve[entry.index] > scored.target[entry.index] &&
        curve[entry.index] >= 8 &&
        context === "opening"

      issues.push({
        type: overshootsIntoPeak ? "context_high_peak" : "context_range",
        severity: "penalty",
        trackPositions: [entry.index + 1],
        penaltyApplied: attributedPenalty(
          deviationShareInFinalPoints(entry.index)
        ),
        penaltyCategory: "shape",
      })
    }
  }

  if (climaxGap > 0) {
    issues.push({
      type: "no_climax",
      severity: "penalty",
      trackPositions: [],
      penaltyApplied: attributedPenalty(
        weights.shape * SHAPE_FIT_RULES_V2.climaxWeight * climaxGap
      ),
      penaltyCategory: "shape",
    })
  }

  return issues
}

function deriveEndingIssue(scored: ScoredCurve): DetectedIssue | null {
  if (
    scored.ending.score >= WEAK_ENDING_ISSUE_THRESHOLD ||
    !scored.ending.landsLow
  ) {
    return null
  }

  return {
    type: "weak_ending",
    severity: "penalty",
    trackPositions: [scored.target.length],
    penaltyApplied: attributedPenalty(
      SET_SCORE_WEIGHTS_V2.ending * (10 - scored.ending.score)
    ),
    penaltyCategory: "ending",
  }
}

function deriveInformationalHints(
  curve: number[],
  breatherIndexes: Set<number>
): DetectedIssue[] {
  const issues: DetectedIssue[] = []

  if (curve.length >= PROGRESSION_MIN_TRACKS) {
    const thirdSize = Math.ceil(curve.length / 3)
    const firstThird = curve.slice(0, thirdSize)
    const lastThird = curve.slice(curve.length - thirdSize)

    if (averageOf(lastThird) <= averageOf(firstThird)) {
      issues.push({
        type: "no_progression",
        severity: "info",
        trackPositions: [],
        penaltyApplied: 0,
        penaltyCategory: null,
      })
    }
  }

  const restPositions: number[] = []

  for (let i = 1; i < curve.length; i += 1) {
    const isRest = curve[i] - curve[i - 1] <= -REST_DELTA_THRESHOLD

    if (isRest && !breatherIndexes.has(i - 1)) {
      restPositions.push(i + 1)
    }
  }

  if (restPositions.length >= TOO_MANY_RESTS_COUNT) {
    issues.push({
      type: "too_many_rests",
      severity: "info",
      trackPositions: restPositions,
      penaltyApplied: 0,
      penaltyCategory: null,
    })
  }

  const durationMinutes = curve.length * STANDARD_TRACK_DURATION_MINUTES

  if (durationMinutes < SET_DURATION_GUIDELINE_MINUTES.min) {
    issues.push({
      type: "set_too_short",
      severity: "info",
      trackPositions: [],
      penaltyApplied: 0,
      penaltyCategory: null,
    })
  } else if (durationMinutes > SET_DURATION_GUIDELINE_MINUTES.max) {
    issues.push({
      type: "set_too_long",
      severity: "info",
      trackPositions: [],
      penaltyApplied: 0,
      penaltyCategory: null,
    })
  }

  return issues
}

const SEVERITY_ORDER: Record<DetectedIssue["severity"], number> = {
  penalty: 0,
  info: 1,
  positive: 2,
}

function deriveIssues(
  scored: ScoredCurve,
  curve: number[],
  genre: SupportedGenre,
  context: PlaylistContext
): DetectedIssue[] {
  const breatherIndexes = new Set(
    scored.dynamics.breathers.map((breather) => breather.index)
  )

  const issues = [
    ...deriveDynamicsIssues(scored),
    ...deriveShapeIssues(scored, curve, genre, context),
    ...deriveInformationalHints(curve, breatherIndexes),
  ]

  const endingIssue = deriveEndingIssue(scored)

  if (endingIssue) {
    issues.push(endingIssue)
  }

  // One actionable heads-up when the data limited the analysis (B13): the
  // curve came (almost) entirely from near-identical BPMs, so fine-grained
  // judgments were skipped rather than guessed.
  if (scored.lowConfidence || scored.dynamics.suppressedFlatZoneCount > 0) {
    issues.push({
      type: "low_energy_confidence",
      severity: "info",
      trackPositions: [],
      penaltyApplied: 0,
      penaltyCategory: null,
    })
  }

  return issues.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.penaltyApplied - a.penaltyApplied
  )
}

/**
 * Scores the same curve under every context (A9/B10) so the UI can surface
 * which context the set fits best. Targets are regenerated per context.
 */
export function scoreUnderAllContexts(
  curve: number[],
  genre: SupportedGenre,
  trackMeta?: TrackEnergyMeta[]
): Record<PlaylistContext, number> {
  const scores = {} as Record<PlaylistContext, number>

  for (const context of SET_CONTEXTS) {
    scores[context] = scoreCurve(
      curve,
      genre,
      context,
      trackMeta
    ).breakdown.finalScore
  }

  return scores
}

export function analyzePlaylist({
  curve,
  genre,
  context,
  trackMeta,
  slot,
  targetShape = null,
}: PlaylistAnalysisInput): PlaylistAnalysis {
  const scored = scoreCurve(curve, genre, context, trackMeta, targetShape)
  const issues = deriveIssues(scored, curve, genre, context)
  const slotAssessment = slot ? assessSlot(curve, slot) : null

  // Appended after the scored issues and carrying zero penalty: timing is a
  // separate axis from curve quality, and the score must not move because a form
  // field was filled in.
  if (slotAssessment && slotAssessment.verdict !== "well_placed") {
    issues.push({
      type:
        slotAssessment.verdict === "peak_too_early"
          ? "peak_too_early_for_slot"
          : "peak_too_late_for_slot",
      severity: "info",
      trackPositions: [slotAssessment.peakPosition],
      penaltyApplied: 0,
      penaltyCategory: null,
    })
  }

  const contextScores = scoreUnderAllContexts(curve, genre, trackMeta)

  const bestFitContext = SET_CONTEXTS.reduce((best, candidate) =>
    contextScores[candidate] > contextScores[best] ? candidate : best
  )

  return {
    genre,
    context,
    targetShape,
    curve,
    targetCurve: scored.target,
    issues,
    breakdown: scored.breakdown,
    setScore: scored.breakdown.finalScore,
    contextScores,
    bestFitContext,
    slot: slotAssessment,
  }
}
