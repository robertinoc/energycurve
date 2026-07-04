import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Clock3 } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { TrackEditor } from "@/components/playlists/track-editor"
import { TracklistImport } from "@/components/playlists/tracklist-import"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { STANDARD_TRACK_DURATION_MINUTES } from "@/lib/product/strategy"
import { cn } from "@/lib/utils"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"

export const metadata: Metadata = {
  title: "Playlist",
}

export const dynamic = "force-dynamic"

const GENRE_LABELS: Record<string, string> = {
  house: "House",
  techno: "Techno",
  "hard-techno": "Hard Techno",
  "melodic-techno": "Melodic Techno",
  progressive: "Progressive",
}

const CONTEXT_LABELS: Record<string, string> = {
  opening: "Opening",
  main: "Main time",
  closing: "Closing",
}

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", `/dashboard/playlists/${id}`))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const playlist = await getOwnedPlaylistWithTracks(profile.id, id)

  if (!playlist) {
    notFound()
  }

  const estimatedMinutes =
    playlist.tracks.length * STANDARD_TRACK_DURATION_MINUTES

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10">
        <header className="space-y-4">
          <Link
            href="/dashboard/playlists"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-fit text-white/58 hover:text-white"
            )}
          >
            <ArrowLeft className="size-3.5" />
            Playlists
          </Link>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {playlist.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {playlist.genre ? (
                <Badge variant="accent">
                  {GENRE_LABELS[playlist.genre] ?? playlist.genre}
                </Badge>
              ) : null}
              {playlist.context ? (
                <Badge>
                  {CONTEXT_LABELS[playlist.context] ?? playlist.context}
                </Badge>
              ) : null}
              <span className="flex items-center gap-1.5 text-xs text-white/48">
                <Clock3 className="size-3" />
                ~{estimatedMinutes} min ({playlist.tracks.length} track(s) ×{" "}
                {STANDARD_TRACK_DURATION_MINUTES} min)
              </span>
            </div>
          </div>
        </header>

        <TrackEditor playlistId={playlist.id} tracks={playlist.tracks} />

        <TracklistImport
          playlistId={playlist.id}
          existingTrackCount={playlist.tracks.length}
        />
      </div>
    </main>
  )
}
