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
import { buildReturnToHref } from "@/lib/auth/return-to"
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
        ? `This playlist needs at least ${MIN_ANALYZABLE_TRACKS} tracks before the flow can be analyzed. Add tracks or paste a full tracklist first.`
        : "This playlist has no genre or context set, so the engine has nothing to score against. Recreate it with both fields set."

    return (
      <main className="min-h-screen bg-[#08050F] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-8 lg:px-10">
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
            <TriangleAlert className="size-8 text-amber-300/80" />
            <p className="max-w-md text-sm leading-6 text-white/58">{message}</p>
          </div>
        </div>
      </main>
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
    <main className="min-h-screen bg-[#08050F] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
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
              Set analysis
            </h1>
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
            <div className="ml-auto">
              <LocaleToggle current={locale} />
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-white/60">
            Every number below is traceable: the energy of each track, the
            rules it breaks, and exactly what each one costs.
          </p>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,25,0.98),rgba(14,14,20,0.98))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.38)]">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">
                Energy curve
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold text-white">
                How the set actually flows
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">
                Hover the curve to inspect each track. Dashed halos mark tracks
                involved in at least one detected issue.
              </p>
            </div>
            <EnergyCurveChart tracks={chartTracks} />
          </div>

          <SetScoreCard
            analysis={analysis}
            durationMinutes={result.durationMinutes}
          />
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/42">
              Issues &amp; recommendations
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-white">
              What to fix, and how
            </h2>
          </div>
          <IssueList recommendations={recommendations} />
        </section>

        {reorder ? (
          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">
                Suggested order
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold text-white">
                A stronger version of the same set
              </h2>
            </div>
            <OrderComparison
              tracks={playlist.tracks}
              originalScore={analysis.setScore}
              reorder={reorder}
            />
          </section>
        ) : null}
      </div>
    </main>
  )
}
