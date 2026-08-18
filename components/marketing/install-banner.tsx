"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { localizedPath } from "@/lib/content/locale-routing"
import type { ResolvedSiteCopy, SiteLocale } from "@/lib/content/site-copy"
import { isStandaloneDisplayMode, type BeforeInstallPromptEvent } from "@/lib/pwa"
import { useIsClient } from "@/lib/use-is-client"

const DISMISS_KEY = "energycurve:install-banner-dismissed"

/**
 * Mobile-only "get the app" banner. Hidden when the page already runs as an
 * installed app or after the user dismissed it once. On Android/Chrome the
 * CTA fires the native install prompt (beforeinstallprompt); everywhere else
 * (iOS Safari has no install API) it links to the /install guide.
 */
export function InstallBanner({
  copy,
  locale,
}: {
  copy: ResolvedSiteCopy["install"]
  locale: SiteLocale
}) {
  // isClient flips to true right after hydration, so the SSR HTML (no banner)
  // always matches the first client render — no hydration mismatch.
  const isClient = useIsClient()
  const [dismissed, setDismissed] = useState(false)
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)

  const visible =
    isClient &&
    !dismissed &&
    !isStandaloneDisplayMode() &&
    window.localStorage.getItem(DISMISS_KEY) !== "1"

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
  }, [])

  if (!visible) {
    return null
  }

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1")
    setDismissed(true)
  }

  const handleNativeInstall = async () => {
    if (!installEvent) {
      return
    }

    await installEvent.prompt()
    const choice = await installEvent.userChoice

    if (choice.outcome === "accepted") {
      dismiss()
    } else {
      // The event can only be used once — fall back to the guide next tap.
      setInstallEvent(null)
    }
  }

  const ctaClasses =
    "ec-gradient-bg shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(120,60,220,0.35)]"

  return (
    <div className="fixed inset-x-4 z-50 md:hidden bottom-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-[#14101F]/95 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur">
        <Image
          src="/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{copy.bannerTitle}</p>
          <p className="mt-0.5 text-xs leading-4 text-white/60">
            {copy.bannerBody}
          </p>
        </div>
        {installEvent ? (
          <button type="button" onClick={handleNativeInstall} className={ctaClasses}>
            {copy.bannerCta}
          </button>
        ) : (
          <Link href={localizedPath("/install", locale)} className={ctaClasses}>
            {copy.bannerCta}
          </Link>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={copy.bannerDismiss}
          className="shrink-0 rounded-full p-1 text-white/40 transition hover:text-white"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
