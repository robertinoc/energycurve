/**
 * Country display helpers — StageLink's country.ts, verbatim pattern: the
 * flag is the two regional-indicator codepoints (no library, no images), the
 * name comes from Intl.DisplayNames. Pure and client-safe.
 */

const REGIONAL_INDICATOR_A = 0x1f1e6

export function countryFlagEmoji(code: string): string {
  const upper = code.trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(upper)) {
    return ""
  }

  return [...upper]
    .map((char) =>
      String.fromCodePoint(char.charCodeAt(0) - 65 + REGIONAL_INDICATOR_A)
    )
    .join("")
}

export function countryName(code: string, locale = "en"): string {
  const upper = code.trim().toUpperCase()

  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(upper) ?? upper
    )
  } catch {
    return upper
  }
}
