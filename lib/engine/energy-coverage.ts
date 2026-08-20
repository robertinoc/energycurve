/**
 * How much of a set's energy curve came from the music, and how much we invented.
 *
 * The problem this exists to name: when a track has no energy tag, no BPM and no
 * audio analysis, `estimatedScoreFromPosition` fills in a value interpolated
 * between the context's expected minimum and maximum. For a set where *every*
 * track is in that state, the resulting curve is a clean linear ramp from the
 * context's floor to its ceiling — and the target curve the analysis grades it
 * against is derived from the same context. The engine then grades its own
 * homework and, measured on a 20-track set with no data whatsoever, awards
 * **9.2 out of 10**.
 *
 * So the headline number was at its most flattering exactly where the engine knew
 * least, and nothing on screen said so. `isLowEnergyConfidence` was supposed to
 * catch this family of case but couldn't: it requires the resolved curve to span
 * less than 1.5 points, and an invented ramp spans the context's full range by
 * construction. The flatness test is right for BPM-only sets, where missing signal
 * shows up as a curve that barely moves. Invented data hides the opposite way.
 *
 * Three tiers rather than a boolean, because the difference matters:
 *
 * - **measured** — `manual` (the DJ's own ear) and `audio` (really analysed). The
 *   number is about this track.
 * - **inferred** — `bpm` and `bpm_loudness`. Real tags, weak signal: tempo is a
 *   proxy for energy, not a measurement of it.
 * - **invented** — `estimated`. Nothing about the track was used. The value came
 *   from where it sits in the tracklist.
 *
 * Pure, and deliberately says nothing about what the UI should do with it.
 */

import type { EnergySource, TrackEnergyMeta } from "@/types/analysis"

/**
 * Invented share above which the score stops describing the set.
 *
 * Two thirds is a judgement, not a measurement, and it is on the permissive side
 * on purpose: at exactly this point a third of the curve is still real, so the
 * shape is at least partly the DJ's. Above it the ramp is mostly ours and the
 * score is mostly circular.
 */
export const INVENTED_SHARE_THRESHOLD = 2 / 3

/**
 * Invented share worth telling the DJ about.
 *
 * Lower than the verdict threshold, and separate from it on purpose. A set that is
 * a third fabricated is still fairly described as `mixed` — two thirds of its shape
 * is really the DJ's — but the third we drew is shaped like the target, so it is
 * quietly holding the score up, and that is worth one sentence. Reserving the
 * warning for the `invented` verdict would mean saying nothing until the score was
 * almost entirely self-referential.
 */
export const INVENTED_SHARE_WARN = 1 / 3

/** Sources that describe the track itself. */
const MEASURED: readonly EnergySource[] = ["manual", "audio"]
/** Sources that describe something real but only proxy for energy. */
const INFERRED: readonly EnergySource[] = ["bpm", "bpm_loudness"]

export type CoverageVerdict = "measured" | "mixed" | "inferred" | "invented"

export interface EnergyCoverage {
  measuredShare: number
  inferredShare: number
  inventedShare: number
  /**
   * The honest one-word summary.
   *
   * `invented` means the curve is mostly ours, so the score is largely circular —
   * anything that states the score should state this alongside it.
   */
  verdict: CoverageVerdict
  /** Tracks whose energy was invented from their position. */
  inventedCount: number
  trackCount: number
}

const EMPTY: EnergyCoverage = {
  measuredShare: 0,
  inferredShare: 0,
  inventedShare: 0,
  verdict: "invented",
  inventedCount: 0,
  trackCount: 0,
}

/**
 * Where a set's energy values came from.
 *
 * An empty set reports `invented` with zero counts: there is no curve, so there is
 * certainly no evidence behind one, and a default of "measured" would be the one
 * mistake this module exists to prevent.
 */
export function energyCoverageOf(
  meta: readonly TrackEnergyMeta[] | undefined
): EnergyCoverage {
  if (!meta || meta.length === 0) {
    return EMPTY
  }

  const measured = meta.filter((entry) => MEASURED.includes(entry.source)).length
  const inferred = meta.filter((entry) => INFERRED.includes(entry.source)).length
  const invented = meta.length - measured - inferred

  const measuredShare = measured / meta.length
  const inferredShare = inferred / meta.length
  const inventedShare = invented / meta.length

  return {
    measuredShare,
    inferredShare,
    inventedShare,
    verdict: verdictFor(measuredShare, inferredShare, inventedShare),
    inventedCount: invented,
    trackCount: meta.length,
  }
}

function verdictFor(
  measuredShare: number,
  inferredShare: number,
  inventedShare: number
): CoverageVerdict {
  // Checked first, so a mostly-fabricated curve can never be labelled by whatever
  // real data it happens to carry. A half-and-half set is honestly `mixed` — half
  // its shape is really the DJ's — and INVENTED_SHARE_WARN is what catches that
  // case, because the fabricated half still props the score up.
  if (inventedShare >= INVENTED_SHARE_THRESHOLD) {
    return "invented"
  }

  if (measuredShare >= INVENTED_SHARE_THRESHOLD) {
    return "measured"
  }

  if (measuredShare + inferredShare >= INVENTED_SHARE_THRESHOLD) {
    // Mostly real, but leaning on tempo as a proxy rather than on measurement.
    return measuredShare > inferredShare ? "mixed" : "inferred"
  }

  return "mixed"
}

/**
 * Whether the set score is worth presenting as a verdict.
 *
 * One function so the rule lives in one place: the analysis screen, the
 * smart-order banner and the public shared curve all ask the same question and
 * cannot drift into disagreeing about the same set.
 *
 * The line is the `invented` verdict — two thirds — and deliberately not
 * `INVENTED_SHARE_WARN`. A set that is one third fabricated still has two thirds
 * of a real shape, and hiding its score would be over-correcting: the caveat is
 * the right response there, not silence. Above two thirds the curve is mostly a
 * ramp we drew from track positions, and the score is grading our own drawing.
 */
export function scoreIsMeaningful(coverage: EnergyCoverage): boolean {
  return coverage.verdict !== "invented"
}
