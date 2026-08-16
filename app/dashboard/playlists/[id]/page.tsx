import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, AudioWaveform, GitCompare, Printer } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { PlaylistExportButton } from "@/components/playlists/playlist-export-button"
import { PlaylistHeaderEdit } from "@/components/playlists/playlist-header-edit"
import { PlaylistStatsPills } from "@/components/playlists/playlist-stats-pills"
import { PlaylistWorkspace } from "@/components/playlists/playlist-workspace"
import { TransitionList } from "@/components/playlists/transition-list"
import { SaveShapeButton } from "@/components/playlists/save-shape-button"
import { ShareCurveButton } from "@/components/playlists/share-curve-button"
import {
  VersionHistory,
  type VersionSummary,
} from "@/components/playlists/version-history"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { buildReturnToHref } from "@/lib/auth/return-to"
import {
  CONTEXT_COPY,
  CURVE_SHAPE_COPY,
  DASHBOARD_COPY,
} from "@/lib/content/dashboard-copy"
import type { ExportPlaylist } from "@/lib/playlists/export"
import {
  GENRE_LABELS,
  parseCurveShape,
  type CurveShape,
} from "@/lib/product/strategy"
import { sameOrder, snapshotOf } from "@/lib/playlists/versions"
import { buildShareToken } from "@/lib/playlists/share-token"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { rateTransitions } from "@/lib/engine/transitions"
import { can } from "@/lib/product/capabilities"
import { SITE_URL } from "@/lib/seo"
import { getRequestLocale } from "@/lib/server-locale"
import { cn } from "@/lib/utils"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import { getProfileBilling } from "@/services/billing-service"
import { listCurveTemplates } from "@/services/curve-template-service"
import { listVersions } from "@/services/version-service"
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

  const [playlist, billing] = await Promise.all([
    getOwnedPlaylistWithTracks(profile.id, id),
    getProfileBilling(profile.id),
  ])

  if (!playlist) {
    notFound()
  }

  const locale = await getRequestLocale()
  const copy = DASHBOARD_COPY.playlistDetail
  const canPrintSetSheet = can(
    billing.plan,
    billing.status,
    "printable_set_sheet"
  )
  const canReadHistory = can(billing.plan, billing.status, "version_history")
  const canSeeTransitions = can(
    billing.plan,
    billing.status,
    "transition_suggestions"
  )

  // Only fetched for the plan that can use them; everyone else gets an empty
  // list and a selector with just the built-ins.
  const curveTemplates = can(
    billing.plan,
    billing.status,
    "custom_curve_templates"
  )
    ? (await listCurveTemplates(profile.id)).map((template) => ({
        id: template.id,
        name: template.name,
      }))
    : []

  const canSaveShapes = can(
    billing.plan,
    billing.status,
    "custom_curve_templates"
  )
  const canCompareSets = can(billing.plan, billing.status, "set_comparator")

  // Free on every plan on purpose: this is the only growth loop in the roadmap,
  // and paywalling your own advertising is self-defeating. Null when no signing
  // secret is configured, which hides the button rather than minting dead links.
  const shareToken = buildShareToken(playlist.id)
  const shareUrl = shareToken ? `${SITE_URL}/c/${shareToken}` : null

  // Not queried at all when the reader can't see it. Versions are still being
  // *recorded* for them — the history is waiting the day they upgrade.
  const versions = canReadHistory ? await listVersions(playlist.id) : []
  const currentOrder = snapshotOf(playlist.tracks)
  const versionSummaries: VersionSummary[] = versions.map((version) => ({
    id: version.id,
    kind: version.kind,
    trackCount: version.tracks.length,
    setScore: version.setScore,
    createdAt: version.createdAt,
    isCurrent: sameOrder(version.tracks, currentOrder),
  }))

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
      musicalKey: track.musical_key,
      genre: track.genre,
      comment: track.comment,
      durationSeconds: track.duration_seconds,
    })),
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
      <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Link
              href="/dashboard/playlists"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "w-fit text-white/58 hover:text-white"
              )}
            >
              <ArrowLeft className="size-3.5" />
              {copy.back[locale]}
            </Link>

            <div className="flex items-center gap-2">
              {/*
                Shown to everyone, PRO or not. A feature nobody can see converts
                nobody — an unentitled DJ lands on the page that explains it
                instead of on the sheet, and the route enforces that itself.
              */}
              <Link
                href={
                  canPrintSetSheet
                    ? `/dashboard/playlists/${playlist.id}/set-sheet`
                    : "/pricing"
                }
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "w-fit text-white/58 hover:text-white"
                )}
              >
                <Printer className="size-4" />
                {copy.setSheet[locale]}
                {canPrintSetSheet ? null : (
                  <span className="rounded border border-white/20 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    pro
                  </span>
                )}
              </Link>
              <Link
                href={
                  canCompareSets
                    ? `/dashboard/playlists/${playlist.id}/compare`
                    : "/pricing"
                }
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "w-fit text-white/58 hover:text-white"
                )}
              >
                <GitCompare className="size-4" />
                {DASHBOARD_COPY.compare.title[locale]}
                {canCompareSets ? null : (
                  <span className="rounded border border-white/20 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    pro+
                  </span>
                )}
              </Link>
              {shareUrl ? (
                <ShareCurveButton url={shareUrl} locale={locale} />
              ) : null}
              {canSaveShapes ? (
                <SaveShapeButton playlistId={playlist.id} locale={locale} />
              ) : null}
              <PlaylistExportButton playlist={exportPlaylist} locale={locale} />
              <Link
                href={`/dashboard/playlists/${playlist.id}/analysis`}
                className={cn(buttonVariants({ size: "default" }))}
              >
                <AudioWaveform className="size-4" />
                {copy.analyzeSet[locale]}
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <PlaylistHeaderEdit
              playlistId={playlist.id}
              name={playlist.name}
              description={playlist.description}
              slotStartMinutes={playlist.slot_start_minutes}
              slotEndMinutes={playlist.slot_end_minutes}
              targetShape={parseCurveShape(playlist.target_shape)}
              targetTemplateId={playlist.target_template_id}
              templates={curveTemplates}
              locale={locale}
            />
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
                    CONTEXT_COPY[playlist.context]?.[locale] ??
                    playlist.context}
                </Badge>
              ) : null}
              {parseCurveShape(playlist.target_shape) ? (
                <Badge>
                  {
                    CURVE_SHAPE_COPY[
                      parseCurveShape(playlist.target_shape) as CurveShape
                    ].label[locale]
                  }
                </Badge>
              ) : null}
              <PlaylistStatsPills
                tracks={playlist.tracks}
                genre={playlist.genre}
                context={playlist.context}
                locale={locale}
              />
            </div>
          </div>
        </header>

        <VersionHistory
          playlistId={playlist.id}
          versions={versionSummaries}
          entitled={canReadHistory}
          canMarkPlayed={can(billing.plan, billing.status, "planned_vs_played")}
          locale={locale}
        />

        {canSeeTransitions && playlist.genre ? (
          <TransitionList
            transitions={rateTransitions(
              resolveTrackEnergies(
                playlist.tracks,
                playlist.context,
                playlist.genre
              ).map((entry, index) => ({
                id: playlist.tracks[index].id,
                position: playlist.tracks[index].position,
                artist: playlist.tracks[index].artist,
                name: playlist.tracks[index].name,
                camelot: entry.camelot,
                energy: entry.score,
              })),
              playlist.genre
            )}
            locale={locale}
          />
        ) : null}

        <PlaylistWorkspace
          key={playlist.tracks.map((t) => `${t.id}:${t.position}`).join("|")}
          playlistId={playlist.id}
          genre={playlist.genre}
          context={playlist.context}
          targetShape={parseCurveShape(playlist.target_shape)}
          tracks={playlist.tracks}
          locale={locale}
        />
    </div>
  )
}
