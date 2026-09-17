import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import {
  SetComparisonView,
  type ComparedSet,
} from "@/components/playlists/set-comparison-view"
import { buttonVariants } from "@/components/ui/button"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { computeSetScore } from "@/lib/engine/analysis"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { assessHarmony } from "@/lib/engine/harmony"
import { compareSets } from "@/lib/playlists/set-comparison"
import { can } from "@/lib/product/capabilities"
import { getRequestLocale } from "@/lib/server-locale"
import { cn } from "@/lib/utils"
import { getProfileBilling } from "@/services/billing-service"
import {
  getOwnedPlaylistWithTracks,
  listPlaylists,
} from "@/services/playlist-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import type { PlaylistWithTracks } from "@/types/domain"

export const metadata: Metadata = {
  title: "Compare sets",
}

export const dynamic = "force-dynamic"

/** Score, harmony and curve for one side of the comparison. */
function describe(playlist: PlaylistWithTracks): ComparedSet {
  const energies = resolveTrackEnergies(
    playlist.tracks,
    playlist.context,
    playlist.genre
  )
  const curve = energies.map((entry) => entry.score)
  const harmony = assessHarmony(energies.map((entry) => entry.camelot))

  return {
    name: playlist.name,
    score:
      playlist.genre && playlist.context && curve.length > 0
        ? computeSetScore(
            curve,
            playlist.genre,
            playlist.context,
            energies.map((entry) => ({
              source: entry.source,
              bpm: entry.bpm,
            }))
          )
        : null,
    // Null rather than a confident 100% when nothing has a key: the harmony
    // ratio is defined as neutral with no data, and printing that as a score
    // would claim a perfectly mixed set built on no information at all.
    harmonyRatio: harmony.knownTransitions > 0 ? harmony.ratio : null,
    curve,
  }
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ with?: string }>
}) {
  const { id } = await params
  const { with: otherId } = await searchParams
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", `/dashboard/playlists/${id}/compare`))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const [playlist, billing] = await Promise.all([
    getOwnedPlaylistWithTracks(profile.id, id),
    getProfileBilling(profile.id),
  ])

  if (!playlist) {
    notFound()
  }

  const locale = await getRequestLocale()
  const copy = DASHBOARD_COPY.compare
  const backHref = `/dashboard/playlists/${playlist.id}`

  // Gated on the server, not only by hiding the entry point: a guessed URL has
  // to meet the same wall the UI shows.
  if (!can(billing.plan, billing.status, "set_comparator")) {
    return (
      <Shell backHref={backHref} backLabel={copy.back[locale]} title={copy.title[locale]}>
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

  const others = (await listPlaylists(profile.id)).filter(
    (candidate) => candidate.id !== playlist.id
  )
  // Ownership comes from getOwnedPlaylistWithTracks, so a `with` pointing at
  // someone else's set resolves to null and falls through to the picker.
  const other = otherId
    ? await getOwnedPlaylistWithTracks(profile.id, otherId)
    : null

  return (
    <Shell backHref={backHref} backLabel={copy.back[locale]} title={copy.title[locale]}>
      {others.length === 0 ? (
        <p className="text-sm text-white/48">{copy.pickEmpty[locale]}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-white/35">
            {copy.pick[locale]}
          </span>
          {others.map((candidate) => (
            <Link
              key={candidate.id}
              href={`/dashboard/playlists/${playlist.id}/compare?with=${candidate.id}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                candidate.id === other?.id
                  ? "border-ec-cyan/40 bg-ec-cyan/10 text-ec-cyan"
                  : "border-white/12 text-white/62 hover:border-white/30 hover:text-white"
              )}
            >
              {candidate.name}
            </Link>
          ))}
        </div>
      )}

      {other ? (
        <SetComparisonView
          a={describe(playlist)}
          b={describe(other)}
          comparison={compareSets(
            playlist.tracks.map((track) => ({
              artist: track.artist,
              name: track.name,
              position: track.position,
            })),
            other.tracks.map((track) => ({
              artist: track.artist,
              name: track.name,
              position: track.position,
            }))
          )}
          locale={locale}
        />
      ) : others.length > 0 ? (
        <p className="text-sm text-white/48">{copy.pickPrompt[locale]}</p>
      ) : null}
    </Shell>
  )
}

function Shell({
  backHref,
  backLabel,
  title,
  children,
}: {
  backHref: string
  backLabel: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-8">
      <Link
        href={backHref}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "w-fit text-white/58 hover:text-white"
        )}
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        {title}
      </h1>
      {children}
    </div>
  )
}
