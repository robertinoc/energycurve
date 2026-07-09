import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, AudioWaveform } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { PlaylistExportButton } from "@/components/playlists/playlist-export-button"
import { PlaylistWorkspace } from "@/components/playlists/playlist-workspace"
import { TracklistImport } from "@/components/playlists/tracklist-import"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { buildReturnToHref } from "@/lib/auth/return-to"
import type { ExportPlaylist } from "@/lib/playlists/export"
import { CONTEXT_LABELS, GENRE_LABELS } from "@/lib/product/strategy"
import { cn } from "@/lib/utils"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"

export const metadata: Metadata = {
  title: "Playlist",
}

export const dynamic = "force-dynamic"

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

  const exportPlaylist: ExportPlaylist = {
    name: playlist.name,
    importSource: playlist.import_source,
    tracks: playlist.tracks.map((track) => ({
      position: track.position,
      artist: track.artist,
      name: track.name,
      bpm: track.bpm,
      energyScore: track.energy_score,
      sourceUri: track.source_uri,
    })),
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10">
      <header className="space-y-4">
          <div className="flex items-center justify-between gap-4">
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

            <div className="flex items-center gap-2">
              <PlaylistExportButton playlist={exportPlaylist} />
              <Link
                href={`/dashboard/playlists/${playlist.id}/analysis`}
                className={cn(buttonVariants({ size: "default" }))}
              >
                <AudioWaveform className="size-4" />
                Analyze set
              </Link>
            </div>
          </div>

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
            </div>
          </div>
        </header>

        <PlaylistWorkspace
          key={playlist.tracks.map((t) => `${t.id}:${t.position}`).join("|")}
          playlistId={playlist.id}
          genre={playlist.genre}
          context={playlist.context}
          tracks={playlist.tracks}
        />

        <TracklistImport
          playlistId={playlist.id}
          existingTrackCount={playlist.tracks.length}
        />
    </div>
  )
}
