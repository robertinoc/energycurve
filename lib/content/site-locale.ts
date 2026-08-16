import { ANALYSIS_LOCALE_COOKIE } from "@/lib/analysis-locale"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * One home for the marketing-side locale choice.
 *
 * The key and the persistence steps used to be copy-pasted into every public
 * page (landing, pricing, legal, install). They drifted: only the landing ever
 * set `document.documentElement.lang`, so /pricing, /terms and /privacy served
 * Spanish copy while still declaring `lang="en"` — wrong for screen readers and
 * for anything that sniffs the document language. Keeping the write path in one
 * function is what stops that from happening again.
 */
export const SITE_LOCALE_STORAGE_KEY = "energycurve:locale"

/** Reads the stored choice. Safe to call on the server, where it returns null. */
export function readStoredSiteLocale(): SiteLocale | null {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(SITE_LOCALE_STORAGE_KEY) === "es"
    ? "es"
    : null
}

/**
 * Persists the choice everywhere it has to be visible:
 *
 * - `localStorage`, so the next marketing page render picks it up;
 * - the app cookie, so the server-rendered dashboard agrees with the landing;
 * - `<html lang>`, so assistive tech announces the right language.
 */
export function persistSiteLocale(locale: SiteLocale) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SITE_LOCALE_STORAGE_KEY, locale)
  document.cookie = `${ANALYSIS_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
  document.documentElement.lang = locale
}
