/**
 * Filling in BPM and key by looking a track up by name.
 *
 * The gap this closes is the other half of the missing-data problem. PR #158 lets
 * a DJ who *has* the audio files measure them; this is for the DJ who doesn't —
 * someone who pasted a tracklist from a chat, or whose files are on the studio
 * machine. Without either, `estimatedScoreFromPosition` invents the number and
 * the score gets withheld.
 *
 * ## What leaves the machine, and what doesn't
 *
 * The audio promise is unchanged and unchangeable: **no audio is ever uploaded**,
 * here or anywhere. But this does send **artist and title** to a third party, and
 * that is user data leaving the machine, so it is opt-in per playlist rather than
 * a background nicety, and the copy says who receives it before the DJ agrees.
 *
 * ## Why GetSongBPM
 *
 * Free, 3,000 requests an hour, no card. The cost is a **mandatory visible
 * backlink** to getsongbpm.com — their terms suspend accounts without notice if it
 * disappears. That's the trade, decided with Robertino: the alternatives are paid
 * plans whose price scales with usage, for data that is a convenience rather than
 * the product.
 *
 * The parsing and matching here are pure. The network call is in
 * services/title-lookup-service.ts, because a function that both fetches and
 * decides is a function you can only test by mocking fetch.
 */

/** Their response shape, as far as we rely on it. Everything else is ignored. */
export interface RawLookupSong {
  title?: unknown
  artist?: { name?: unknown } | unknown
  tempo?: unknown
  key_of?: unknown
}

export interface LookupResult {
  /** Beats per minute, or null when the entry had none. */
  bpm: number | null
  /** Musical key as they write it, or null. */
  musicalKey: string | null
  /** What their entry says, so the caller can show what it matched. */
  matchedArtist: string
  matchedTitle: string
}

/**
 * Plausible tempo range for a returned value.
 *
 * Their corpus is crowd-contributed and contains obvious nonsense — 0, and
 * three-digit values that are really a duration in seconds. A number outside this
 * band is dropped rather than written, because a wrong BPM reshapes the curve and
 * looks like data.
 */
const BPM_RANGE = { min: 40, max: 220 } as const

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Reads one of their song entries.
 *
 * Returns null rather than a partially-filled result when there's no usable
 * tempo *and* no usable key: an entry that matched but carries neither is the
 * same outcome as no match, and reporting it as a match would tell the DJ we
 * found something useful when we didn't.
 */
export function parseLookupSong(raw: RawLookupSong): LookupResult | null {
  const title = asString(raw.title)

  if (title === "") {
    return null
  }

  const artistObject =
    raw.artist && typeof raw.artist === "object"
      ? (raw.artist as { name?: unknown })
      : null

  // Their tempo arrives as a string in most responses and a number in some.
  const tempo = Number(
    typeof raw.tempo === "string" || typeof raw.tempo === "number"
      ? raw.tempo
      : Number.NaN
  )

  const bpm =
    Number.isFinite(tempo) && tempo >= BPM_RANGE.min && tempo <= BPM_RANGE.max
      ? Math.round(tempo)
      : null

  const keyText = asString(raw.key_of)
  const musicalKey = keyText === "" ? null : keyText

  if (bpm === null && musicalKey === null) {
    return null
  }

  return {
    bpm,
    musicalKey,
    matchedArtist: asString(artistObject?.name),
    matchedTitle: title,
  }
}

/**
 * Picks the one entry that is unambiguously the track we asked about.
 *
 * Reuses the normalisation from the audio matcher for the same reason it exists
 * there: a wrong match writes another track's BPM onto a track and nothing looks
 * broken afterwards. Two entries whose artist and title both normalise to what we
 * searched is a tie, and a tie is refused rather than resolved by order — their
 * ranking is not ours to trust.
 */
export function chooseLookupMatch(
  artist: string,
  title: string,
  candidates: readonly LookupResult[],
  normalize: (value: string) => string
): LookupResult | null {
  const wantArtist = normalize(artist)
  const wantTitle = normalize(title)

  const exact = candidates.filter(
    (candidate) =>
      normalize(candidate.matchedTitle) === wantTitle &&
      normalize(candidate.matchedArtist) === wantArtist
  )

  if (exact.length === 1) {
    return exact[0]
  }

  if (exact.length > 1) {
    return null
  }

  // Title-only, same as the audio matcher: their artist strings routinely credit
  // collaborators the playlist doesn't name. Still refused on a tie.
  const byTitle = candidates.filter(
    (candidate) => normalize(candidate.matchedTitle) === wantTitle
  )

  return byTitle.length === 1 ? byTitle[0] : null
}

/**
 * The search string.
 *
 * Their API wants `artist:X track:Y`. Colons and commas inside a field break the
 * lookup rather than narrowing it, so they're stripped — a title with a colon
 * returns nothing at all otherwise, which reads as "not in their database" when
 * it isn't.
 */
export function buildLookupQuery(artist: string, title: string): string | null {
  // Whitespace is collapsed after the substitution, not before: "A, B" would
  // otherwise become "A  B", and a double space is a second thing their parser
  // handles differently from what we meant.
  const clean = (value: string) =>
    value.replace(/[:,]/g, " ").replace(/\s+/g, " ").trim()
  const a = clean(artist)
  const t = clean(title)

  if (t === "") {
    return null
  }

  return a === "" ? `track:${t}` : `artist:${a} track:${t}`
}
