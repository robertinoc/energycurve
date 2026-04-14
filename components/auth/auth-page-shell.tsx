import Link from "next/link"
import { ArrowRight, LockKeyhole } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface AuthPageShellProps {
  eyebrow: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
  hint: string
  alertTitle?: string
  alertDescription?: string
}

export function AuthPageShell({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  hint,
  alertTitle,
  alertDescription,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,1),_rgba(248,250,252,1)_45%,_rgba(226,232,240,1)_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </span>

          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
          </div>

          <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
            <a
              href={primaryHref}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full justify-between rounded-2xl px-4"
              )}
            >
              {primaryLabel}
              <ArrowRight className="size-4" />
            </a>

            <Link
              href={secondaryHref}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "w-full rounded-2xl px-4"
              )}
            >
              {secondaryLabel}
            </Link>
          </div>

          <div className="rounded-[1.75rem] border border-border/60 bg-card/85 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-2">
                <LockKeyhole className="size-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Setup-only foundation</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {hint}
                </p>
              </div>
            </div>
          </div>
        </section>

        <Card className="border-border/60 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Why this flow exists</CardTitle>
            <CardDescription>
              EnergyCurve keeps authentication and application data separated on
              purpose.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertTitle && alertDescription ? (
              <Alert>
                <LockKeyhole className="size-4" />
                <AlertTitle>{alertTitle}</AlertTitle>
                <AlertDescription>{alertDescription}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>WorkOS AuthKit handles sign-in, sign-up, callbacks, and logout.</p>
              <p>
                Supabase Postgres is reserved for app data such as profiles,
                playlists, and tracks.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <p className="text-sm font-medium">Protected route behavior</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Unauthenticated requests to `/dashboard` are redirected to the
                  login page and validated again on the server.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <p className="text-sm font-medium">Profile synchronization</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  A successful callback syncs the authenticated user into the
                  `profiles` table without leaking database credentials to the
                  client.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
