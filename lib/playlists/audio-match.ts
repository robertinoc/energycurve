/**
 * Matching audio files on disk to tracks already in a playlist.
 *
 * The gap this closes: audio analysis only ever ran while *creating* a playlist
 * from files, so a DJ who pasted a text list had no way to get real BPM or energy
 * for it — and the no-score state added in PR #149 told them to "run the audio
 * analysis on this playlist", which was advice the product couldn't take.
 *
 * The whole risk of this feature lives in this file. A wrong match writes another
 * track's BPM onto a track and nothing looks broken afterwards, which is strictly
 * worse than the missing data it replaces: an absent number is visibly absent, and
 * a confident wrong one silently reshapes the curve, the score and every fix
 * suggested from it.
 *
 * So the rule is: **match only what is unambiguous, and hand everything else back
 * for a person to look at.** No fuzzy distance, no "closest wins", no threshold to
 * tune. Either a normalised comparison is exactly equal and unique, or the track
 * stays untouched.
 */

/** Noise that appears in filenames and tags but isn't part of the title. */
const NOISE = [
  /\(original mix\)/g,
  /\(extended mix\)/g,
  /\(radio edit\)/g,
  /\(free download\)/g,
  /\[free download\]/g,
  /\[[^\]]*premiere[^\]]*\]/g,
  /\(\s*\)/g,
]

/**
 * The one normalisation, used on both sides of every comparison.
 *
 * Accents are folded because a tag written "Sué" and a filename written "Sue" are
 * one track to the person who owns both. Punctuation goes because "Don't" and
 * "Dont" are the same title typed twice. Leading track numbers go because
 * "03 - Artist - Title" is how half of all folders look.
 *
 * What deliberately does NOT happen: no stemming, no dropping of remix names, no
 * ignoring "feat." Those change which *recording* a title refers to — a Boris
 * Brejcha remix is not the original — and folding them would match a track to the
 * wrong version of itself, which is exactly the failure this file exists to avoid.
 */
export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    // Combining marks: é → e.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^\s*\d{1,3}\s*[-._)]\s*/, "")
    .replace(NOISE[0], "")
    .replace(NOISE[1], "")
    .replace(NOISE[2], "")
    .replace(NOISE[3], "")
    .replace(NOISE[4], "")
    .replace(NOISE[5], "")
    .replace(NOISE[6], "")
    // Apostrophes are removed, not spaced: they join a word rather than separate
    // two, so "Don't" has to normalise to "dont" and not "don t" — otherwise a tag
    // written with one and a filename written without never match, which is the
    // common case rather than an edge one. Everything else becomes a space.
    .replace(/['’ʼ`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** A track already in the playlist. */
export interface MatchTarget {
  id: string
  artist: string
  name: string
  /** 1-based, for showing the DJ which row this is. */
  position: number
  /** True when this track already carries a real BPM. */
  hasBpm: boolean
}

/** A file the DJ picked, with whatever its tags said. */
export interface MatchCandidate {
  /** Stable handle for the caller — a filename or an index. */
  key: string
  artist: string
  title: string
}

export type MatchReason =
  /** Artist and title both matched, and only one file did. */
  | "artist_and_title"
  /** Only the title matched, but exactly one file had it. */
  | "title_only"

export interface Matched {
  target: MatchTarget
  candidate: MatchCandidate
  reason: MatchReason
}

export interface MatchResult {
  matched: Matched[]
  /** Tracks with no unambiguous file. Left untouched. */
  unmatchedTracks: MatchTarget[]
  /** Files that matched nothing, or matched ambiguously. */
  unusedFiles: MatchCandidate[]
  /**
   * Tracks more than one file could have been. Reported separately from a plain
   * miss because it is the case a person can resolve by looking, and the case
   * where guessing does the most damage.
   */
  ambiguous: { target: MatchTarget; candidates: MatchCandidate[] }[]
}

const keyOf = (artist: string, title: string) =>
  `${normalizeForMatch(artist)}|${normalizeForMatch(title)}`

/**
 * Pairs tracks with files, conservatively.
 *
 * Two passes, in order of confidence. Artist+title first: if exactly one file has
 * both, that's the match. Then title alone, for the very common case of a tag
 * crediting "Artist A & Artist B" where the playlist says only "Artist A" — but
 * only when exactly one file has that title, since a title alone is a weak key
 * and two files sharing it is precisely when guessing goes wrong.
 *
 * A file is consumed by at most one track, so two tracks that normalise the same
 * can't both claim it; the second becomes ambiguous rather than a duplicate.
 */
export function matchAudioToTracks(
  targets: readonly MatchTarget[],
  candidates: readonly MatchCandidate[]
): MatchResult {
  const byArtistTitle = new Map<string, MatchCandidate[]>()
  const byTitle = new Map<string, MatchCandidate[]>()

  for (const candidate of candidates) {
    const full = keyOf(candidate.artist, candidate.title)
    const title = normalizeForMatch(candidate.title)

    if (title === "") {
      continue
    }

    byArtistTitle.set(full, [...(byArtistTitle.get(full) ?? []), candidate])
    byTitle.set(title, [...(byTitle.get(title) ?? []), candidate])
  }

  const matched: Matched[] = []
  const unmatchedTracks: MatchTarget[] = []
  const ambiguous: MatchResult["ambiguous"] = []
  const taken = new Set<string>()

  for (const target of targets) {
    const full = keyOf(target.artist, target.name)
    const title = normalizeForMatch(target.name)

    const exact = (byArtistTitle.get(full) ?? []).filter(
      (candidate) => !taken.has(candidate.key)
    )

    if (exact.length === 1) {
      taken.add(exact[0].key)
      matched.push({ target, candidate: exact[0], reason: "artist_and_title" })
      continue
    }

    if (exact.length > 1) {
      ambiguous.push({ target, candidates: exact })
      continue
    }

    const byTitleOnly = (byTitle.get(title) ?? []).filter(
      (candidate) => !taken.has(candidate.key)
    )

    if (byTitleOnly.length === 1) {
      taken.add(byTitleOnly[0].key)
      matched.push({
        target,
        candidate: byTitleOnly[0],
        reason: "title_only",
      })
      continue
    }

    if (byTitleOnly.length > 1) {
      ambiguous.push({ target, candidates: byTitleOnly })
      continue
    }

    unmatchedTracks.push(target)
  }

  return {
    matched,
    unmatchedTracks,
    ambiguous,
    unusedFiles: candidates.filter((candidate) => !taken.has(candidate.key)),
  }
}
