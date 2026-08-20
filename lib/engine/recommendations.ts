import {
  REORDER_HARMONY_V4,
  REORDER_MIN_IMPROVEMENT_V2,
  type CurveShape,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import {
  CONTEXT_DISPLAY_NAMES,
  formatTemplate,
  ISSUE_COPY,
  REORDER_RATIONALE,
  REORDER_RATIONALE_HARMONIC,
} from "@/lib/content/analysis-copy"
import { formatClock, formatGap } from "@/lib/engine/slot"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  analyzePlaylist,
  SET_DURATION_GUIDELINE_MINUTES,
} from "@/lib/engine/analysis"
import { assessHarmony, type HarmonyAssessment } from "@/lib/engine/harmony"
import { harmonyApplies, optimizeOrder } from "@/lib/engine/reorder"
import type {
  DetectedIssue,
  PlaylistAnalysis,
  ResolvedTrackEnergy,
} from "@/types/analysis"

export interface Recommendation {
  issue: DetectedIssue
  title: string
  body: string
  action: string
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function buildTemplateParams(
  issue: DetectedIssue,
  analysis: PlaylistAnalysis,
  locale: SiteLocale
): Record<string, string | number> {
  const positions = issue.trackPositions
  const firstPosition = positions[0] ?? 0
  const score =
    firstPosition > 0 && firstPosition <= analysis.curve.length
      ? analysis.curve[firstPosition - 1]
      : 0

  // Context expectations now come from the ideal curve the set was scored
  // against (B2), not from fixed per-context bands.
  const target = analysis.targetCurve
  const targetMin = roundToOneDecimal(Math.min(...target))
  const targetMax = roundToOneDecimal(Math.max(...target))
  const targetAtTrack =
    firstPosition > 0 && firstPosition <= target.length
      ? target[firstPosition - 1]
      : targetMax

  return {
    from: positions[0] ?? 0,
    to: positions[1] ?? positions[0] ?? 0,
    position: firstPosition,
    positions: positions.join(", "),
    count: positions.length,
    delta: roundToOneDecimal(Math.abs(issue.delta ?? 0)),
    score,
    min: targetMin,
    max: targetMax,
    ideal: targetAtTrack,
    threshold: roundToOneDecimal(target[target.length - 1] ?? targetMax),
    context: CONTEXT_DISPLAY_NAMES[analysis.context][locale],
    trackCount: analysis.curve.length,
    // Real playing time where the files carried it, the standard-track estimate
    // where they didn't. This is the number the length advice quotes back, and it
    // used to be trackCount × 3 for everyone — off by more than 2× for a set of
    // seven-minute progressive tracks, which is exactly who got told "short set".
    duration: analysis.timing.totalMinutes,
    minDuration: SET_DURATION_GUIDELINE_MINUTES.min,
    maxDuration: SET_DURATION_GUIDELINE_MINUTES.max,
    // Read only by the declared-slot length pair, which can't be emitted without a
    // fit. Zero rather than absent so a missing key can never render as braces.
    slotMinutes: analysis.slotFit?.slotMinutes ?? 0,
    gap: analysis.slotFit
      ? formatGap(Math.abs(analysis.slotFit.differenceMinutes))
      : "",
    // Empty rather than absent when no slot was declared: the two slot issues are
    // the only copy that reads these, and they can't be emitted without one — but
    // a missing key would render the literal braces if that ever changed.
    peakClock: analysis.slot ? formatClock(analysis.slot.peakClockMinutes) : "",
    remaining: analysis.slot ? formatGap(analysis.slot.remainingMinutes) : "",
    slotStart: analysis.slot ? formatClock(analysis.slot.slot.startMinutes) : "",
    slotEnd: analysis.slot ? formatClock(analysis.slot.slot.endMinutes) : "",
  }
}

/**
 * Maps every detected issue to localized, actionable copy. Pure — the copy
 * tables live in `lib/content/analysis-copy.ts`.
 */
export function buildRecommendations(
  analysis: PlaylistAnalysis,
  locale: SiteLocale
): Recommendation[] {
  return analysis.issues.map((issue) => {
    const copy = ISSUE_COPY[issue.type]
    const params = buildTemplateParams(issue, analysis, locale)

    return {
      issue,
      title: formatTemplate(copy.title[locale], params),
      body: formatTemplate(copy.body[locale], params),
      action: formatTemplate(copy.recommendation[locale], params),
    }
  })
}

export interface ReorderSuggestion {
  /** Original 1-based positions in their suggested playing order. */
  suggestedOrder: number[]
  suggestedAnalysis: PlaylistAnalysis
  rationale: string
  /** Camelot read of both orders, when keys are available (B20). */
  harmony: { before: HarmonyAssessment; after: HarmonyAssessment } | null
}

/**
 * Suggested order = the optimizer's best arrangement toward the ideal curve
 * (B11), keeping transitions harmonic on the Camelot wheel when keys are
 * available (B20). Returned when it meaningfully improves the energy score,
 * OR when it meaningfully improves harmony without trading the curve away.
 */
export function suggestReorder(
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext,
  originalScore: number,
  locale: SiteLocale,
  /**
   * Declared shape, forwarded to the optimizer. Omitting it would suggest an
   * order optimized against the derived target — i.e. advice that undoes the
   * shape the DJ just declared.
   */
  targetShape: CurveShape | null = null
): ReorderSuggestion | null {
  if (energies.length < 2) {
    return null
  }

  const useHarmony = harmonyApplies(energies)
  const optimized = optimizeOrder(energies, genre, context, targetShape)
  const energyImprovement = optimized.score - originalScore

  const harmonyBefore = assessHarmony(energies.map((entry) => entry.camelot))
  const harmonicImprovement = optimized.harmonicRatio - harmonyBefore.ratio

  const worthItByEnergy = energyImprovement >= REORDER_MIN_IMPROVEMENT_V2
  const worthItByHarmony =
    useHarmony &&
    harmonicImprovement >= REORDER_HARMONY_V4.minHarmonicImprovement &&
    energyImprovement >= -REORDER_HARMONY_V4.maxEnergyRegression

  if (!worthItByEnergy && !worthItByHarmony) {
    return null
  }

  const orderedEnergies = optimized.order.map((index) => energies[index])
  const suggestedAnalysis = analyzePlaylist({
    curve: orderedEnergies.map((entry) => entry.score),
    genre,
    context,
    trackMeta: orderedEnergies.map((entry) => ({
      source: entry.source,
      bpm: entry.bpm,
    })),
  })

  const harmonyAfter = assessHarmony(
    orderedEnergies.map((entry) => entry.camelot)
  )

  return {
    suggestedOrder: orderedEnergies.map((entry) => entry.position),
    suggestedAnalysis,
    rationale: useHarmony
      ? formatTemplate(REORDER_RATIONALE_HARMONIC[locale], {
          context: CONTEXT_DISPLAY_NAMES[context][locale],
          harmonic: harmonyAfter.harmonicCount + harmonyAfter.boostCount,
          known: harmonyAfter.knownTransitions,
        })
      : formatTemplate(REORDER_RATIONALE[locale], {
          context: CONTEXT_DISPLAY_NAMES[context][locale],
        }),
    harmony: useHarmony ? { before: harmonyBefore, after: harmonyAfter } : null,
  }
}
