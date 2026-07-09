/**
 * Optional tracklist columns the DJ can toggle on (like Rekordbox's column
 * chooser). The base columns (#, Energy, Artist, Title, BPM, Camelot, Key) are
 * always shown and not represented here.
 *
 * Pure helpers so the localStorage read/write in the client component stays a
 * thin wrapper and the parsing is unit-tested.
 */

export const OPTIONAL_COLUMNS = ["genre", "duration", "comment"] as const
export type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number]

export const OPTIONAL_COLUMN_LABELS: Record<OptionalColumn, string> = {
  genre: "Genre",
  duration: "Time",
  comment: "Comment",
}

export const COLUMN_PREFS_STORAGE_KEY = "energycurve.tracklist.columns"

function isOptionalColumn(value: unknown): value is OptionalColumn {
  return (
    typeof value === "string" &&
    (OPTIONAL_COLUMNS as readonly string[]).includes(value)
  )
}

/**
 * Normalizes an untrusted stored value (parsed JSON, possibly stale/garbage)
 * into a clean, de-duplicated list of valid optional columns in canonical
 * order. Returns [] for anything unusable.
 */
export function normalizeColumnPrefs(raw: unknown): OptionalColumn[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const chosen = new Set(raw.filter(isOptionalColumn))
  return OPTIONAL_COLUMNS.filter((col) => chosen.has(col))
}

/** Parses a raw localStorage string into normalized column prefs (safe). */
export function parseColumnPrefs(stored: string | null): OptionalColumn[] {
  if (!stored) {
    return []
  }
  try {
    return normalizeColumnPrefs(JSON.parse(stored))
  } catch {
    return []
  }
}
