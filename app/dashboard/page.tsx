import { signOut, withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import {
  Activity,
  Database,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { redirect } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"
import { getDashboardSnapshot } from "@/services/dashboard-service"
import { SetupRequiredState } from "@/components/setup/setup-required-state"
import {
  getGenericWorkOSConfigurationIssue,
  logWorkOSRuntimeError,
} from "@/lib/auth/workos-runtime"

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
      console.warn("Dashboard bootstrap fallback:", error)
      infrastructureMessage =
        "Your WorkOS session is valid, but the application database could not be initialized. Confirm the Supabase environment variables and apply the initial schema migration."
    }
  }

  const displayName = user.firstName?.trim() || user.email.split("@")[0]
  const profile = snapshot?.profile ?? null

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,1),_rgba(248,250,252,1)_40%,_rgba(226,232,240,1)_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Protected foundation route
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Welcome back, {displayName}
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                This dashboard is intentionally limited to infrastructure
                concerns: authenticated access, session-aware rendering, and
                safe database initialization for future product work.
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="lg">
              Log out
            </Button>
          </form>
        </header>

        {infrastructureMessage ? (
          <Alert>
            <Database className="size-4" />
            <AlertTitle>Database setup still needs attention</AlertTitle>
            <AlertDescription>{infrastructureMessage}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border/60 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>Authenticated session</CardTitle>
              <CardDescription>
                WorkOS is managing the secure session lifecycle for this route.
              </CardDescription>
              <CardAction>
                <ShieldCheck className="size-5 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Email
                </p>
                <p className="font-medium">{user.email}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  WorkOS user ID
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {user.id}
                </p>
              </div>
            </CardContent>
            <CardFooter className="text-muted-foreground">
              Route protection is enforced in both `proxy.ts` and the server
              component.
            </CardFooter>
          </Card>

          <Card className="border-border/60 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>Profile sync</CardTitle>
              <CardDescription>
                App-level identity is stored separately from the auth provider.
              </CardDescription>
              <CardAction>
                <UserRound className="size-5 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Status
                </p>
                <p className="font-medium">
                  {profile ? "Synchronized" : "Pending database setup"}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Profile ID
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {profile?.id ?? "Available after the first successful sync"}
                </p>
              </div>
            </CardContent>
            <CardFooter className="text-muted-foreground">
              `profiles.workos_user_id` is the bridge between WorkOS users and
              application data.
            </CardFooter>
          </Card>

          <Card className="border-border/60 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>App data scaffold</CardTitle>
              <CardDescription>
                The initial schema is ready for profiles, playlists, and tracks.
              </CardDescription>
              <CardAction>
                <Activity className="size-5 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Playlists
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {snapshot?.playlistCount ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Tracks
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {snapshot?.trackCount ?? 0}
                </p>
              </div>
            </CardContent>
            <CardFooter className="text-muted-foreground">
              Counts are server-rendered from Supabase with the service role key
              kept off the client.
            </CardFooter>
          </Card>
        </section>

        <Card className="border-border/60 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>What is ready today</CardTitle>
            <CardDescription>
              The foundation is in place so future product work can stay focused
              on DJ workflows instead of infrastructure rework.
            </CardDescription>
            <CardAction>
              <LayoutDashboard className="size-5 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
              <p className="text-sm font-medium">Included now</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>Official WorkOS AuthKit integration for App Router</li>
                <li>Protected dashboard route with server validation</li>
                <li>Supabase schema and server-only data access helpers</li>
                <li>Documentation for local setup, deployment, and validation</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-5">
              <p className="text-sm font-medium">Explicitly deferred</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>Playlist ingestion and file parsing</li>
                <li>Track analysis, BPM extraction, and energy scoring logic</li>
                <li>Collaborative features, sharing, and export flows</li>
                <li>Any client-side database access or RLS policy design</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
