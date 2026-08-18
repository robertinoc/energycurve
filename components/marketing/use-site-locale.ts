"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"

import {
  localizedPath,
  PREFIXED_LOCALE,
  type LocalizedPath,
} from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  persistSiteLocale,
  readStoredSiteLocale,
} from "@/lib/content/site-locale"

/**
 * Language behaviour for a marketing page, now that the URL says which language
 * it is.
 *
 * Two rules, and the first is the one worth reading twice:
 *
 * **The stored preference is only written when the visitor actually asks.**
 * `persistSiteLocale` doesn't just remember a marketing preference — it writes
 * the app cookie that the server-rendered dashboard and every transactional
 * email read. So persisting whatever language the current URL happens to be
 * would mean a Spanish-speaking customer who opens `energycurve.app` gets their
 * dashboard and their receipts silently switched to English by the visit. Landing
 * on a URL is not a choice; clicking the toggle is.
 *
 * **Only the default URL adapts to the stored preference.** Someone who chose
 * Spanish and later opens the bare domain is sent to `/es`, which is what used to
 * happen when the language lived in `localStorage` alone. The reverse never
 * happens: an `/es` link was chosen deliberately — possibly by whoever shared it
 * — and bouncing it to English because of a cookie on this machine would make
 * Spanish links unshareable.
 */
export function useSiteLocale(path: LocalizedPath, locale: SiteLocale) {
  const router = useRouter()
  const redirected = useRef(false)

  useEffect(() => {
    /**
     * `<html lang>` lives in the root layout, which cannot know the route.
     * Deriving it server-side would mean reading the request in that layout, and
     * that opts **every** page in the app out of static rendering — a real cost
     * on every request, paid for an attribute Google explicitly ignores when
     * deciding a page's language (it uses `hreflang` and the visible copy, both
     * of which are correct in the served HTML).
     *
     * So it is corrected here instead. The value that matters is the one screen
     * readers announce, and they read the live attribute.
     */
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    // Guarded by a ref rather than an empty dep array so a fast double-mount in
    // development can't fire two navigations.
    if (redirected.current || locale === PREFIXED_LOCALE) {
      return
    }
    redirected.current = true

    if (readStoredSiteLocale() === PREFIXED_LOCALE) {
      // replace, not push: the English URL the visitor never wanted shouldn't
      // become the thing their back button returns to.
      router.replace(localizedPath(path, PREFIXED_LOCALE))
    }
  }, [locale, path, router])

  const changeLocale = useCallback(
    (next: SiteLocale) => {
      if (next === locale) {
        return
      }

      // Written before navigating so the destination — and the dashboard, and the
      // next email — already agree with the choice.
      persistSiteLocale(next)
      router.push(localizedPath(path, next))
    },
    [locale, path, router]
  )

  return changeLocale
}
