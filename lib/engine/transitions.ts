/**
 * Rating one mix, and naming a better track for it.
 *
 * The engine already judges a set as a shape. This judges it as a sequence of
 * mixes — which is what the DJ is actually doing at 3am, one transition at a
 * time. Two things decide whether a mix works: whether the keys sit together,
 * and whether the energy step is one the genre tolerates.
 *
 * Diagnosing a bad transition is only half of it. "Track 7 into 8 clashes" is
 * a complaint; "and track 12 would fit there" is advice, and the second one is
 * what a DJ can act on without re-listening to their whole library.
 */

import {
  GENRE_TRANSITION_TOLERANCE_V2,
  type SupportedGenre,
} from "@/lib/product/strategy"
import { harmonicTier, type HarmonicTier } from "@/lib/music/camelot"

export interface TransitionTrack {
  id: string
  position: number
  artist: string
  name: string
  camelot: string | null
  energy: number
}

export type TransitionVerdict = "good" | "workable" | "rough"

export interface RatedTransition {
  fromPosition: number
  toPosition: number
  verdict: TransitionVerdict
  tier: HarmonicTier
  /** Energy step, signed. Positive is a lift. */
  delta: number
  /** How far past the genre's comfort the step goes. Zero when inside it. */
  excess: number
  /**
   * A track already in this set that would mix better here, when one exists
   * and the transition needs help.
   */
  betterFit: TransitionTrack | null
}

/** How far past the genre's tolerance an energy step reaches. */
function energyExcess(
  delta: number,
  genre: SupportedGenre
): number {
  const tolerance = GENRE_TRANSITION_TOLERANCE_V2[genre]
  const allowed = delta >= 0 ? tolerance.rise : tolerance.drop

  return Math.max(0, Math.abs(delta) - allowed)
}

/**
 * Whether a mix works, from its key relationship and its energy step.
 *
 * A clash is rough whatever the energy does — two keys fighting is audible in a
 * way a slightly large step isn't. Beyond that, an energy step past the genre's
 * comfort downgrades a mix by one notch rather than condemning it: DJs make
 * big steps deliberately, and calling every one of them a mistake is how a tool
 * gets ignored.
 *
 * `unknown` — a track with no key — is never rough. We don't know, and guessing
 * would put a warning on half of most libraries.
 */
export function rateTransition(
  tier: HarmonicTier,
  delta: number,
  genre: SupportedGenre
): { verdict: TransitionVerdict; excess: number } {
  const excess = energyExcess(delta, genre)

  if (tier === "clash") {
    return { verdict: "rough", excess }
  }

  if (tier === "unknown") {
    return { verdict: excess > 0 ? "workable" : "good", excess }
  }

  if (excess > 0) {
    return { verdict: tier === "boost" ? "rough" : "workable", excess }
  }

  return { verdict: tier === "boost" ? "workable" : "good", excess }
}

/**
 * Rates every mix in the set, and for the ones that need help, names a track
 * already in the set that would sit better.
 *
 * The replacement is drawn from the same set on purpose. Suggesting a record
 * the DJ doesn't own is useless, and the set is the pool they've already
 * decided to play from.
 */
export function rateTransitions(
  tracks: readonly TransitionTrack[],
  genre: SupportedGenre
): RatedTransition[] {
  const rated: RatedTransition[] = []

  for (let i = 0; i < tracks.length - 1; i += 1) {
    const from = tracks[i]
    const to = tracks[i + 1]
    const tier = harmonicTier(from.camelot, to.camelot)
    const delta = to.energy - from.energy
    const { verdict, excess } = rateTransition(tier, delta, genre)

    rated.push({
      fromPosition: from.position,
      toPosition: to.position,
      verdict,
      tier,
      delta,
      excess,
      betterFit:
        verdict === "good"
          ? null
          : findBetterFit(from, to, tracks, genre),
    })
  }

  return rated
}

/**
 * The best replacement for the track being mixed into.
 *
 * Scored on the same rules that judged the original, so a suggestion can never
 * be worse than what it replaces — it's only returned when it rates strictly
 * better. Neighbours are excluded: proposing the track already on either side
 * is proposing to do nothing.
 */
function findBetterFit(
  from: TransitionTrack,
  to: TransitionTrack,
  tracks: readonly TransitionTrack[],
  genre: SupportedGenre
): TransitionTrack | null {
  const rank: Record<TransitionVerdict, number> = {
    good: 2,
    workable: 1,
    rough: 0,
  }

  const currentTier = harmonicTier(from.camelot, to.camelot)
  const current = rateTransition(currentTier, to.energy - from.energy, genre)

  let best: { track: TransitionTrack; score: number; excess: number } | null =
    null

  for (const candidate of tracks) {
    if (
      candidate.id === from.id ||
      candidate.id === to.id ||
      candidate.position === from.position - 1
    ) {
      continue
    }

    const tier = harmonicTier(from.camelot, candidate.camelot)
    const result = rateTransition(
      tier,
      candidate.energy - from.energy,
      genre
    )

    if (rank[result.verdict] <= rank[current.verdict]) {
      continue
    }

    // Among equally-rated candidates, the smallest energy step wins: it's the
    // one that changes the set's shape least, and the shape was already scored.
    if (
      !best ||
      rank[result.verdict] > best.score ||
      (rank[result.verdict] === best.score && result.excess < best.excess)
    ) {
      best = {
        track: candidate,
        score: rank[result.verdict],
        excess: result.excess,
      }
    }
  }

  return best?.track ?? null
}
