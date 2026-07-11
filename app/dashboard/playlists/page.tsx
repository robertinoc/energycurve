import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, ListMusic } from "lucide-react"
import { redirect } from "next/navigation"

import { DeletePlaylistButton } from "@/components/playlists/delete-playlist-button"
import { PlaylistCreateForm } from "@/components/playlists/playlist-create-form"
import { PlaylistImportUpload } from "@/components/playlists/playlist-import-upload"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { CONTEXT_COPY, DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { GENRE_LABELS, type PlaylistContext } from "@/lib/product/strategy"
import { getRequestLocale } from "@/lib/server-locale"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import { listPlaylists } from "@/services/playlist-service"
import { listUserContexts, listUserGenres } from "@/services/taxonomy-service"

export const metadata: Metadata = {
  title: "Playlists",
}

export const dynamic = "force-dynamic"

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

  const [playlists, customContexts, customGenres, locale] = await Promise.all([
    listPlaylists(profile.id),
    listUserContexts(profile.id),
    listUserGenres(profile.id),
    getRequestLocale(),
  ])
  const copy = DASHBOARD_COPY.playlists

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {copy.title[locale]}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/60">
          {copy.subtitle[locale]}
        </p>
      </header>

        <section className="space-y-4 rounded-[26px] border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
            {copy.startHere[locale]}
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">
                {copy.startImport[locale]}
              </h2>
              <span className="rounded-full border border-[#22D3EE]/35 bg-[#22D3EE]/[0.09] px-2 py-px font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#7DE6F7]">
                {copy.startImportHint[locale]}
              </span>
            </div>
            <PlaylistImportUpload
              locale={locale}
              customContexts={customContexts}
              customGenres={customGenres}
            />
          </div>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-white/8" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/32">
              {locale === "es" ? "o" : "or"}
            </span>
            <span className="h-px flex-1 bg-white/8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white">
              {copy.startManual[locale]}
            </h2>
            <p className="text-xs text-white/48">{copy.startManualHint[locale]}</p>
            <PlaylistCreateForm
              locale={locale}
              customContexts={customContexts}
              customGenres={customGenres}
            />
          </div>
        </section>

        {playlists.length === 0 ? (
          <EmptyState
            icon={<ListMusic className="size-8" />}
            title={copy.emptyTitle[locale]}
            description={copy.emptyDescription[locale]}
          />
        ) : (
          <section className="space-y-3">
            <h2 className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
              {copy.yourSets[locale]}
            </h2>
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
                          {playlist.custom_genre_name ??
                            GENRE_LABELS[playlist.genre] ??
                            playlist.genre}
                        </Badge>
                      ) : null}
                      {playlist.context ? (
                        <Badge>
                          {playlist.custom_context_name ??
                            CONTEXT_COPY[playlist.context as PlaylistContext]?.[
                              locale
                            ] ??
                            playlist.context}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-white/48">
                        {formatTemplate(copy.trackCount[locale], {
                          count: playlist.trackCount,
                        })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-white/32" />
                </Link>
                <DeletePlaylistButton
                  playlistId={playlist.id}
                  playlistName={playlist.name}
                  locale={locale}
                />
              </div>
            ))}
          </section>
        )}
    </div>
  )
}
