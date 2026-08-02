"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TriangleAlert } from "lucide-react"

import { ANALYSIS_LOCALE_COOKIE, toSiteLocale } from "@/lib/analysis-locale"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.home

/**
 * App-wide error boundary — the one that actually catches layout failures.
 *
 * A segment's own error.tsx wraps that segment's CHILDREN, not its layout:
 * a throw inside app/dashboard/layout.tsx (session check, profile lookup,
 * sidebar playlists) skips app/dashboard/error.tsx entirely and bubbles up
 * here. Without this file it escaped the app altogether and the browser
 * rendered its own "page couldn't load" screen — no message, no way back,
 * and no error reference to trace in the logs.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [locale] = useState<SiteLocale>(() => {
    if (typeof document === "undefined") {
      return "en"
    }

    const raw = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${ANALYSIS_LOCALE_COOKIE}=`))
      ?.split("=")[1]

    return toSiteLocale(raw ? decodeURIComponent(raw) : undefined)
  })

  useEffect(() => {
    console.error("app.render_failed", error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-20 text-center lg:px-10">
      <TriangleAlert className="size-9 text-ec-amber/80" aria-hidden />

      <h1 className="font-heading text-2xl font-semibold text-white sm:text-3xl">
        {COPY.crashTitleApp[locale]}
      </h1>

      <p className="max-w-lg text-sm leading-7 text-white/60">
        {COPY.crashBodyApp[locale]}
      </p>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[13px] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_26px_rgba(106,92,240,0.35)] transition-transform hover:-translate-y-px"
          style={{
            background:
              "linear-gradient(96deg, #A24DE0 0%, #6A5CF0 46%, #22D3EE 100%)",
          }}
        >
          {COPY.crashRetry[locale]}
        </button>
        <Link
          href="/"
          className="rounded-[13px] border border-white/14 px-5 py-2.5 text-sm text-white/64 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          {COPY.crashHome[locale]}
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-white/32">
          {COPY.crashReference[locale]}: {error.digest}
        </p>
      ) : null}
    </div>
  )
}
