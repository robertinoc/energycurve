import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { Database, Pencil, Plus, TrendingUp } from "lucide-react"
import { redirect } from "next/navigation"

import { AnalyticsIdentify } from "@/components/analytics/analytics-tracker"
import { ScoreSparkline } from "@/components/analysis/score-sparkline"
import { DeletePlaylistButton } from "@/components/playlists/delete-playlist-button"
import { PlaylistImportUpload } from "@/components/playlists/playlist-import-upload"
import { SetupRequiredState } from "@/components/setup/setup-required-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { buildReturnToHref } from "@/lib/auth/return-to"
import {
  getGenericWorkOSConfigurationIssue,
  logWorkOSRuntimeError,
} from "@/lib/auth/workos-runtime"
import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"
import { logWarn } from "@/lib/observability/logger"
import { cn } from "@/lib/utils"
import { pickGreeting } from "@/lib/content/greetings"
import { GENRE_LABELS } from "@/lib/product/strategy"
import { getDashboardSnapshot } from "@/services/dashboard-service"

export const metadata: Metadata = {
  title: "Dashboard",
}

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const infrastructureStatus = getInfrastructureStatus()

  if (!infrastructureStatus.workosConfigured) {
    return (
      <SetupRequiredState
        configurationIssues={infrastructureStatus.missingWorkOSEnvNames}
        title="The protected dashboard is waiting for auth setup"
        description="Right now the route is reachable, but WorkOS has not been configured yet, so the app cannot create or validate a session."
      />
    )
  }

  let user: Awaited<ReturnType<typeof withAuth>>["user"] | null = null

  try {
    const auth = await withAuth()
    user = auth.user
  } catch (error) {
    logWorkOSRuntimeError("Dashboard auth check failed", error)

    return (
      <SetupRequiredState
        configurationIssues={[getGenericWorkOSConfigurationIssue()]}
        title="The protected dashboard could not validate WorkOS"
        description="The WorkOS variables exist, but the session layer could not be initialized cleanly for this request."
      />
    )
  }

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard"))
  }

  let snapshot: Awaited<ReturnType<typeof getDashboardSnapshot>> | null = null
  let infrastructureMessage: string | null = null

  if (!infrastructureStatus.supabaseConfigured) {
    infrastructureMessage =
      "Your WorkOS session is valid, but Supabase is not configured yet. Add the required Supabase environment variables and restart the dev server."
  } else {
    try {
      snapshot = await getDashboardSnapshot({
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
      })
    } catch (error) {
      logWarn("dashboard.bootstrap_fallback", {
        workosUserId: user.id,
        email: user.email,
        reason:
          error instanceof Error ? error.message : "Unknown dashboard bootstrap error",
      })
      infrastructureMessage =
        "Your WorkOS session is valid, but the application database could not be initialized. Confirm the Supabase environment variables and apply the initial schema migration."
    }
  }

  const displayName = user.firstName?.trim() || user.email.split("@")[0]
  const greeting = pickGreeting(displayName)
  const profile = snapshot?.profile ?? null
  const latestPlaylists = snapshot?.latestPlaylists ?? []

  return (
    <>
      {profile ? <AnalyticsIdentify profileId={profile.id} /> : null}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10">
        <header className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(162,77,224,0.14),rgba(12,9,23,0.92))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {greeting}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Upload a set, get its energy curve, set score, and concrete fixes
              per track.
            </p>
          </div>
        </header>

        {infrastructureMessage ? (
          <Alert className="border-white/10 bg-[#0C0917] text-white">
            <Database className="size-4 text-white/72" />
            <AlertTitle>Database setup still needs attention</AlertTitle>
            <AlertDescription className="text-white/62">
              {infrastructureMessage}
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Primary action: upload a playlist. New-from-scratch is the quieter,
            secondary path underneath. */}
        <section className="space-y-3">
          <PlaylistImportUpload />
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/56">
            <span>Prefer to build it by hand?</span>
            <Link
              href="/dashboard/playlists"
              className="inline-flex items-center gap-1.5 font-medium text-white underline decoration-white/24 underline-offset-4 transition hover:text-[#7DE6F7]"
            >
              <Plus className="size-3.5" />
              New playlist from scratch
            </Link>
          </div>
        </section>

        {latestPlaylists.length > 0 ? (
          <section className="rounded-[28px] border border-white/10 bg-[#0C0917] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/42">
                  Latest playlists
                </p>
                <h2 className="mt-2 font-heading text-xl font-semibold text-white">
                  Pick up where you left off
                </h2>
              </div>
              <Link
                href="/dashboard/playlists"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-white/10 bg-white/[0.04] text-white hover:border-white/16 hover:bg-white/[0.07]"
                )}
              >
                View all
              </Link>
            </div>

            <ul className="divide-y divide-white/8">
              {latestPlaylists.map((playlist) => {
                const genreLabel = playlist.genre
                  ? GENRE_LABELS[
                      playlist.genre as keyof typeof GENRE_LABELS
                    ] ?? playlist.genre
                  : null
                const latestScore =
                  playlist.scoreHistory.length > 0
                    ? playlist.scoreHistory[playlist.scoreHistory.length - 1]
                    : null

                return (
                  <li
                    key={playlist.id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-white">
                          {playlist.name}
                        </p>
                        {latestScore !== null ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-xs text-white/70">
                            <TrendingUp className="size-3 text-white/45" />
                            {latestScore}/10
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-white/48">
                        {playlist.trackCount} track
                        {playlist.trackCount === 1 ? "" : "s"}
                        {genreLabel ? ` · ${genreLabel}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {playlist.scoreHistory.length > 1 ? (
                        <div className="hidden sm:block">
                          <ScoreSparkline scores={playlist.scoreHistory} />
                        </div>
                      ) : null}
                      <Link
                        href={`/dashboard/playlists/${playlist.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "xs" }),
                          "border-white/10 bg-white/[0.04] text-white hover:border-white/16"
                        )}
                      >
                        <Pencil className="size-3" />
                        Edit
                      </Link>
                      <Link
                        href={`/dashboard/playlists/${playlist.id}/analysis`}
                        className={cn(buttonVariants({ size: "xs" }))}
                      >
                        Analyze
                      </Link>
                      <DeletePlaylistButton
                        playlistId={playlist.id}
                        playlistName={playlist.name}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  )
}
