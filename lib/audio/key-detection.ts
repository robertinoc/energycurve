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
 * Reference key profiles: the expected prominence of each scale degree relative
 * to a tonic. Index 0 is the tonic.
 *
 * Two sets, selectable, because which one is right here is an empirical question
 * we have not yet answered — and the spike says the answer matters. Key detection
 * currently sits at **21% (3/14)** against Mixed In Key tags, and the failures are
 * consistently *major/minor confusion*: a plausible tonic with the wrong mode.
 * Since the only thing that distinguishes a major from a minor candidate is the
 * shape of these two vectors, they are the prime suspect.
 *
 * - **krumhansl** — Krumhansl & Kessler probe-tone ratings, from Krumhansl (1990),
 *   *Cognitive Foundations of Musical Pitch*. Gathered by asking listeners how well
 *   a probe tone fitted a preceding context, using Western *classical* material.
 *   The current default, and the profile the 21% was measured with.
 * - **temperley** — Temperley's Kostka-Payne-derived profiles (*Music and
 *   Probability*, 2007), estimated from note counts in a corpus of tonal music
 *   rather than from listener ratings. Widely reported to separate the modes more
 *   sharply, which is exactly the axis we are failing on.
 *
 * Not defaulted to `temperley` on that reputation alone. Correlation is
 * scale-invariant, so only the *shape* of each vector matters here — but which
 * shape wins on bass-heavy dance music is for the harness to measure, not for this
 * comment to assert. See docs/spike-browser-audio-analysis.md.
 */
export const KEY_PROFILES = {
  krumhansl: {
    major: [
      6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
    ],
    minor: [
      6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
    ],
  },
  temperley: {
    major: [
      0.748, 0.06, 0.488, 0.082, 0.67, 0.46, 0.096, 0.715, 0.104, 0.366, 0.057,
      0.4,
    ],
    minor: [
      0.712, 0.084, 0.474, 0.618, 0.049, 0.46, 0.105, 0.747, 0.404, 0.067,
      0.133, 0.33,
    ],
  },
} as const

export type KeyProfileSet = keyof typeof KEY_PROFILES

/** What the detector uses when a caller doesn't choose — see KEY_PROFILES. */
export const DEFAULT_KEY_PROFILES: KeyProfileSet = "krumhansl"

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
  chroma: readonly number[] | Float32Array,
  profiles: KeyProfileSet = DEFAULT_KEY_PROFILES
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
      const profile = KEY_PROFILES[profiles][scale]
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

export interface VotedKey extends DetectedKey {
  /**
   * Share of segments that chose this key, 0…1.
   *
   * This is the honest confidence signal, and the reason voting exists. Pearson
   * correlation against an averaged chroma routinely reported 0.4–0.85 while being
   * *wrong about the mode* — high confidence in the wrong answer, because averaging
   * a whole track flattens exactly the tonal movement that would have exposed the
   * disagreement. Agreement can't do that: three windows that each pick a different
   * key report 0.33 and say so.
   */
  agreement: number
  /** Segments that produced a usable vote. */
  segmentsCounted: number
}

/**
 * Picks a key by letting each analysed window vote, instead of averaging the whole
 * track into one chroma and reading that.
 *
 * The spike's second recommended fix. A DJ track is not tonally uniform — an intro
 * can be atonal percussion, a breakdown can borrow from the relative major — so one
 * average over five minutes is a summary of things that disagree, and it produces a
 * confident answer with no way to tell that they disagreed.
 *
 * Winner is the most-voted key, broken by summed confidence when votes tie. The
 * returned `confidence` and `margin` are the winner's mean across the segments that
 * chose it, so they describe the answer rather than an artefact of averaging.
 *
 * Falls back to a single detection when there's only one segment, which keeps a
 * short track — analysed whole, see sample-windows.ts — behaving exactly as before.
 */
export function detectKeyByVote(
  segments: readonly (readonly number[] | Float32Array)[],
  profiles: KeyProfileSet = DEFAULT_KEY_PROFILES
): VotedKey | null {
  const votes = segments
    .map((chroma) => detectKeyFromChroma(chroma, profiles))
    .filter((vote): vote is DetectedKey => vote !== null)

  if (votes.length === 0) {
    return null
  }

  const tally = new Map<string, DetectedKey[]>()
  for (const vote of votes) {
    const existing = tally.get(vote.key)
    if (existing) {
      existing.push(vote)
    } else {
      tally.set(vote.key, [vote])
    }
  }

  const ranked = [...tally.values()].sort((left, right) => {
    if (right.length !== left.length) {
      return right.length - left.length
    }
    // Same number of votes: the key its voters were more sure of wins.
    const sum = (group: DetectedKey[]) =>
      group.reduce((total, vote) => total + vote.confidence, 0)
    return sum(right) - sum(left)
  })

  const winner = ranked[0]
  const mean = (pick: (vote: DetectedKey) => number) =>
    winner.reduce((total, vote) => total + pick(vote), 0) / winner.length

  return {
    key: winner[0].key,
    scale: winner[0].scale,
    confidence: mean((vote) => vote.confidence),
    margin: mean((vote) => vote.margin),
    agreement: winner.length / votes.length,
    segmentsCounted: votes.length,
  }
}
