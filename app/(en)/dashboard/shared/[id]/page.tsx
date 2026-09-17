import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { Eye } from "lucide-react"

import { SuggestionThread } from "@/components/playlists/suggestion-thread"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { getRequestLocale } from "@/lib/server-locale"
import { SharedSetEditor } from "@/components/playlists/shared-set-editor"
import {
  getLockState,
  getSharedPlaylist,
  listSuggestions,
} from "@/services/collaboration-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const metadata: Metadata = { title: "Shared set" }
export const dynamic = "force-dynamic"

const COPY = DASHBOARD_COPY.collaboration

/**
 * A set someone shared, read-only, with the suggestion thread under it.
 *
 * A separate route from the owner's page rather than a read-only mode on it. That
 * page has a dozen write controls — reorder, rename, delete, export, import,
 * analyse — and hiding each one behind a flag means every future control added
 * there is one someone forgot to hide. Here there is nothing to hide.
 */
export default async function SharedSetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", `/dashboard/shared/${id}`))
  }

  const shared = await getSharedPlaylist(user.email, id)

  if (!shared) {
    // Same answer as a nonexistent set on purpose: someone walking ids learns
    // nothing about which ones exist.
    notFound()
  }

  const { playlist, ownerEmail } = shared

  // A shared set is a plausible first page a DJ ever opens — the invite lands in
  // their inbox before they have an account — so this both ensures the row exists
  // and gives us the id the edit turn is held by.
  const { id: profileId } = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const [suggestions, locale, lock] = await Promise.all([
    // The owner id is only used to label who authored what; a collaborator
    // doesn't need it, so it isn't fetched.
    listSuggestions(id, null),
    getRequestLocale(),
    // Resolved server-side so the buttons the page draws match what the actions
    // will allow. Re-checked in the action anyway: a page open since before the
    // turn expired would otherwise write on a turn it no longer has.
    getLockState(profileId, id),
  ])

  const energies = resolveTrackEnergies(
    playlist.tracks,
    playlist.context,
    playlist.genre
  )

  const trackPositions = Object.fromEntries(
    playlist.tracks.map((track, index) => [track.id, index + 1])
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-8 lg:px-10">
      {/* Said before the tracklist, not after: a reader who scrolls, reads and
          then discovers they can't change anything has already formed the wrong
          expectation. */}
      <div className="flex items-start gap-2.5 rounded-xl border border-ec-cyan/30 bg-ec-cyan/[0.06] px-4 py-3">
        <Eye className="mt-0.5 size-4 shrink-0 text-ec-cyan" />
        <p className="text-[13px] leading-6 text-white/80">
          {formatTemplate(COPY.readOnlyBanner[locale], {
            owner: ownerEmail,
          })}
        </p>
      </div>

      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-white">
          {playlist.name}
        </h1>
      </header>

      <SharedSetEditor
        playlistId={id}
        rows={playlist.tracks.map((track, index) => ({
          id: track.id,
          artist: track.artist,
          name: track.name,
          energy: energies[index]?.score ?? 0,
        }))}
        lock={lock}
        ownerEmail={ownerEmail}
        locale={locale}
      />

      <SuggestionThread
        playlistId={id}
        suggestions={suggestions}
        trackPositions={trackPositions}
        canResolve={false}
        locale={locale}
      />
    </div>
  )
}
