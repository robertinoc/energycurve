import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { PrintButton } from "@/components/playlists/print-button"
import { SetSheet, type SetSheetRow } from "@/components/playlists/set-sheet"
import { buttonVariants } from "@/components/ui/button"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import {
  estimateSetDurationMinutes,
  resolveTrackEnergies,
} from "@/lib/engine/energy-score"
import { clockAt, peakIndexOf, resolveSlot } from "@/lib/engine/slot"
import { can } from "@/lib/product/capabilities"
import { parseCurveShape } from "@/lib/product/strategy"
import { getRequestLocale } from "@/lib/server-locale"
import { cn } from "@/lib/utils"
import { getProfileBilling } from "@/services/billing-service"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const metadata: Metadata = {
  title: "Set sheet",
}

export const dynamic = "force-dynamic"

export default async function SetSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await withAuth()

  if (!user) {
    redirect(
      buildReturnToHref("/login", `/dashboard/playlists/${id}/set-sheet`)
    )
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
  const copy = DASHBOARD_COPY.setSheet
  const backHref = `/dashboard/playlists/${playlist.id}`

  // Gated here, on the server, rather than only by hiding the button: a guessed
  // URL has to hit the same wall the UI shows. An explanatory card instead of a
  // redirect, so the reader learns what they landed on.
  if (!can(billing.plan, billing.status, "printable_set_sheet")) {
    return (
      <SheetShell backHref={backHref} backLabel={copy.back[locale]}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-7">
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
        </div>
      </SheetShell>
    )
  }

  if (playlist.tracks.length === 0) {
    return (
      <SheetShell backHref={backHref} backLabel={copy.back[locale]}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-7">
          <h1 className="text-lg font-semibold text-white">
            {copy.emptyTitle[locale]}
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/58">
            {copy.emptyBody[locale]}
          </p>
        </div>
      </SheetShell>
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

  // The same helper the analysis uses, so the track marked here is the track the
  // analysis talks about.
  const peakIndex = peakIndexOf(energies.map((entry) => entry.score))

  const rows: SetSheetRow[] = playlist.tracks.map((track, index) => ({
    position: track.position,
    artist: track.artist,
    name: track.name,
    bpm: track.bpm,
    camelot: energies[index]?.camelot ?? null,
    energy: energies[index]?.score ?? 0,
    clockMinutes: slot ? clockAt(index, playlist.tracks.length, slot) : null,
  }))

  return (
    <SheetShell
      backHref={backHref}
      backLabel={copy.back[locale]}
      action={<PrintButton label={copy.print[locale]} />}
      hint={copy.hint[locale]}
    >
      <SetSheet
        playlistName={playlist.name}
        description={playlist.description}
        genre={playlist.genre}
        context={playlist.context}
        targetShape={parseCurveShape(playlist.target_shape)}
        slot={slot}
        rows={rows}
        peakPosition={rows[peakIndex]?.position ?? null}
        estimatedMinutes={estimateSetDurationMinutes(playlist.tracks.length)}
        locale={locale}
      />
    </SheetShell>
  )
}

/** Dark app chrome around the white sheet. All of it hidden when printing. */
function SheetShell({
  backHref,
  backLabel,
  action,
  hint,
  children,
}: {
  backHref: string
  backLabel: string
  action?: React.ReactNode
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-8 print:max-w-none print:gap-0 print:px-0 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
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
        {action}
      </div>
      {hint ? (
        <p className="text-xs leading-5 text-white/40 print:hidden">{hint}</p>
      ) : null}
      {children}
    </div>
  )
}
