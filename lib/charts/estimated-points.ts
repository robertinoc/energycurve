/**
 * Which points on a curve are our guess rather than the DJ's music.
 *
 * PR #149 stopped showing a *score* built on invented data. It left the *curve*
 * alone, and the curve is the more persuasive of the two: a smooth arc reads as a
 * measurement whatever the caption says, and on the public share page it reads
 * that way to someone who has no idea what was imported.
 *
 * The values themselves aren't touched. `estimatedScoreFromPosition` still fills a
 * plausible number, because a curve with holes in it is unreadable and the shape
 * is still the DJ's ordering. What changes is that the invented points are drawn as
 * what they are.
 *
 * Pure and chart-agnostic: three different curve components ask the same question,
 * and the answer must not depend on which one is asking.
 */

import type { EnergySource } from "@/types/analysis"

/**
 * The one source that describes nothing about the track.
 *
 * `bpm` and `bpm_loudness` are weak but real — a tempo the DJ's software wrote.
 * `estimated` is interpolated from the track's position in the list, so it says
 * only "you put this here", which the chart already shows on the x-axis.
 */
const INVENTED: EnergySource = "estimated"

/** 0-based indices whose value came from position rather than from the track. */
export function estimatedPointIndices(
  sources: readonly EnergySource[]
): number[] {
  return sources.reduce<number[]>((indices, source, index) => {
    if (source === INVENTED) {
      indices.push(index)
    }

    return indices
  }, [])
}

/**
 * Whether marking them is worth the ink.
 *
 * Nothing to mark when nothing is invented — and nothing worth marking when
 * *everything* is, because a chart where every point is hollow is a chart with a
 * uniform texture, which reads as decoration rather than as a warning. That case
 * is already covered louder: the score is withheld entirely and the header says
 * why. Here the marks earn their keep by contrast — this bit is real, that bit
 * isn't.
 */
export function shouldMarkEstimated(
  estimatedCount: number,
  total: number
): boolean {
  return estimatedCount > 0 && estimatedCount < total
}
