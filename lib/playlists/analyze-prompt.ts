/**
 * What the playlist page offers, depending on whether the set was ever
 * analysed.
 *
 * In the seven days to 10/11/2026 the backstage counted 105 playlists created
 * (+57 %) against 49 analyses (−34 %): more people than ever importing, fewer
 * analysing. The leak was on this page. "Analyze set" was the last of a row of
 * seven peers; the import summary's only link led to a documentation page; and
 * the first-run guide that says "analyse" lives on the dashboard, not here.
 * The analysis is the moment the product proves itself, so a set nobody
 * analysed is a person who never saw what EnergyCurve is for.
 *
 * Two different things answer that, and they are kept apart on purpose:
 *
 * - **Emphasis is permanent.** On a set that was never analysed, analysing
 *   leads and the other actions step back — they are things you do *after*
 *   (export, share the curve, compare). It is hierarchy, not a message: it
 *   cannot be dismissed because there is nothing to dismiss.
 * - **The next-step note is said once.** What the analysis gives is explained
 *   on arrival from the import and not again. Someone who imports a list to keep it has every
 *   right to; a note that greets them on every visit is nagging, and the house
 *   position (components/dashboard/first-run-guide.tsx) is no modal, no tour,
 *   no overlay — nothing that follows people around.
 *
 * Everything here is derived from data the page already has plus one head
 * count. Nothing is stored, so nothing can disagree with reality.
 */

/**
 * `unknown` when the read failed. It is treated as analysed everywhere: the
 * page then looks the way it always did, which is the safe direction — a nudge
 * shown to someone who already analysed is the wrong kind of mistake.
 */
export type AnalysisStatus = "never" | "analyzed" | "unknown"

/** Same number as `MIN_ANALYZABLE_TRACKS` in services/analysis-service.ts. */
const MIN_TRACKS_TO_ANALYZE = 2

export interface AnalyzePromptInput {
  status: AnalysisStatus
  trackCount: number
}

/** A set can only be pushed towards an analysis it is able to have. */
function canLead({ status, trackCount }: AnalyzePromptInput): boolean {
  return status === "never" && trackCount >= MIN_TRACKS_TO_ANALYZE
}

/**
 * `lead`: analysing is the page's main action and the rest step back.
 * `peer`: the row as it always was — analysing is one action among the others.
 */
export function analyzeEmphasis(input: AnalyzePromptInput): "lead" | "peer" {
  return canLead(input) ? "lead" : "peer"
}

/**
 * Whether to say, this once, what the analysis gives.
 *
 * "Once" is the import's own redirect (`?imported=1`), the same signal the
 * import summary uses: it is in the address of the arrival and nowhere else,
 * so coming back to the set later finds the page without the note. A set built
 * by hand has no arrival — it grows a track at a time — and gets the leading
 * button and its one-line hint, which are always there, and no note.
 */
export function showsAnalyzeNextStep(
  input: AnalyzePromptInput & {
    /** The import redirect's `?imported=1`. */
    justImported: boolean
  }
): boolean {
  return input.justImported && canLead(input)
}
