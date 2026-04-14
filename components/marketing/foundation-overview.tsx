import Link from "next/link"
import {
  ArrowRight,
  Database,
  FileText,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const pillars = [
  {
    title: "WorkOS authentication",
    description:
      "Hosted sign-in, sign-up, callback handling, session management, logout, and protected route enforcement.",
    icon: ShieldCheck,
  },
  {
    title: "Supabase application data",
    description:
      "A server-only data access layer backed by an initial Postgres schema for profiles, playlists, and tracks.",
    icon: Database,
  },
  {
    title: "Operational clarity",
    description:
      "Project documentation, environment guidance, deployment notes, and a manual validation checklist for infrastructure work.",
    icon: FileText,
  },
] as const

export function FoundationOverview() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,1),_rgba(248,250,252,1)_38%,_rgba(226,232,240,1)_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/85 p-8 shadow-sm backdrop-blur sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Setup & infrastructure only
              </span>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  EnergyCurve is ready for product development without
                  improvising the foundation later.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  This phase intentionally stops at the platform layer. The app
                  now has authentication, protected routing, Supabase data
                  access, a clean project structure, and documentation that
                  explains how to keep it stable.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "justify-between rounded-2xl px-4"
                  )}
                >
                  Create an account
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "rounded-2xl px-4"
                  )}
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/60 bg-background/75 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Protected dashboard</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ready to prove the auth and data layers are connected.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-3">
                  <LayoutDashboard className="size-5 text-muted-foreground" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    App Router
                  </p>
                  <p className="mt-2 text-lg font-semibold">Next.js 16</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Auth
                  </p>
                  <p className="mt-2 text-lg font-semibold">WorkOS AuthKit</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Data
                  </p>
                  <p className="mt-2 text-lg font-semibold">Supabase Postgres</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <Card
              key={title}
              className="border-border/60 bg-card/90 shadow-sm"
            >
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
                <CardAction>
                  <Icon className="size-5 text-muted-foreground" />
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>Current scope</CardTitle>
              <CardDescription>
                Product logic is intentionally postponed so the technical base
                stays clean.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Included now: auth, protected routes, session handling, data model, docs, and deployment readiness.</p>
              <p>Deferred on purpose: playlist analysis, BPM workflows, energy scoring, imports, exports, and collaborative features.</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>Foundation goals</CardTitle>
              <CardDescription>
                Simplicity first, but without painting future work into a
                corner.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Auth and app data are separated so vendor choices stay flexible.</p>
              <p>Server-side validation is used for protected access and database writes.</p>
              <p>Documentation lives next to the code so future changes stay deliberate.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
