import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ChevronRight, ListMusic } from "lucide-react"
import { redirect } from "next/navigation"

import { DeletePlaylistButton } from "@/components/playlists/delete-playlist-button"
import { PlaylistCreateForm } from "@/components/playlists/playlist-create-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { GENRE_LABELS } from "@/lib/product/strategy"
import { cn } from "@/lib/utils"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import { listPlaylists } from "@/services/playlist-service"

export const metadata: Metadata = {
  title: "Playlists",
}

export const dynamic = "force-dynamic"

const CONTEXT_LABELS: Record<string, string> = {
  opening: "Opening",
  main: "Main time",
  closing: "Closing",
}

export default async function PlaylistsPage() {
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/playlists"))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const playlists = await listPlaylists(profile.id)

  return (
    <main className="min-h-screen bg-[#08050F] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10">
        <header className="space-y-4">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-fit text-white/58 hover:text-white"
            )}
          >
            <ArrowLeft className="size-3.5" />
            Dashboard
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Your playlists
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/60">
              Each playlist is a set you can analyze: name, genre, and context
              drive how the energy engine reads the flow.
            </p>
          </div>
        </header>

        <PlaylistCreateForm />

        {playlists.length === 0 ? (
          <EmptyState
            icon={<ListMusic className="size-8" />}
            title="No playlists yet"
            description="Create your first one above — then add tracks manually or paste a full tracklist."
          />
        ) : (
          <section className="space-y-3">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-[#0C0917] p-4 transition-colors hover:border-white/18"
              >
                <Link
                  href={`/dashboard/playlists/${playlist.id}`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-base font-medium text-white">
                      {playlist.name}
                    </p>
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
                      <span className="text-xs text-white/48">
                        {playlist.trackCount} track(s)
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-white/32" />
                </Link>
                <DeletePlaylistButton
                  playlistId={playlist.id}
                  playlistName={playlist.name}
                />
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
