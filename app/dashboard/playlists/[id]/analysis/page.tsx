import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { ArrowLeft, TriangleAlert } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { AnalysisWorkbench } from "@/components/analysis/analysis-workbench"
import { LocaleToggle } from "@/components/analysis/locale-toggle"
import { deriveFixes, fixIdForIssue } from "@/lib/engine/fixes"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
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

  const { playlist, energies, analysis, recommendations } = result

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

        {/* Redesign zones 1-4: score header + curve-as-map + fix panel +
            live tracklist + smart ordering. The workbench owns the
            applied/discarded/smart-order state and derives everything else. */}
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

    </div>
  )
}
