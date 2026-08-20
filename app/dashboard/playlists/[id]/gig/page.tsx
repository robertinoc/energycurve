import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { GigMode } from "@/components/playlists/gig-mode"
import { buttonVariants } from "@/components/ui/button"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import { clockAt, peakIndexOf, resolveSlot } from "@/lib/engine/slot"
import type { GigTrack } from "@/lib/playlists/gig-mode"
import { can } from "@/lib/product/capabilities"
import { parseCurveShape } from "@/lib/product/strategy"
import { getRequestLocale } from "@/lib/server-locale"
import { cn } from "@/lib/utils"
import { getProfileBilling } from "@/services/billing-service"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const metadata: Metadata = {
  title: "Gig Mode",
}

export const dynamic = "force-dynamic"

export default async function GigModePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", `/dashboard/playlists/${id}/gig`))
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
  const copy = DASHBOARD_COPY.gigMode
  const backHref = `/dashboard/playlists/${playlist.id}`

  // Gated on the server, not by hiding the entry point: a guessed URL has to meet
  // the same wall. An explanatory card rather than a redirect, so whoever lands
  // here learns what it is.
  if (!can(billing.plan, billing.status, "gig_mode")) {
    return (
      <GigShell backHref={backHref} backLabel={copy.back[locale]}>
        <h1 className="text-lg font-semibold text-white">
          {copy.lockedTitle[locale]}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
          {copy.lockedBody[locale]}
        </p>
        <Link
          href="/pricing"
          className={cn(buttonVariants({ size: "sm" }), "mt-5 w-fit")}
        >
          {copy.lockedCta[locale]}
        </Link>
      </GigShell>
    )
  }

  if (playlist.tracks.length === 0) {
    return (
      <GigShell backHref={backHref} backLabel={copy.back[locale]}>
        <h1 className="text-lg font-semibold text-white">
          {copy.emptyTitle[locale]}
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/58">
          {copy.emptyBody[locale]}
        </p>
      </GigShell>
    )
  }

  const energies = resolveTrackEnergies(
    playlist.tracks,
    playlist.context,
    playlist.genre
  )
  const slot = resolveSlot(
    playlist.slot_start_minutes,
    playlist.slot_end_minutes
  )

  // The same helper the analysis screen uses, so the track flagged as the peak
  // here is the one the analysis talks about.
  const peakIndex = peakIndexOf(energies.map((entry) => entry.score))

  const tracks: GigTrack[] = playlist.tracks.map((track, index) => ({
    position: track.position,
    artist: track.artist,
    name: track.name,
    bpm: track.bpm,
    camelot: energies[index]?.camelot ?? null,
    energy: energies[index]?.score ?? 0,
    clockMinutes: slot ? clockAt(index, playlist.tracks.length, slot) : null,
  }))

  return (
    <GigMode
      playlistId={playlist.id}
      playlistName={playlist.name}
      tracks={tracks}
      // Same guard the workspace uses: without a genre and a context there is no
      // ideal arc to draw against, and an invented one would be worse than none.
      target={
        playlist.genre && playlist.context
          ? buildTargetCurve(
              tracks.length,
              playlist.context,
              playlist.genre,
              parseCurveShape(playlist.target_shape)
            )
          : null
      }
      slot={slot}
      peakPosition={tracks[peakIndex]?.position ?? null}
      backHref={backHref}
      locale={locale}
    />
  )
}

/** Chrome for the states that aren't the booth view itself. */
function GigShell({
  backHref,
  backLabel,
  children,
}: {
  backHref: string
  backLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-8">
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
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-7">
        {children}
      </div>
    </div>
  )
}
