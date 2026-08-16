/**
 * Comparing two different sets.
 *
 * Distinct from `version-diff.ts`, which compares two orders of the *same* set
 * and can match on track id. Two sets are two different rows for the same
 * record, so matching has to happen on what the track *is* — and that is the
 * whole difficulty, because "Nu Zau - Cuando" and "Nu Zau — Cuando (Original
 * Mix)" are the same record to a DJ and different strings to a computer.
 *
 * The question this answers is the residency question: *am I repeating myself?*
 */

export interface ComparableTrack {
  artist: string
  name: string
  position: number
}

export interface SharedTrack {
  artist: string
  name: string
  /** 1-based position in each set, so "early here, late there" is visible. */
  positionA: number
  positionB: number
}

export interface SetComparison {
  shared: SharedTrack[]
  onlyInA: ComparableTrack[]
  onlyInB: ComparableTrack[]
  /** Shared tracks as a share of the smaller set, 0…1. */
  overlapRatio: number
}

/**
 * Suffixes that don't change which record a track is.
 *
 * A DJ who played "Cuando" and later "Cuando (Original Mix)" played the same
 * thing twice, and a residency warning that misses it is worthless. Extended
 * and club mixes are deliberately **not** here: those are different records and
 * a DJ chooses between them on purpose.
 */
const IGNORABLE_SUFFIXES = [
  "original mix",
  "original",
  "radio edit",
  "radio mix",
]

/**
 * Reduces a track to what identifies the record.
 *
 * Lowercased, accents stripped, punctuation flattened, and the noise suffixes
 * removed. Conservative by design: it is far better to miss a repeat than to
 * claim two different records are the same, because the first is a gap in a
 * warning and the second is a wrong accusation the DJ has to disprove.
 */
export function trackKey(artist: string, name: string): string {
  const normalise = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      // Combining marks: "Sí" and "Si" are the same track typed twice.
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()

  let title = normalise(name)

  for (const suffix of IGNORABLE_SUFFIXES) {
    if (title.endsWith(` ${suffix}`)) {
      title = title.slice(0, -(suffix.length + 1)).trim()
      break
    }
  }

  return `${normalise(artist)}::${title}`
}

/** What two sets share, and what only one of them has. */
export function compareSets(
  a: readonly ComparableTrack[],
  b: readonly ComparableTrack[]
): SetComparison {
  const keyed = (tracks: readonly ComparableTrack[]) => {
    const map = new Map<string, ComparableTrack>()

    for (const track of tracks) {
      const key = trackKey(track.artist, track.name)

      // First occurrence wins. A set that plays the same record twice is
      // unusual but possible, and the earlier position is the one that matters
      // for "when did this land".
      if (!map.has(key)) {
        map.set(key, track)
      }
    }

    return map
  }

  const mapA = keyed(a)
  const mapB = keyed(b)

  const shared: SharedTrack[] = []

  for (const [key, track] of mapA) {
    const match = mapB.get(key)

    if (match) {
      shared.push({
        artist: track.artist,
        name: track.name,
        positionA: track.position,
        positionB: match.position,
      })
    }
  }

  shared.sort((x, y) => x.positionA - y.positionA)

  const onlyInA = [...mapA.entries()]
    .filter(([key]) => !mapB.has(key))
    .map(([, track]) => track)
  const onlyInB = [...mapB.entries()]
    .filter(([key]) => !mapA.has(key))
    .map(([, track]) => track)

  // Against the smaller set, not the union: eight shared tracks out of ten is a
  // near-repeat whether the other set has twelve tracks or fifty, and dividing
  // by the union would hide exactly that.
  const smaller = Math.min(mapA.size, mapB.size)

  return {
    shared,
    onlyInA,
    onlyInB,
    overlapRatio: smaller === 0 ? 0 : shared.length / smaller,
  }
}
