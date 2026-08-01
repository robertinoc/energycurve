import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { ArrowLeft, CircleCheck, TriangleAlert } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { AnalysisWorkbench } from "@/components/analysis/analysis-workbench"
import { EnergyCurveChart, type ChartTrackPoint } from "@/components/analysis/energy-curve-chart"
import { IssueList } from "@/components/analysis/issue-list"
import { LocaleToggle } from "@/components/analysis/locale-toggle"
import { OrderComparison } from "@/components/analysis/order-comparison"
import { PlaylistExportButton } from "@/components/playlists/playlist-export-button"
import { deriveFixes } from "@/lib/engine/fixes"
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

  const issuePositions = new Set(
    analysis.issues.flatMap((issue) => issue.trackPositions)
  )

  const chartTracks: ChartTrackPoint[] = playlist.tracks.map((track, index) => ({
    position: track.position,
    artist: track.artist,
    name: track.name,
    bpm: track.bpm,
    score: energies[index]?.score ?? 0,
    source: energies[index]?.source ?? "estimated",
    hasIssue: issuePositions.has(track.position),
  }))

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

        {/* Redesign zone 1: score now → you can reach. The workbench owns the
            applied/discarded state; zones 2-3 replace the sections below. */}
        <AnalysisWorkbench
          playlistId={playlist.id}
          originalIds={playlist.tracks.map((track) => track.id)}
          energies={energies}
          fixes={fixes}
          genre={analysis.genre}
          context={analysis.context}
          baseScore={analysis.setScore}
          locale={locale}
        />

        <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,31,0.98),rgba(12,9,23,0.98))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.38)]">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.22em] text-white/42">
              {ANALYSIS_UI.curveEyebrow[locale]}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-white">
              {ANALYSIS_UI.curveTitle[locale]}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">
              {ANALYSIS_UI.curveSubtitle[locale]}
            </p>
          </div>
          <EnergyCurveChart
            tracks={chartTracks}
            target={analysis.targetCurve}
            locale={locale}
          />
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/42">
              {ANALYSIS_UI.issuesEyebrow[locale]}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-white">
              {ANALYSIS_UI.issuesTitle[locale]}
            </h2>
          </div>
          <IssueList
            recommendations={recommendations}
            locale={locale}
            tracks={playlist.tracks}
          />
        </section>

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
