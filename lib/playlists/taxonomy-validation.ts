/**
 * Pure validation for custom context/genre names — client-safe (shared by the
 * server-only taxonomy service and unit tests).
 */

// The custom-taxonomy cap is per plan and lives in PLAN_LIMITS; it used to be a
// flat 12 here, applied per kind, which contradicted both. See
// services/taxonomy-service.ts::taxonomyUsage.
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

/**
 * Whether a profile may create one more custom label.
 *
 * At or over the cap blocks *creation* and nothing else: everything already
 * saved stays visible and usable. A user who ends up above a limit (by
 * downgrading, or because a limit tightened) keeps their work — the alternative
 * is holding their own data hostage to a plan change.
 *
 * `null` means unlimited, the same convention `PlanLimits` uses.
 */
export function atTaxonomyLimit(usage: {
  used: number
  limit: number | null
}): boolean {
  return usage.limit !== null && usage.used >= usage.limit
}
