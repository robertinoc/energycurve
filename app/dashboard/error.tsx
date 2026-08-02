"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TriangleAlert } from "lucide-react"

import { ANALYSIS_LOCALE_COOKIE, toSiteLocale } from "@/lib/analysis-locale"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.home

/**
 * Error boundary for every /dashboard route. Without it, a throw during the
 * server render reaches the browser as a bare failed navigation ("This page
 * couldn't load"), which looks like the whole app is down and gives the user
 * nowhere to go. This keeps them inside EnergyCurve, with a retry and the
 * error digest to correlate against server logs.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // error.tsx is a client component and receives no props from us, so the
  // language comes from the same cookie the server reads. Resolved in the
  // initializer (not an effect) so the copy is right on the first paint.
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
    console.error("dashboard.render_failed", error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-20 text-center lg:px-10">
      <TriangleAlert className="size-9 text-ec-amber/80" aria-hidden />

      <h1 className="font-heading text-2xl font-semibold text-white sm:text-3xl">
        {COPY.crashTitle[locale]}
      </h1>

      <p className="max-w-lg text-sm leading-7 text-white/60">
        {COPY.crashBody[locale]}
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
