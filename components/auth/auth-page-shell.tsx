import { ArrowRight, LockKeyhole } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
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
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B0F] px-6 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-4rem] h-72 w-72 rounded-full bg-[#7B3FE4]/24 blur-3xl" />
        <div className="absolute right-[-4rem] top-16 h-80 w-80 rounded-full bg-[#00D1FF]/16 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:68px_68px] opacity-20" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <EnergyCurveLogo tone="light" size="lg" kind="horizontal" caption={eyebrow} />

          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-white/68 sm:text-lg">
              {description}
            </p>
          </div>

          <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
            <a
              href={primaryHref}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full justify-between rounded-2xl border-0 bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] px-4 text-[#071018] hover:opacity-92"
              )}
            >
              {primaryLabel}
              <ArrowRight className="size-4" />
            </a>

            <a
              href={secondaryHref}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "w-full rounded-2xl border-white/14 bg-white/[0.03] px-4 text-white hover:bg-white/[0.08] hover:text-white"
              )}
            >
              {secondaryLabel}
            </a>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 shadow-sm backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#0B0B0F] p-2">
                <LockKeyhole className="size-4 text-white/70" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">Setup-only foundation</p>
                <p className="text-sm leading-6 text-white/60">
                  {hint}
                </p>
              </div>
            </div>
          </div>
        </section>

        <Card className="border-white/10 bg-white/[0.05] text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] ring-0">
          <CardHeader>
            <CardTitle className="text-white">Why this flow exists</CardTitle>
            <CardDescription className="text-white/62">
              EnergyCurve keeps authentication and application data separated on
              purpose.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertTitle && alertDescription ? (
              <Alert className="border-white/10 bg-black/25 text-white">
                <LockKeyhole className="size-4 text-white/70" />
                <AlertTitle>{alertTitle}</AlertTitle>
                <AlertDescription className="text-white/62">
                  {alertDescription}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-3 text-sm leading-6 text-white/62">
              <p>WorkOS AuthKit handles sign-in, sign-up, callbacks, and logout.</p>
              <p>
                Supabase Postgres is reserved for app data such as profiles,
                playlists, and tracks.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">
                  Protected route behavior
                </p>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Unauthenticated requests to `/dashboard` are redirected to the
                  login page and validated again on the server.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">
                  Profile synchronization
                </p>
                <p className="mt-2 text-sm leading-6 text-white/58">
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
