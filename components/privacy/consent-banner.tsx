"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"

import { shouldAskForConsent, writeConsent } from "@/lib/privacy/consent"
import { useIsClient } from "@/lib/use-is-client"
import { useConsent } from "@/lib/privacy/use-consent"
import { getSiteCopy, type SiteLocale } from "@/lib/content/site-copy"
import { readStoredSiteLocale } from "@/lib/content/site-locale"

/**
 * The analytics consent banner.
 *
 * Three things about its shape are deliberate and should survive a redesign:
 *
 * **Accept and reject are the same button.** Same size, same colour, same
 * position. A "reject" that is smaller, greyer, or one click further away is a
 * dark pattern with a legal name, and the whole point of asking is lost if the
 * answer is nudged.
 *
 * **It does not trap the page.** No overlay, no scroll lock, nothing to
 * dismiss before reading. Someone who wants to read the privacy policy before
 * deciding can walk to it, and someone who ignores the banner entirely is
 * simply never tracked — which is the correct default, not a problem to solve.
 *
 * **It renders nothing on the server.** The answer lives in `localStorage`, so
 * a server render would either flash the banner at people who already answered
 * or guess wrong. Mounting decides.
 */
export function ConsentBanner() {
  const pathname = usePathname()
  const state = useConsent()
  const isClient = useIsClient()

  // Same order the rest of the site resolves language in: the URL says it
  // outright on /es, otherwise fall back to what the visitor chose before.
  // Resolved on the client because the root layout is deliberately static —
  // reading the request there would opt every page out of prerendering.
  const stored = useSyncExternalStore(subscribeToStorage, readStoredSiteLocale, () => null)
  const locale: SiteLocale = pathname?.startsWith("/es") ? "es" : (stored ?? "en")

  const copy = getSiteCopy(locale).consent

  // `useIsClient` is load-bearing, and the first version of this file got it
  // wrong. The server snapshot of the consent store is "unset", and "unset"
  // means *ask* — so without this the banner was rendered into the HTML of every
  // page and then removed on hydration. Verified against the built server
  // output: the copy was in the response body.
  //
  // That is a flash of a cookie banner for everyone who already answered, and
  // for everyone sending Do Not Track, since neither storage nor the DNT signal
  // is readable on the server. The question only exists once there is a browser
  // to answer it.
  if (!isClient || !shouldAskForConsent(state)) {
    return null
  }

  return (
    <div
      // `polite`, not `alert`: this is a question, not an emergency, and it
      // should not interrupt whatever a screen reader is already saying.
      role="region"
      aria-live="polite"
      aria-label={copy.title}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0C0917]/98 px-4 py-4 backdrop-blur sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex-1">
          <p className="font-heading text-sm font-semibold text-white">
            {copy.title}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-white/62">
            {copy.body}
          </p>
          <Link
            href={locale === "es" ? "/es/cookie-policy" : "/cookie-policy"}
            className="mt-1 inline-block text-[12px] text-white/50 underline underline-offset-4 transition hover:text-white/75"
          >
            {copy.policyLink}
          </Link>
        </div>

        {/*
          Identical classes on both buttons, on purpose. If a future change gives
          one of them a fill or a brand colour, the banner stops being a question
          and starts being a suggestion.
        */}
        <div className="flex shrink-0 gap-2 sm:pt-1">
          <button
            type="button"
            onClick={() => writeConsent("denied")}
            className="rounded-full border border-white/16 px-4 py-2 text-[13px] font-medium text-white transition hover:border-white/30 hover:bg-white/5"
          >
            {copy.reject}
          </button>
          <button
            type="button"
            onClick={() => writeConsent("granted")}
            className="rounded-full border border-white/16 px-4 py-2 text-[13px] font-medium text-white transition hover:border-white/30 hover:bg-white/5"
          >
            {copy.accept}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Storage is the only thing that changes the remembered language. */
function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}
