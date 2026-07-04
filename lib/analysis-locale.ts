import { supportedLocales, type SiteLocale } from "@/lib/content/site-copy"

/** Cookie holding the preferred language for analysis recommendations. */
export const ANALYSIS_LOCALE_COOKIE = "energycurve_locale"

export function toSiteLocale(value: string | undefined): SiteLocale {
  return supportedLocales.includes(value as SiteLocale)
    ? (value as SiteLocale)
    : "en"
}
