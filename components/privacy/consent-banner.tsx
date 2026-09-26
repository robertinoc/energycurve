"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useSyncExternalStore } from "react"

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
  // Resolved on the client because the remembered choice lives in storage and
  // never reaches the server — the same reason the consent answer itself does.
  // An earlier version of this comment blamed prerendering. That reason is
  // stale: these routes are dynamic today. Decision 30 records the check, and
  // the decision to leave this banner client-only does not rest on it.
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
  const asking = isClient && shouldAskForConsent(state)

  // The banner reserves its own space instead of floating over the page.
  //
  // It is `fixed` to the bottom of the viewport, and the F1 audit found what
  // that costs (finding A2): whatever sits at the foot of a page is underneath
  // it, and a click there lands on the banner. A click on the dashboard's
  // import button retried for four minutes against this component's own
  // paragraph. Every first-time visitor sees the banner, so every first-time
  // visitor has a strip of the page they cannot reach.
  //
  // The cure has two halves, both driven by one CSS variable this effect keeps
  // current: `body` gets that much bottom padding, so the page's last controls
  // can scroll up past the banner; and `html` gets that much
  // `scroll-padding-bottom`, so anything scrolled or focused into view lands
  // above it rather than behind it. See `app/globals.css`.
  //
  // Measured rather than hardcoded: the height depends on locale, viewport and
  // wrapping, and a guessed number would be wrong on exactly the narrow screens
  // where the banner is tallest. Cleared on unmount, so answering the question
  // gives the space back.
  const region = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = document.documentElement
    const node = region.current

    if (!asking || !node) {
      root.style.removeProperty("--consent-banner-height")
      return
    }

    const apply = () =>
      root.style.setProperty("--consent-banner-height", `${node.offsetHeight}px`)

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(node)

    return () => {
      observer.disconnect()
      root.style.removeProperty("--consent-banner-height")
    }
  }, [asking])

  if (!asking) {
    return null
  }

  return (
    <div
      ref={region}
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
