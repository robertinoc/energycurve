"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { History, RotateCcw } from "lucide-react"

import { restoreVersionAction } from "@/app/dashboard/playlists/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { VersionKind } from "@/lib/playlists/versions"
import { cn } from "@/lib/utils"

const COPY = DASHBOARD_COPY.versions

/** Only what the list renders — no snapshot bodies shipped to the client. */
export interface VersionSummary {
  id: string
  kind: VersionKind
  trackCount: number
  setScore: number | null
  createdAt: string
  /** True when this version's order is the one the playlist is in right now. */
  isCurrent: boolean
}

const KIND_LABEL: Record<VersionKind, keyof typeof COPY> = {
  imported: "kindImported",
  curated: "kindCurated",
  ai: "kindAi",
  played: "kindPlayed",
}

export function VersionHistory({
  playlistId,
  versions,
  entitled,
  locale,
}: {
  playlistId: string
  versions: VersionSummary[]
  /** PRO gate. Versions are recorded for everyone; reading them is paid. */
  entitled: boolean
  locale: SiteLocale
}) {
  if (!entitled) {
    return (
      <Section locale={locale}>
        <p className="max-w-xl text-sm leading-6 text-white/58">
          {COPY.lockedBody[locale]}
        </p>
        <Link
          href="/pricing"
          className={cn(buttonVariants({ size: "sm" }), "mt-4 w-fit")}
        >
          {COPY.lockedCta[locale]}
        </Link>
      </Section>
    )
  }

  if (versions.length === 0) {
    return (
      <Section locale={locale}>
        <p className="text-sm leading-6 text-white/48">
          {COPY.emptyBody[locale]}
        </p>
      </Section>
    )
  }

  // Marked rather than sorted: the list stays chronological, because "which one
  // was I on before this" is read by position in time, not by rank.
  const scores = versions
    .map((version) => version.setScore)
    .filter((score): score is number => score !== null)
  const best = scores.length > 1 ? Math.max(...scores) : null

  return (
    <Section locale={locale}>
      <p className="text-xs leading-5 text-white/40">{COPY.intro[locale]}</p>
      <ul className="mt-4 divide-y divide-white/8">
        {versions.map((version) => (
          <VersionRow
            key={version.id}
            playlistId={playlistId}
            version={version}
            isBest={best !== null && version.setScore === best}
            locale={locale}
          />
        ))}
      </ul>
    </Section>
  )
}

function VersionRow({
  playlistId,
  version,
  isBest,
  locale,
}: {
  playlistId: string
  version: VersionSummary
  isBest: boolean
  locale: SiteLocale
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function restore() {
    setError(null)
    startTransition(async () => {
      const result = await restoreVersionAction(playlistId, version.id)

      if (!result.ok) {
        setError(result.message ?? DASHBOARD_COPY.actions.genericError[locale])
      }
      // On success the action revalidates the page, which re-renders this list.
    })
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-white">
            {COPY[KIND_LABEL[version.kind]][locale]}
          </span>
          {version.isCurrent ? (
            <Tag>{COPY.current[locale]}</Tag>
          ) : null}
          {isBest ? <Tag accent>{COPY.best[locale]}</Tag> : null}
        </div>
        <p className="mt-1 text-xs text-white/40">
          {[
            formatTemplate(COPY.trackCount[locale], {
              count: String(version.trackCount),
            }),
            version.setScore === null
              ? COPY.noScore[locale]
              : version.setScore.toFixed(1),
            // Rendered from the ISO string on the client so it reads in the
            // viewer's own timezone — a version captured at 2am should not say
            // the previous day because the server is in UTC.
            new Date(version.createdAt).toLocaleString(
              locale === "es" ? "es-AR" : "en-GB",
              { dateStyle: "medium", timeStyle: "short" }
            ),
          ].join("  ·  ")}
        </p>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-ec-error">
            {error}
          </p>
        ) : null}
      </div>

      {version.isCurrent ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={restore}
          className="text-white/58 hover:text-white"
        >
          <RotateCcw className="size-3.5" />
          {pending ? COPY.restoring[locale] : COPY.restore[locale]}
        </Button>
      )}
    </li>
  )
}

function Tag({
  children,
  accent,
}: {
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        accent
          ? "border-ec-cyan/40 text-ec-cyan"
          : "border-white/20 text-white/50"
      )}
    >
      {children}
    </span>
  )
}

function Section({
  children,
  locale,
}: {
  children: React.ReactNode
  locale: SiteLocale
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <History className="size-4 text-white/40" />
        {COPY.title[locale]}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}
