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
import {
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

  // Called for its side effect, not its return: a shared set is a plausible first
  // page a DJ ever opens — the invite lands in their inbox before they have an
  // account — and leaving a suggestion needs a profile row to attribute it to.
  await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const [suggestions, locale] = await Promise.all([
    // The owner id is only used to label who authored what; a collaborator
    // doesn't need it, so it isn't fetched.
    listSuggestions(id, null),
    getRequestLocale(),
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

      <ol className="flex flex-col gap-1">
        {playlist.tracks.map((track, index) => (
          <li
            key={track.id}
            className="flex items-center gap-3 rounded-lg bg-ec-surface px-3 py-2"
          >
            <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-white/32">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-white/82">
              <span className="text-white/50">{track.artist}</span> — {track.name}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-white/40">
              {energies[index]?.score.toFixed(1) ?? "—"}
            </span>
          </li>
        ))}
      </ol>

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
