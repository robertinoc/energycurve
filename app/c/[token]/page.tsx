import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { computeSetScore } from "@/lib/engine/analysis"
import {
  estimatedPointIndices,
  shouldMarkEstimated,
} from "@/lib/charts/estimated-points"
import {
  energyCoverageOf,
  scoreIsMeaningful,
} from "@/lib/engine/energy-coverage"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { curveDomain } from "@/lib/playlists/version-diff"
import { readShareToken } from "@/lib/playlists/share-token"
import { getRequestLocale } from "@/lib/server-locale"
import { cn } from "@/lib/utils"
import { getPlaylistWithTracksById } from "@/services/playlist-service"

/**
 * A public, read-only page showing the *shape* of a set.
 *
 * Reached only through a signed link the owner generated. Three deliberate
 * limits on what it shows:
 *
 * - **No tracklist.** A DJ sharing "look at the shape of my night" is not
 *   sharing their record selection, which is the part they spent years
 *   building. Showing it would make the feature unusable for the people most
 *   likely to post one.
 * - **No owner.** No name, no avatar, no link to a profile. The page is about
 *   a curve; anyone who wants attribution can write it in their own caption.
 * - **noindex.** A link someone chose to hand out is not a page they asked to
 *   be findable by searching their set's name.
 */
export const metadata: Metadata = {
  title: "The shape of a set",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function PublicCurvePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const playlistId = readShareToken(token)

  // A bad signature and a deleted set are the same 404 on purpose: a distinct
  // "this link expired" would confirm the id existed, which is what the
  // signature is there to keep private.
  if (!playlistId) {
    notFound()
  }

  const playlist = await getPlaylistWithTracksById(playlistId)

  if (!playlist || playlist.tracks.length === 0) {
    notFound()
  }

  const locale = await getRequestLocale()
  const copy = DASHBOARD_COPY.publicCurve

  const energies = resolveTrackEnergies(
    playlist.tracks,
    playlist.context,
    playlist.genre
  )
  const curve = energies.map((entry) => entry.score)
  const meta = energies.map((entry) => ({
    source: entry.source,
    bpm: entry.bpm,
  }))

  /**
   * No score on a shared page when the curve is mostly ours.
   *
   * This is the growth loop — the page a DJ sends to other people — which makes it
   * the worst place to publish a number the engine invented. A set with no tags at
   * all scored 9.2, because the curve being graded is a ramp drawn from track
   * positions and the target comes from the same context. The curve itself still
   * renders: its *shape* is the DJ's ordering, which is the thing worth sharing.
   */
  // Marked on the chart when some points are invented and some aren't; when all of
  // them are, the missing score already says it louder.
  const estimatedIndices = shouldMarkEstimated(
    estimatedPointIndices(meta.map((entry) => entry.source)).length,
    curve.length
  )
    ? estimatedPointIndices(meta.map((entry) => entry.source))
    : []

  const score =
    playlist.genre &&
    playlist.context &&
    scoreIsMeaningful(energyCoverageOf(meta))
      ? computeSetScore(curve, playlist.genre, playlist.context, meta)
      : null

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <header className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
          {copy.eyebrow[locale]}
        </p>
        <h1 className="break-words text-3xl font-semibold tracking-tight text-white">
          {playlist.name}
        </h1>
        <p className="text-sm text-white/45">
          {formatTemplate(copy.trackCount[locale], {
            count: playlist.tracks.length,
          })}
          {score === null ? "" : `  ·  ${copy.scoreLabel[locale]} ${score.toFixed(1)}`}
        </p>
      </header>

      <Curve values={curve} estimatedIndices={estimatedIndices} />

      {estimatedIndices.length > 0 ? (
        <p className="text-xs leading-5 text-white/35">
          {formatTemplate(copy.estimatedNote[locale], {
            count: estimatedIndices.length,
            total: curve.length,
          })}
        </p>
      ) : null}

      <p className="text-xs leading-5 text-white/35">
        {copy.privacyNote[locale]}
      </p>

      <footer className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5">
        <p className="text-sm leading-6 text-white/62">{copy.tagline[locale]}</p>
        <Link
          href="/"
          className={cn(buttonVariants({ size: "sm" }), "mt-4 w-fit")}
        >
          {copy.cta[locale]}
        </Link>
      </footer>
    </main>
  )
}

/** The curve, large, on the same cropped-but-honest axis used everywhere else. */
function Curve({
  values,
  estimatedIndices,
}: {
  values: number[]
  /**
   * Points interpolated from the track's position rather than measured.
   *
   * This page matters most of the three curve surfaces: it is the one a DJ sends
   * to other people, and the reader has no idea what was imported. A smooth arc
   * reads as a measurement whatever the caption says.
   */
  estimatedIndices: readonly number[]
}) {
  if (values.length < 2) {
    return null
  }

  const width = 640
  const height = 220
  const pad = 12
  const { min, max } = curveDomain(values)

  const coords = values.map((energy, index) => ({
    x: (index / (values.length - 1)) * width,
    y: pad + (1 - (energy - min) / (max - min)) * (height - pad * 2),
  }))
  const points = coords
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ")
  const estimated = new Set(estimatedIndices)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#curve-fill)"
        className="text-ec-cyan"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        className="text-ec-cyan"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Only the invented points get a marker. There are no other dots on this
          chart, so a hollow ring can't be mistaken for anything else. */}
      {coords.map((point, index) =>
        estimated.has(index) ? (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="#08050F"
            stroke="currentColor"
            className="text-ec-cyan"
            strokeWidth={1.5}
          />
        ) : null
      )}
    </svg>
  )
}
