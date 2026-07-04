import {
  ANALYSIS_RULES_V1,
  CONTEXT_ENGINE_V1,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import {
  CONTEXT_DISPLAY_NAMES,
  formatTemplate,
  ISSUE_COPY,
  REORDER_RATIONALE,
} from "@/lib/content/analysis-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { analyzePlaylist } from "@/lib/engine/analysis"
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

function buildTemplateParams(
  issue: DetectedIssue,
  analysis: PlaylistAnalysis,
  locale: SiteLocale
): Record<string, string | number> {
  const rules = CONTEXT_ENGINE_V1[analysis.context]
  const positions = issue.trackPositions
  const firstPosition = positions[0] ?? 0
  const score =
    firstPosition > 0 && firstPosition <= analysis.curve.length
      ? analysis.curve[firstPosition - 1]
      : 0

  return {
    from: positions[0] ?? 0,
    to: positions[1] ?? positions[0] ?? 0,
    position: firstPosition,
    positions: positions.join(", "),
    count: positions.length,
    delta: Math.abs(issue.delta ?? 0),
    score,
    min: rules.expectedEnergyMin,
    max: rules.expectedEnergyMax,
    threshold: Math.max(
      ANALYSIS_RULES_V1.weakEndingThresholdFloor,
      rules.expectedEnergyMin
    ),
    context: CONTEXT_DISPLAY_NAMES[analysis.context][locale],
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
}

/**
 * Suggested order = stable ascending sort by resolved energy (A11): it
 * removes every abrupt drop and ends strong, and it can be explained in one
 * sentence. The suggestion is only returned when its re-analyzed score
 * strictly beats the original.
 */
export function suggestReorder(
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext,
  originalScore: number,
  locale: SiteLocale
): ReorderSuggestion | null {
  if (energies.length < 2) {
    return null
  }

  const sorted = [...energies].sort((a, b) =>
    a.score === b.score ? a.position - b.position : a.score - b.score
  )

  const suggestedAnalysis = analyzePlaylist({
    curve: sorted.map((entry) => entry.score),
    genre,
    context,
  })

  if (suggestedAnalysis.setScore <= originalScore) {
    return null
  }

  return {
    suggestedOrder: sorted.map((entry) => entry.position),
    suggestedAnalysis,
    rationale: REORDER_RATIONALE[locale],
  }
}
