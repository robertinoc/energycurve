import { beforeEach, describe, expect, it, vi } from "vitest"

import { ANALYSIS_LOCALE_COOKIE } from "@/lib/analysis-locale"
import {
  persistSiteLocale,
  readStoredSiteLocale,
  SITE_LOCALE_STORAGE_KEY,
} from "@/lib/content/site-locale"

/**
 * The locale write path used to be copy-pasted into four marketing components
 * and only one of them set `<html lang>`, so /pricing, /terms and /privacy
 * served Spanish copy while declaring English. These assertions exist so the
 * three side effects can't drift apart again.
 */
describe("persistSiteLocale", () => {
  beforeEach(() => {
    const store = new Map<string, string>()

    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    })
    vi.stubGlobal("document", { cookie: "", documentElement: { lang: "en" } })
  })

  it("writes localStorage, the app cookie and <html lang> together", () => {
    persistSiteLocale("es")

    expect(window.localStorage.getItem(SITE_LOCALE_STORAGE_KEY)).toBe("es")
    expect(document.cookie).toContain(`${ANALYSIS_LOCALE_COOKIE}=es`)
    expect(document.documentElement.lang).toBe("es")
  })

  it("moves <html lang> back when the reader switches to English", () => {
    persistSiteLocale("es")
    persistSiteLocale("en")

    expect(document.documentElement.lang).toBe("en")
    expect(window.localStorage.getItem(SITE_LOCALE_STORAGE_KEY)).toBe("en")
  })

  it("round-trips through readStoredSiteLocale", () => {
    persistSiteLocale("es")
    expect(readStoredSiteLocale()).toBe("es")

    persistSiteLocale("en")
    // Anything that isn't an explicit "es" reads as "no Spanish preference".
    expect(readStoredSiteLocale()).toBeNull()
  })
})
