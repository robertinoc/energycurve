/**
 * Key detection from a chroma vector, via the Krumhansl-Schmuckler algorithm.
 *
 * Written here rather than pulled from a library on purpose: every off-the-shelf
 * key detector we evaluated is copyleft (Essentia is AGPL-3.0, aubio is GPL-3.0),
 * which a closed-source commercial product can't ship. K-S is a published
 * algorithm — correlate the track's average pitch-class distribution against 24
 * reference key profiles and take the best match — so implementing it keeps us
 * on MIT-only dependencies. See docs/spike-browser-audio-analysis.md.
 */

/** Pitch-class names, index 0 = C, matching Meyda's chroma bin order. */
const PITCH_CLASSES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const

/**
 * Krumhansl-Kessler probe-tone profiles: the perceived "fit" of each scale
 * degree against a tonic, averaged over listeners. Index 0 is the tonic.
 * From Krumhansl (1990), *Cognitive Foundations of Musical Pitch*.
 */
const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
] as const

const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
] as const

export interface DetectedKey {
  /** Musical key in the notation `lib/music/camelot.ts` accepts, e.g. "Am", "F#". */
  key: string
  scale: "major" | "minor"
  /** Pearson correlation of the winning profile, roughly 0…1. */
  confidence: number
  /**
   * Gap between the best and second-best candidate. A tiny margin means the
   * track is tonally ambiguous and the answer shouldn't be trusted, even when
   * `confidence` looks healthy.
   */
  margin: number
}

function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length
  let sumA = 0
  let sumB = 0

  for (let i = 0; i < n; i += 1) {
    sumA += a[i]
    sumB += b[i]
  }

  const meanA = sumA / n
  const meanB = sumB / n

  let covariance = 0
  let varianceA = 0
  let varianceB = 0

  for (let i = 0; i < n; i += 1) {
    const deltaA = a[i] - meanA
    const deltaB = b[i] - meanB
    covariance += deltaA * deltaB
    varianceA += deltaA * deltaA
    varianceB += deltaB * deltaB
  }

  const denominator = Math.sqrt(varianceA * varianceB)
  // A flat vector (silence, or a perfectly even spectrum) has no variance and
  // therefore no correlation to report.
  return denominator === 0 ? 0 : covariance / denominator
}

/**
 * Picks the best-matching key for an averaged chroma vector.
 *
 * `chroma` must hold 12 non-negative energies, index 0 = C. Returns null when
 * the vector carries no usable information (all zeros, wrong length, or NaN).
 */
export function detectKeyFromChroma(
  chroma: readonly number[] | Float32Array
): DetectedKey | null {
  if (chroma.length !== 12) {
    return null
  }

  const values = Array.from(chroma, (value) => (Number.isFinite(value) ? value : 0))
  const total = values.reduce((sum, value) => sum + value, 0)

  if (total <= 0) {
    return null
  }

  const candidates: DetectedKey[] = []

  for (let tonic = 0; tonic < 12; tonic += 1) {
    for (const scale of ["major", "minor"] as const) {
      const profile = scale === "major" ? MAJOR_PROFILE : MINOR_PROFILE
      // Expected energy at pitch class p, for this tonic.
      const expected = values.map(
        (_, pitchClass) => profile[(pitchClass - tonic + 12) % 12]
      )

      candidates.push({
        key: PITCH_CLASSES[tonic] + (scale === "minor" ? "m" : ""),
        scale,
        confidence: pearson(values, expected),
        margin: 0,
      })
    }
  }

  candidates.sort((left, right) => right.confidence - left.confidence)

  const [best, runnerUp] = candidates
  return {
    ...best,
    margin: best.confidence - (runnerUp?.confidence ?? 0),
  }
}
