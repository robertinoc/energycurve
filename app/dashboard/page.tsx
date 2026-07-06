import { signOut, withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import Link from "next/link"
import { Database, ListMusic, ShieldCheck, UserRound, Waves } from "lucide-react"
import { redirect } from "next/navigation"

import { AnalyticsIdentify } from "@/components/analytics/analytics-tracker"
import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { ScoreSparkline } from "@/components/analysis/score-sparkline"
import { EnergyCurveDashboard } from "@/components/dashboard/energy-curve-dashboard"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { SetupRequiredState } from "@/components/setup/setup-required-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buildReturnToHref } from "@/lib/auth/return-to"
import {
  getGenericWorkOSConfigurationIssue,
  logWorkOSRuntimeError,
} from "@/lib/auth/workos-runtime"
import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"
import { logWarn } from "@/lib/observability/logger"
import { cn } from "@/lib/utils"
import { pickGreeting } from "@/lib/content/greetings"
import { getDashboardSnapshot } from "@/services/dashboard-service"

export const metadata: Metadata = {
  title: "Dashboard",
}

export const dynamic = "force-dynamic"

async function logoutAction() {
  "use server"

  try {
    await signOut({ returnTo: "/" })
  } catch (error) {
    logWorkOSRuntimeError("Logout failed", error)
    redirect("/")
  }
}

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

  return (
    <main className="min-h-screen bg-[#08050F] text-white">
      {profile ? <AnalyticsIdentify profileId={profile.id} /> : null}
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
        <header className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(162,77,224,0.14),rgba(12,9,23,0.92))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <EnergyCurveLogo
                  tone="light"
                  size="md"
                  kind="horizontal"
                  caption="Authenticated workspace"
                />
                <div className="space-y-3">
                  <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/42">
                    Dashboard preview
                  </div>
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                    {greeting}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                    Create a playlist, load your tracklist, and analyze the
                    flow: energy curve, set score, and concrete
                    recommendations per track.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/playlists"
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  <ListMusic className="size-4" />
                  My playlists
                </Link>
                <form action={logoutAction}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    className="border-white/10 bg-white/[0.04] text-white hover:border-white/16 hover:bg-white/[0.07]"
                  >
                    Log out
                  </Button>
                </form>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/38">
                  Persona
                </p>
                <p className="mt-3 font-heading text-xl text-white">Intelligent nightlife tooling</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/38">
                  Mission
                </p>
                <p className="mt-3 font-heading text-xl text-white">Shape the curve. Own the dancefloor.</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/38">
                  Session mode
                </p>
                <p className="mt-3 font-heading text-xl text-white">Curve planning</p>
              </div>
            </div>
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

        {snapshot && snapshot.playlistCount === 0 ? (
          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(162,77,224,0.10),rgba(12,9,23,0.94))] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-white/42">
              Getting started
            </p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-white">
              Analyze your first set in three steps
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Create a playlist",
                  body: "Name your set and pick its genre and context — the engine adapts to both.",
                },
                {
                  step: "2",
                  title: "Load your tracklist",
                  body: "Paste it straight from Rekordbox or Serato — BPMs in the text are picked up automatically.",
                },
                {
                  step: "3",
                  title: "Hit Analyze",
                  body: "Get your energy curve, set score, and concrete fixes per track.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-[22px] border border-white/10 bg-black/18 p-4"
                >
                  <span className="flex size-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] font-mono text-xs text-white/72">
                    {item.step}
                  </span>
                  <p className="mt-3 text-sm font-medium text-white">
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-white/52">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/playlists"
                className={cn(buttonVariants({ size: "default" }))}
              >
                <ListMusic className="size-4" />
                Create your first playlist
              </Link>
            </div>
          </section>
        ) : null}

        {snapshot && snapshot.playlistCount > 0 ? <QuickActions /> : null}

        {snapshot && snapshot.latestPlaylists.length > 0 ? (
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.latestPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="flex flex-col justify-between gap-3 rounded-[22px] border border-white/10 bg-black/18 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {playlist.name}
                      </p>
                      <p className="mt-1 text-xs text-white/48">
                        {playlist.trackCount} track(s)
                        {playlist.genre ? ` · ${playlist.genre}` : ""}
                        {playlist.context ? ` · ${playlist.context}` : ""}
                      </p>
                    </div>
                    {playlist.scoreHistory.length > 0 ? (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <ScoreSparkline scores={playlist.scoreHistory} />
                        <span className="font-mono text-xs text-white/52">
                          {
                            playlist.scoreHistory[
                              playlist.scoreHistory.length - 1
                            ]
                          }
                          /10
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/playlists/${playlist.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "xs" }),
                        "border-white/10 bg-white/[0.04] text-white hover:border-white/16"
                      )}
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/dashboard/playlists/${playlist.id}/analysis`}
                      className={cn(buttonVariants({ size: "xs" }))}
                    >
                      Analyze
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <EnergyCurveDashboard
          playlistCount={snapshot?.playlistCount ?? 0}
          trackCount={snapshot?.trackCount ?? 0}
        />

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-white/10 bg-[#0C0917] text-white ring-0">
            <CardHeader>
              <CardTitle className="text-white">Authenticated session</CardTitle>
              <CardDescription className="text-white/58">
                WorkOS is handling the secure session lifecycle for this route.
              </CardDescription>
              <CardAction>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <ShieldCheck className="size-5 text-white/58" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Email
                </p>
                <p className="mt-2 text-sm text-white">{user.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/38">
                  WorkOS user ID
                </p>
                <p className="mt-2 font-mono text-xs text-white/62">{user.id}</p>
              </div>
            </CardContent>
            <CardFooter className="border-white/8 bg-white/[0.03] text-white/48">
              Route protection is enforced in both `proxy.ts` and the server
              component.
            </CardFooter>
          </Card>

          <Card className="border-white/10 bg-[#0C0917] text-white ring-0">
            <CardHeader>
              <CardTitle className="text-white">Profile sync</CardTitle>
              <CardDescription className="text-white/58">
                App identity stays separate from the auth provider.
              </CardDescription>
              <CardAction>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <UserRound className="size-5 text-white/58" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Status
                </p>
                <p className="mt-2 text-sm text-white">
                  {profile ? "Synchronized" : "Pending database setup"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/38">
                  Profile ID
                </p>
                <p className="mt-2 font-mono text-xs text-white/62">
                  {profile?.id ?? "Available after the first successful sync"}
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-white/8 bg-white/[0.03] text-white/48">
              `profiles.workos_user_id` bridges WorkOS users and application
              data.
            </CardFooter>
          </Card>

          <Card className="border-white/10 bg-[#0C0917] text-white ring-0">
            <CardHeader>
              <CardTitle className="text-white">What this screen is</CardTitle>
              <CardDescription className="text-white/58">
                A branded product-facing preview layered on top of the
                infrastructure foundation.
              </CardDescription>
              <CardAction>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <Waves className="size-5 text-white/58" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-white/58">
              <p>
                The demo curve below is an illustrative example of the set map.
                Your real curves live under each playlist&apos;s Analyze view.
              </p>
              <p>
                Authentication, route protection, session persistence, and
                profile sync are fully real underneath.
              </p>
            </CardContent>
            <CardFooter className="border-white/8 bg-white/[0.03] text-white/48">
              Playlist ingestion, energy scoring, and set analysis are live —
              start from “My playlists”.
            </CardFooter>
          </Card>
        </section>
      </div>
    </main>
  )
}
