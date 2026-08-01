import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { ArrowLeft, CircleCheck, TriangleAlert } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { AnalysisWorkbench } from "@/components/analysis/analysis-workbench"
import { LocaleToggle } from "@/components/analysis/locale-toggle"
import { OrderComparison } from "@/components/analysis/order-comparison"
import { PlaylistExportButton } from "@/components/playlists/playlist-export-button"
import { deriveFixes, fixIdForIssue } from "@/lib/engine/fixes"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import type { ExportPlaylist } from "@/lib/playlists/export"
import type { Track } from "@/types/domain"
import {
  ANALYSIS_LOCALE_COOKIE,
  toSiteLocale,
} from "@/lib/analysis-locale"
import {
  ANALYSIS_UI,
  CONTEXT_LABELS,
  formatTemplate,
} from "@/lib/content/analysis-copy"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { GENRE_LABELS } from "@/lib/product/strategy"
import { cn } from "@/lib/utils"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import {
  getPlaylistAnalysis,
  MIN_ANALYZABLE_TRACKS,
} from "@/services/analysis-service"

export const metadata: Metadata = {
  title: "Set analysis",
}

export const dynamic = "force-dynamic"

export default async function PlaylistAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", `/dashboard/playlists/${id}/analysis`))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const cookieStore = await cookies()
  const locale = toSiteLocale(cookieStore.get(ANALYSIS_LOCALE_COOKIE)?.value)

  const result = await getPlaylistAnalysis(profile.id, id, locale)

  if (!result) {
    notFound()
  }

  const backHref = `/dashboard/playlists/${id}`

  if (result.status === "not_analyzable") {
    const message =
      result.reason === "too_few_tracks"
        ? formatTemplate(ANALYSIS_UI.notAnalyzableTooShort[locale], {
            min: MIN_ANALYZABLE_TRACKS,
          })
        : ANALYSIS_UI.notAnalyzableNoGenre[locale]

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 lg:px-10">
        <Link
          href={backHref}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit text-white/58 hover:text-white"
          )}
        >
          <ArrowLeft className="size-3.5" />
          {result.playlist.name}
        </Link>

        <div className="flex flex-col items-center gap-3 rounded-[26px] border border-dashed border-white/14 bg-white/[0.02] px-6 py-14 text-center">
          <TriangleAlert className="size-8 text-ec-amber/80" />
          <p className="max-w-md text-sm leading-6 text-white/58">{message}</p>
        </div>
      </div>
    )
  }

  const { playlist, energies, analysis, recommendations, reorder } = result

  // Redesign (zone 0/1): every issue becomes an actionable fix with concrete
  // reorder operations; the client workbench derives order + score from them.
  const fixes = deriveFixes({
    trackIds: playlist.tracks.map((track) => track.id),
    energies,
    issues: analysis.issues,
    targetCurve: analysis.targetCurve,
    genre: analysis.genre,
    context: analysis.context,
    baseScore: analysis.setScore,
  })

  // Localized, already-interpolated engine copy, joined to fixes by their
  // stable id (panel fallback for advice-only issues + titles).
  const recommendationCopy = recommendations.map((rec) => ({
    id: fixIdForIssue(rec.issue),
    title: rec.title,
    action: rec.action,
    body: rec.body,
  }))

  // Exportable version of the SUGGESTED order (V3): full track rows reordered
  // by the suggestion, positions renumbered 1..N.
  const byPosition = new Map(playlist.tracks.map((track) => [track.position, track]))
  const suggestedExportPlaylist: ExportPlaylist = {
    name: `${playlist.name} — ${ANALYSIS_UI.suggestedNameSuffix[locale]}`,
    importSource: playlist.import_source,
    tracks: (reorder?.suggestedOrder ?? [])
      .map((position) => byPosition.get(position))
      .filter((track): track is Track => Boolean(track))
      .map((track, index) => ({
        position: index + 1,
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
          <Link
            href={backHref}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-fit text-white/58 hover:text-white"
            )}
          >
            <ArrowLeft className="size-3.5" />
            {playlist.name}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {ANALYSIS_UI.heading[locale]}
            </h1>
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
                  CONTEXT_LABELS[playlist.context]?.[locale] ??
                  playlist.context}
              </Badge>
            ) : null}
            <div className="ml-auto">
              <LocaleToggle current={locale} />
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-white/60">
            {ANALYSIS_UI.subtitle[locale]}
          </p>
        </header>

        {/* Redesign zones 1-2: score header + curve-as-map + fix panel. The
            workbench owns the applied/discarded state; zone 3 (live
            tracklist) replaces the suggested-order section below. */}
        <AnalysisWorkbench
          playlistId={playlist.id}
          tracks={playlist.tracks.map((track) => ({
            id: track.id,
            artist: track.artist,
            name: track.name,
          }))}
          energies={energies}
          fixes={fixes}
          recommendations={recommendationCopy}
          genre={analysis.genre}
          context={analysis.context}
          baseScore={analysis.setScore}
          targetCurve={analysis.targetCurve}
          locale={locale}
        />

        {/* Always visible (V3): when the engine finds no worthwhile
            improvement, a positive state replaces the comparison. */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">
                {ANALYSIS_UI.reorderEyebrow[locale]}
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold text-white">
                {ANALYSIS_UI.reorderTitle[locale]}
              </h2>
            </div>
            {reorder ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <PlaylistExportButton
                  playlist={suggestedExportPlaylist}
                  locale={locale}
                />
                <Link
                  href={backHref}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "text-white/58 hover:text-white"
                  )}
                >
                  {ANALYSIS_UI.reorderManually[locale]}
                </Link>
              </div>
            ) : null}
          </div>
          {reorder ? (
            <OrderComparison
              tracks={playlist.tracks}
              originalScore={analysis.setScore}
              reorder={reorder}
              locale={locale}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#4ADE80]/30 bg-[#4ADE80]/[0.04] px-6 py-10 text-center">
              <CircleCheck className="size-8 text-[#86EFAC]" />
              <p className="max-w-md text-sm leading-6 text-white/64">
                {ANALYSIS_UI.reorderOptimal[locale]}
              </p>
            </div>
          )}
        </section>
    </div>
  )
}
