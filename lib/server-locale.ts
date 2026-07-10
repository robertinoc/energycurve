import "server-only"

import { cookies } from "next/headers"

import { ANALYSIS_LOCALE_COOKIE, toSiteLocale } from "@/lib/analysis-locale"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Resolves the request's UI language from the locale cookie. Usable from
 * server components AND server actions — the single entry point so every
 * dashboard surface (and every action message) agrees on the language.
 */
export async function getRequestLocale(): Promise<SiteLocale> {
  const store = await cookies()

  return toSiteLocale(store.get(ANALYSIS_LOCALE_COOKIE)?.value)
}
