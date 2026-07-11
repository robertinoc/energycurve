import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { ArrowLeft, TriangleAlert } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { EnergyCurveChart, type ChartTrackPoint } from "@/components/analysis/energy-curve-chart"
import { IssueList } from "@/components/analysis/issue-list"
import { LocaleToggle } from "@/components/analysis/locale-toggle"
import { OrderComparison } from "@/components/analysis/order-comparison"
import { SetScoreCard } from "@/components/analysis/set-score-card"
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

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,31,0.98),rgba(12,9,23,0.98))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.38)]">
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
          </div>

          <SetScoreCard
            analysis={analysis}
            durationMinutes={result.durationMinutes}
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
          <IssueList recommendations={recommendations} locale={locale} />
        </section>

        {reorder ? (
          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">
                {ANALYSIS_UI.reorderEyebrow[locale]}
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold text-white">
                {ANALYSIS_UI.reorderTitle[locale]}
              </h2>
            </div>
            <OrderComparison
              tracks={playlist.tracks}
              originalScore={analysis.setScore}
              reorder={reorder}
              locale={locale}
            />
          </section>
        ) : null}
    </div>
  )
}
