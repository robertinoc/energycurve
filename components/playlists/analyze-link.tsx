"use client"

import type { ReactNode } from "react"
import Link from "next/link"

import {
  captureAnalyzeCtaClick,
  type AnalyzeCtaProperties,
} from "@/lib/analytics/analyze-cta-events"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The way into a set's analysis, from wherever the playlist page offers it.
 *
 * One component for the three places so they cannot drift into three
 * destinations, and so each click says which place it came from
 * (lib/analytics/analyze-cta-events.ts). A plain link underneath: it works
 * before hydration and with scripts off, and the count is what is lost then,
 * never the navigation.
 */
export function AnalyzeLink({
  playlistId,
  placement,
  firstAnalysis,
  locale,
  className,
  children,
}: {
  playlistId: string
  placement: AnalyzeCtaProperties["placement"]
  firstAnalysis: boolean
  locale: SiteLocale
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={`/dashboard/playlists/${playlistId}/analysis`}
      onClick={() => captureAnalyzeCtaClick({ placement, firstAnalysis, locale })}
      data-analyze-placement={placement}
      className={className}
    >
      {children}
    </Link>
  )
}
