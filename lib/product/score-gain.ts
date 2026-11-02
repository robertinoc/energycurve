/**
 * Did this analysis raise the set's score, because the DJ changed the set?
 *
 * Wall 3 of step 3.1 (docs/conversion-plan.md) sells at the one moment the
 * product's value needs no argument: someone changed their set because of what
 * we told them, analysed it again, and it scored higher. `lib/product/first-run.ts`
 * calls re-analysing "the moment the product actually pays off" for the same
 * reason.
 *
 * The bar is "the set got better", not "the number moved":
 * - compared with the last analysis that read a *different* input — the history
 *   dedupes identical inputs, so the newest row is this analysis itself once it
 *   has been recorded;
 * - the same algorithm version, genre and context, and a different curve. A
 *   rescoring release, or switching the genre, also moves the number, and
 *   selling it as the DJ's achievement would be a lie told in our favour;
 * - strictly higher. Equal or lower shows nothing: selling over a worse result
 *   is worse than not selling.
 *
 * It lasts the sitting, not forever: on the render that records the new
 * analysis (`fresh`) and for an hour after, so a refresh or a save keeps it,
 * and the set doesn't carry "you raised it" next week.
 */

export interface RecordedAnalysis {
  inputHash: string
  setScore: number
  curve: readonly number[]
  genre: string
  context: string
  algorithmVersion: number
  createdAt: string
}

export interface CurrentAnalysis {
  inputHash: string
  setScore: number
  curve: readonly number[]
  genre: string
  context: string
  algorithmVersion: number
}

export interface ScoreGain {
  from: number
  to: number
  /** True on the render that records this analysis: the moment itself. */
  fresh: boolean
}

/** How long after the improving analysis was recorded it is still news. */
export const SCORE_GAIN_FRESH_MS = 60 * 60 * 1000

/** Scores carry one decimal; compare them as tenths, not as floats. */
const tenths = (score: number) => Math.round(score * 10)

export function scoreGain(
  current: CurrentAnalysis,
  recentNewestFirst: readonly RecordedAnalysis[],
  now: Date = new Date()
): ScoreGain | null {
  const [latest, beforeLatest] = recentNewestFirst

  if (!latest) {
    return null
  }

  const fresh = latest.inputHash !== current.inputHash

  if (!fresh && now.getTime() - Date.parse(latest.createdAt) > SCORE_GAIN_FRESH_MS) {
    return null
  }

  const previous = fresh ? latest : beforeLatest

  if (
    !previous ||
    previous.algorithmVersion !== current.algorithmVersion ||
    previous.genre !== current.genre ||
    previous.context !== current.context ||
    sameCurve(previous.curve, current.curve)
  ) {
    return null
  }

  if (tenths(current.setScore) <= tenths(previous.setScore)) {
    return null
  }

  return { from: previous.setScore, to: current.setScore, fresh }
}

function sameCurve(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}
