import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { SetCurve } from "@/components/playlists/set-curve"
import { buttonVariants } from "@/components/ui/button"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { estimateSetDuration } from "@/lib/engine/set-duration"
import { chainedAnchors, isSplitCriterion } from "@/lib/engine/set-split"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import { parseCurveShape } from "@/lib/product/strategy"
import {
  CRITERION_COPY,
  SPLIT_COPY,
  durationSource,
  formatMinutes,
} from "@/lib/playlists/split-copy"
import { getRequestLocale } from "@/lib/server-locale"
import { cn } from "@/lib/utils"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"
import { getOwnedPlaylistWithTracks } from "@/services/playlist-service"

export const metadata: Metadata = {
  title: "Your sets",
}

// Per-user, read from the session: never prerendered, like every dashboard page.
export const dynamic = "force-dynamic"

/** A split makes at most this many sets (80 tracks, about an hour each). */
const MAX_SETS = 6
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Where a split import lands: every set it made, one under the other, in the
 * order they are played. One column on every screen on purpose — side by side
 * would make "which is set 1" a question of reading direction.
 *
 * Each set says how long it plays and where that number came from, and draws
 * its own curve against its own target: the chained target for "continuous",
 * the playlist's own for the other two.
 *
 * Only the caller's own playlists are read (`getOwnedPlaylistWithTracks`), so a
 * hand-edited URL with someone else's ids shows nothing of theirs.
 */
export default async function SplitResultPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; criterion?: string }>
}) {
  const query = await searchParams
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
  const locale = await getRequestLocale()

  const ids = (query.ids ?? "")
    .split(",")
    .filter((id) => UUID.test(id))
    .slice(0, MAX_SETS)
  const criterion = isSplitCriterion(query.criterion) ? query.criterion : null

  const playlists = (
    await Promise.all(ids.map((id) => getOwnedPlaylistWithTracks(profile.id, id)))
  ).filter((playlist): playlist is NonNullable<typeof playlist> => playlist !== null)

  const sets = playlists.map((playlist) => ({
    playlist,
    scores: resolveTrackEnergies(playlist.tracks, playlist.context, playlist.genre).map(
      (entry) => entry.score
    ),
    duration: estimateSetDuration(
      playlist.tracks.map((track) => ({ durationSeconds: track.duration_seconds, bpm: track.bpm }))
    ),
  }))
  const anchors =
    criterion === "continuous" ? chainedAnchors(sets.map((set) => set.scores)) : null

  return (
    // The dashboard pages own their gutter (px-6, lg:px-10, as /dashboard/playlists
    // does); the bottom adds the gesture-bar inset for the installed app.
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:px-10">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold text-ec-text">
          {SPLIT_COPY.resultTitle[locale]}
        </h1>
        {sets.length > 0 ? (
          <p className="text-sm leading-6 text-ec-text-muted">
            {formatTemplate(SPLIT_COPY.resultIntro[locale], { count: sets.length })}
          </p>
        ) : (
          <p className="text-sm leading-6 text-ec-text-muted">{SPLIT_COPY.missing[locale]}</p>
        )}
        {criterion ? (
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ec-cyan">
            {formatTemplate(SPLIT_COPY.resultCriterion[locale], {
              criterion: CRITERION_COPY[criterion].name[locale],
            })}
          </p>
        ) : null}
      </header>

      <ol className="space-y-5">
        {sets.map(({ playlist, scores, duration }, index) => (
          <li
            key={playlist.id}
            aria-labelledby={`set-${index + 1}`}
            className="min-w-0 space-y-4 rounded-2xl border border-ec-border-strong bg-ec-surface p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ec-cyan">
                  {formatTemplate(SPLIT_COPY.setLabel[locale], {
                    number: index + 1,
                    total: sets.length,
                  })}
                </p>
                <h2
                  id={`set-${index + 1}`}
                  className="break-words font-heading text-lg font-semibold text-ec-text"
                >
                  {playlist.name}
                </h2>
              </div>
              <Link
                href={`/dashboard/playlists/${playlist.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
              >
                {SPLIT_COPY.open[locale]}
              </Link>
            </div>

            <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <div className="flex gap-1.5">
                <dt className="sr-only">Tracks</dt>
                <dd className="font-mono text-ec-text">
                  {formatTemplate(SPLIT_COPY.tracks[locale], { count: playlist.tracks.length })}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="sr-only">Duration</dt>
                <dd
                  className={cn(
                    "font-mono",
                    duration.method === "rough" ? "text-ec-amber" : "text-ec-text"
                  )}
                >
                  {formatTemplate(
                    duration.method === "rough"
                      ? SPLIT_COPY.durationRough[locale]
                      : SPLIT_COPY.durationMeasured[locale],
                    { time: formatMinutes(duration.minutes) }
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-[13px] leading-5 text-ec-text-muted">
              {durationSource(duration, playlist.tracks.length, locale).join(" ")}
            </p>

            <div className="min-w-0 rounded-xl bg-ec-sunken p-2">
              <SetCurve
                scores={scores}
                // Same guard as the workspace and gig mode: without a genre and
                // a context there is no ideal arc, and an invented one is worse.
                target={
                  playlist.genre && playlist.context
                    ? buildTargetCurve(
                        scores.length,
                        playlist.context,
                        playlist.genre,
                        parseCurveShape(playlist.target_shape),
                        anchors?.[index] ?? null
                      )
                    : null
                }
                hoveredIndex={null}
                ariaLabel={formatTemplate(SPLIT_COPY.setLabel[locale], {
                  number: index + 1,
                  total: sets.length,
                })}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
