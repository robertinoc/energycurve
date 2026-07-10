/**
 * Pure validation for custom context/genre names — client-safe (shared by the
 * server-only taxonomy service and unit tests).
 */

export const CUSTOM_TAXONOMY_LIMIT = 12
export const CUSTOM_NAME_MIN_LENGTH = 2
export const CUSTOM_NAME_MAX_LENGTH = 32

export function normalizeCustomName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ")
}

export function validateCustomName(raw: string): string | null {
  const name = normalizeCustomName(raw)

  if (
    name.length < CUSTOM_NAME_MIN_LENGTH ||
    name.length > CUSTOM_NAME_MAX_LENGTH
  ) {
    return null
  }

  return name
}
