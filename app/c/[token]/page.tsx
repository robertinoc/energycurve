import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { computeSetScore } from "@/lib/engine/analysis"
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
  const score =
    playlist.genre && playlist.context
      ? computeSetScore(
          curve,
          playlist.genre,
          playlist.context,
          energies.map((entry) => ({ source: entry.source, bpm: entry.bpm }))
        )
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

      <Curve values={curve} />

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
function Curve({ values }: { values: number[] }) {
  if (values.length < 2) {
    return null
  }

  const width = 640
  const height = 220
  const pad = 12
  const { min, max } = curveDomain(values)

  const points = values
    .map((energy, index) => {
      const x = (index / (values.length - 1)) * width
      const y = pad + (1 - (energy - min) / (max - min)) * (height - pad * 2)

      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

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
    </svg>
  )
}
