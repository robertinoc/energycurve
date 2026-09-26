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
/**
 * Where the language toggle goes: a `LocalizedPath`, or the two URLs outright.
 *
 * The path form covers every fixed page, whose Spanish URL is derivable. The
 * record form exists for pages whose slug differs per language and that have no
 * index to fall back to — the comparisons. Guides and glossary entries have the
 * same shape but do have an index, and point at it; sending a reader who
 * switched language to a *list* instead of to the same page in their own
 * language is a downgrade those pages accept and these cannot, because there is
 * no list.
 */
export type LocaleToggleTarget = LocalizedPath | Record<SiteLocale, string>

function resolveToggle(target: LocaleToggleTarget, locale: SiteLocale): string {
  return typeof target === "string" ? localizedPath(target, locale) : target[locale]
}

export function useSiteLocale(path: LocaleToggleTarget, locale: SiteLocale) {
  const router = useRouter()
  const redirected = useRef(false)

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
      router.replace(resolveToggle(path, PREFIXED_LOCALE))
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
      router.push(resolveToggle(path, next))
    },
    [locale, path, router]
  )

  return changeLocale
}
