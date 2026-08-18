"use client"

import { useEffect, useState } from "react"
import { Check, WifiOff } from "lucide-react"

import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Registers the service worker that makes this set openable without signal.
 *
 * Mounted from the Gig Mode page rather than the root layout on purpose. A
 * service worker registered app-wide would be a caching layer over every screen,
 * which is a much larger claim than the one feature that needs it — and a caching
 * bug in a booth is the worst place to discover one. Registering it here means the
 * worker only ever exists for someone who opened Gig Mode.
 *
 * The badge is deliberately quiet: it confirms the set is saved, and says nothing
 * at all on a browser without service workers, because "your browser can't do
 * offline" is not something to tell a DJ thirty seconds before they play.
 */
export function GigOfflineRegistrar({ locale }: { locale: SiteLocale }) {
  const [ready, setReady] = useState(false)
  const copy = DASHBOARD_COPY.gigMode

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    let cancelled = false

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (registration) => {
        // `active` is what matters, not `installing`: until the worker is active
        // it isn't intercepting anything, so claiming "saved for offline" would be
        // a promise the next reload wouldn't keep.
        if (registration.active && !cancelled) {
          setReady(true)
          return
        }

        await navigator.serviceWorker.ready
        if (!cancelled) {
          setReady(true)
        }
      })
      .catch(() => {
        // Registration fails on an insecure origin and in some private modes.
        // Gig Mode works fine without it; only the offline reload is lost.
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return null
  }

  return (
    <p className="inline-flex items-center gap-1.5 self-center rounded-full bg-white/[0.05] px-2.5 py-1 text-[0.68rem] text-white/45">
      <Check className="size-3 text-emerald-400" />
      <WifiOff className="size-3" />
      {copy.offlineReady[locale]}
    </p>
  )
}
