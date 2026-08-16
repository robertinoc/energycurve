import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import {
  filterLibrary,
  type LibraryFilter,
} from "@/lib/playlists/library"
import { can } from "@/lib/product/capabilities"
import { getRequestLocale } from "@/lib/server-locale"
import { cn } from "@/lib/utils"
import { getProfileBilling } from "@/services/billing-service"
import { getGlobalLibrary } from "@/services/library-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const metadata: Metadata = {
  title: "Your library",
}

export const dynamic = "force-dynamic"

const FILTERS: LibraryFilter[] = ["all", "repeated", "never_played"]

function isFilter(value: string | undefined): value is LibraryFilter {
  return FILTERS.includes(value as LibraryFilter)
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: rawFilter } = await searchParams
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/library"))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const [billing, locale] = await Promise.all([
    getProfileBilling(profile.id),
    getRequestLocale(),
  ])
  const copy = DASHBOARD_COPY.library

  if (!can(billing.plan, billing.status, "global_library")) {
    return (
      <Shell title={copy.title[locale]}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-7">
          <h2 className="text-lg font-semibold text-white">
            {copy.lockedTitle[locale]}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
            {copy.lockedBody[locale]}
          </p>
          <Link
            href="/pricing"
            className={cn(buttonVariants({ size: "sm" }), "mt-5 w-fit")}
          >
            {copy.lockedCta[locale]}
          </Link>
        </div>
      </Shell>
    )
  }

  const library = await getGlobalLibrary(profile.id)
  const filter: LibraryFilter = isFilter(rawFilter) ? rawFilter : "all"
  const entries = filterLibrary(library.entries, filter)

  return (
    <Shell title={copy.title[locale]}>
      <p className="text-sm text-white/48">{copy.subtitle[locale]}</p>

      <div className="flex flex-wrap gap-4 text-sm">
        <Stat value={library.recordCount} label={copy.records[locale]} />
        <Stat value={library.repeatedCount} label={copy.repeated[locale]} />
        <Stat
          value={library.neverPlayedCount}
          label={copy.neverPlayed[locale]}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option}
            href={option === "all" ? "/dashboard/library" : `?filter=${option}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              option === filter
                ? "border-ec-cyan/40 bg-ec-cyan/10 text-ec-cyan"
                : "border-white/12 text-white/62 hover:border-white/30 hover:text-white"
            )}
          >
            {option === "all"
              ? copy.filterAll[locale]
              : option === "repeated"
                ? copy.filterRepeated[locale]
                : copy.filterNeverPlayed[locale]}
          </Link>
        ))}
      </div>

      {/* Stated wherever the number is, not once in a footnote: an unqualified
          "never played" reads as an accusation, and it would often be wrong. */}
      {filter === "never_played" ? (
        <p className="text-xs leading-5 text-white/35">
          {copy.neverPlayedCaveat[locale]}
        </p>
      ) : null}

      {library.recordCount === 0 ? (
        <p className="text-sm text-white/48">{copy.empty[locale]}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-white/48">{copy.emptyFiltered[locale]}</p>
      ) : (
        <ul className="divide-y divide-white/8 rounded-2xl border border-white/10 bg-white/[0.02]">
          {entries.map((entry) => (
            <li
              key={entry.key}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-white">
                  <span className="font-medium">{entry.artist}</span>
                  <span className="text-white/45"> — {entry.name}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-white/35">
                  {entry.playlistCount === 1
                    ? copy.inOneSet[locale]
                    : formatTemplate(copy.inSets[locale], {
                        count: entry.playlistCount,
                      })}
                  {"  ·  "}
                  {entry.playlistNames.join(", ")}
                </p>
              </div>
              <p className="shrink-0 text-xs tabular-nums text-white/40">
                {[entry.bpm ? `${entry.bpm} BPM` : null, entry.musicalKey]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-lg font-semibold tabular-nums text-white">
        {value}
      </span>
      <span className="text-xs text-white/40">{label}</span>
    </span>
  )
}

function Shell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-8 lg:px-10">
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h1>
      {children}
    </div>
  )
}
