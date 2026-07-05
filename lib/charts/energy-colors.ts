/**
 * Semantic energy colors from the EnergyCurve brand kit.
 *
 * Energy 8–10 / peaks   → magenta
 * Energy 5–7 / building → violet
 * Energy 1–4 / low      → indigo
 * Strong close / success → cyan
 * Issues (drop, flat zone, weak ending) → amber
 */
export const ENERGY_COLORS = {
  magenta: "#F0348A",
  violet: "#A24DE0",
  indigo: "#4C6EF5",
  cyan: "#22D3EE",
  amber: "#F5A524",
} as const

/** Color for an energy score on the 1–10 scale. */
export function energyColor(score: number): string {
  if (score >= 8) return ENERGY_COLORS.magenta
  if (score >= 5) return ENERGY_COLORS.violet
  return ENERGY_COLORS.indigo
}

/** Gradient fill for horizontal energy bars, matched to the score's level. */
export function energyBarGradient(score: number): string {
  if (score >= 8)
    return `linear-gradient(90deg, ${ENERGY_COLORS.violet}, ${ENERGY_COLORS.magenta})`
  if (score >= 5)
    return `linear-gradient(90deg, ${ENERGY_COLORS.indigo}, ${ENERGY_COLORS.violet})`
  return `linear-gradient(90deg, ${ENERGY_COLORS.indigo}, ${ENERGY_COLORS.cyan})`
}
