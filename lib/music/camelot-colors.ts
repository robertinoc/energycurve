/**
 * Camelot wheel colours.
 *
 * Contributed by an alpha user from the reference file he uses for his own
 * tooling. The palette walks the wheel — red through purple, blue, green,
 * yellow, orange — with the minor (A) ring darker than its major (B) partner,
 * which is the structure that makes two adjacent keys read as adjacent.
 *
 * Keyed by Camelot code, so it is unaffected by the tonality errors in rows
 * 3A-7B of the table it came from: those were in the key-name column, not in
 * the wheel position these colours attach to.
 *
 * **Off by default, and deliberately not used in the tracklist.** Sorting a
 * table by key would line the colours up and imply a harmonically optimal set,
 * which is false — see docs/decisions.md. The transition view has no sort and
 * is about adjacency, which is exactly what the colours encode, so it is the
 * one place where showing them says something true.
 */
export const CAMELOT_COLORS: Record<string, string> = {
  "1A": "#CC2900", "1B": "#FF3300",
  "2A": "#CC0052", "2B": "#FF0066",
  "3A": "#8800CC", "3B": "#CC00FF",
  "4A": "#4400CC", "4B": "#6600FF",
  "5A": "#0022B3", "5B": "#0033FF",
  "6A": "#0066CC", "6B": "#0099FF",
  "7A": "#0099B3", "7B": "#00E5FF",
  "8A": "#0088FF", "8B": "#00D2FF",
  "9A": "#00B386", "9B": "#00FFC8",
  "10A": "#55B300", "10B": "#77FF00",
  "11A": "#CCA600", "11B": "#FFEA00",
  "12A": "#CC7A00", "12B": "#FF9900",
}

/** The wheel colour for a Camelot code, or null when it isn't one. */
export function camelotColor(camelot: string | null | undefined): string | null {
  return camelot ? (CAMELOT_COLORS[camelot.trim().toUpperCase()] ?? null) : null
}
