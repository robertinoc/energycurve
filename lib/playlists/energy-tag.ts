/**
 * Reading a per-track energy value out of the tags a DJ already has.
 *
 * Written after an alpha user pointed out the obvious: not everyone uses Mixed
 * In Key. He uses Lexicon DJ, and he asked the two questions this module has to
 * answer — *which tag* do you read, and *what exact string* do you accept.
 *
 * Both previous answers were too narrow. We matched only `Energy <n>` in a
 * single field, so his own examples — `01 Energy`, `1 Energy`, `1.0 Energy` —
 * all read as no energy at all, and anything written to grouping, lyrics or a
 * dedicated ENERGY frame was never looked at.
 *
 * The rule that keeps this honest: **a bare number is only energy in a field
 * where a bare number cannot mean anything else.** A `7` in an ENERGY frame is
 * an energy. A `7` in a comment is a comment. Guessing the second one wrong
 * puts a confident wrong number into the curve, which is worse than a missing
 * one — an absent value is visibly absent.
 */

/**
 * Where an energy value was read from. Ordered by how unambiguous the field is,
 * which is also the precedence order.
 */
export type EnergyTagField =
  | "energy_frame"
  | "comment"
  | "comment2"
  | "grouping"
  | "lyrics"
  | "producer"
  | "composer"
  | "label"

export interface EnergyReading {
  value: number
  field: EnergyTagField
}

/**
 * Fields where the whole value being a small number is itself the signal.
 *
 * `energy_frame` is an ID3 `TXXX:ENERGY` (or Vorbis `ENERGY`) — named for the
 * job, so `7` means seven. The other three are fields whose real content is
 * never a bare one or two digit number: nobody's producer is "7". Comment,
 * grouping and label are excluded on purpose — a bare number there is genuinely
 * ambiguous, and Traktor's own COMMENT2 is used as a free-text second comment.
 */
const BARE_NUMBER_FIELDS = new Set<EnergyTagField>([
  "energy_frame",
  "lyrics",
  "producer",
  "composer",
])

/** Field precedence when more than one carries a readable value. */
const FIELD_ORDER: EnergyTagField[] = [
  "energy_frame",
  "comment",
  "comment2",
  "grouping",
  "lyrics",
  "producer",
  "composer",
  "label",
]

/**
 * The accepted written forms, in precedence order. Every one of these is a
 * shape some tool or DJ actually writes:
 *
 *  - `Energy 7`, `Energy: 7`, `Energy=7`, `Energy 7/10`  (Mixed In Key et al.)
 *  - `7 Energy`, `01 Energy`, `1.0 Energy`               (asked for by name)
 *  - `EnergyLevel 7`, `Energy Level 7`                   (Lexicon-style keys)
 *  - `E7` as the entire field                            (shorthand)
 *
 * Decimals are rounded rather than rejected or truncated: a tool that writes
 * `7.5` means a track between 7 and 8, so it reads as 8 — dropping the value
 * serves nobody, and truncating it to 7 quietly biases every half-step down.
 */
const PATTERNS: RegExp[] = [
  // "Energy 7", "Energy: 7", "energy=7", "Energy Level 7", "EnergyLevel 7"
  /energy\s*(?:level)?\s*[:=-]?\s*(\d{1,2}(?:\.\d+)?)/i,
  // "7 Energy", "01 Energy", "1.0 Energy"
  /(\d{1,2}(?:\.\d+)?)\s*energy/i,
]

/** The whole field is an "E7"-style shorthand. */
const SHORTHAND = /^e\s*[:=-]?\s*(\d{1,2}(?:\.\d+)?)$/i

/** The whole field is nothing but a number. */
const BARE = /^(\d{1,2}(?:\.\d+)?)$/

function clamp(raw: string): number | null {
  const value = Math.round(Number.parseFloat(raw))

  // A 1-10 scale. Values outside it are somebody else's scale (0-100 loudness,
  // a year, a track number) and reading them as energy would be a guess.
  return Number.isFinite(value) && value >= 1 && value <= 10 ? value : null
}

/**
 * Reads an energy value out of one field's text.
 *
 * `allowBareNumber` is the caller's assertion that this field cannot mean
 * anything else — see BARE_NUMBER_FIELDS. Default false, so a comment of "7"
 * reads as no energy.
 */
export function extractEnergyValue(
  text: string | null | undefined,
  { allowBareNumber = false }: { allowBareNumber?: boolean } = {}
): number | null {
  if (!text) {
    return null
  }

  const value = text.trim()

  if (!value) {
    return null
  }

  for (const pattern of PATTERNS) {
    const match = value.match(pattern)

    if (match) {
      const parsed = clamp(match[1])

      if (parsed !== null) {
        return parsed
      }
    }
  }

  const shorthand = value.match(SHORTHAND)

  if (shorthand) {
    return clamp(shorthand[1])
  }

  if (allowBareNumber) {
    const bare = value.match(BARE)

    if (bare) {
      return clamp(bare[1])
    }
  }

  return null
}

/**
 * Reads energy from whichever of a track's fields carries it, reporting which
 * one so the UI can say where the number came from instead of presenting it as
 * if it fell out of the sky.
 *
 * A field named ENERGY settles it outright. Failing that, an explicit written
 * form anywhere beats a bare number everywhere: a comment saying "Energy 8"
 * wins over a producer field that happens to contain "3".
 */
export function readEnergyTag(
  fields: Partial<Record<EnergyTagField, string | null | undefined>>
): EnergyReading | null {
  // A field literally named ENERGY is authoritative, in any written form. It
  // is the only field whose whole purpose is this number, so it does not
  // compete with the others — it settles the question.
  const frame = extractEnergyValue(fields.energy_frame, {
    allowBareNumber: true,
  })

  if (frame !== null) {
    return { value: frame, field: "energy_frame" }
  }

  const rest = FIELD_ORDER.filter((field) => field !== "energy_frame")

  for (const field of rest) {
    const value = extractEnergyValue(fields[field], { allowBareNumber: false })

    if (value !== null) {
      return { value, field }
    }
  }

  for (const field of rest) {
    if (!BARE_NUMBER_FIELDS.has(field)) {
      continue
    }

    const value = extractEnergyValue(fields[field], { allowBareNumber: true })

    if (value !== null) {
      return { value, field }
    }
  }

  return null
}

export function isEnergyTagField(
  value: string | null | undefined
): value is EnergyTagField {
  return FIELD_ORDER.includes(value as EnergyTagField)
}
