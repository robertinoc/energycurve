import Link from "next/link"
import {
  ArrowRight,
  Database,
  FileText,
  ShieldCheck,
  Waves,
} from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
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
    title: "Curve-first brand signal",
    description:
      "A minimal waveform mark gives EnergyCurve an ownable visual cue before deeper product workflows arrive.",
    icon: Waves,
  },
  {
    title: "Hosted auth foundation",
    description:
      "WorkOS AuthKit handles sign-in, sign-up, callbacks, logout, and route protection without leaking secrets to the client.",
    icon: ShieldCheck,
  },
  {
    title: "App data scaffold",
    description:
      "Supabase Postgres is ready for profiles, playlists, and tracks so future product work starts from stable primitives.",
    icon: Database,
  },
] as const

export function FoundationOverview() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B0F] px-6 py-8 text-white lg:px-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#8B5CFF]/28 blur-3xl" />
        <div className="absolute right-[-4rem] top-20 h-96 w-96 rounded-full bg-[#24E4FF]/16 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <EnergyCurveLogo
                  tone="light"
                  size="lg"
                  caption="DJ set intelligence"
                />
                <span className="inline-flex w-fit items-center rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.24em] text-white/60">
                  Brand foundation pass 01
                </span>
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                  Track the rise. Shape the release.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                  EnergyCurve is the DJ workspace for planning momentum across a
                  set. This pass introduces the first visual signature alongside
                  the setup already in place for auth, routing, and application
                  data.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "justify-between rounded-2xl border-0 bg-linear-to-r from-[#8B5CFF] to-[#24E4FF] px-5 text-[#06111D] hover:opacity-92"
                  )}
                >
                  Create an account
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "rounded-2xl border-white/14 bg-white/[0.03] px-5 text-white hover:bg-white/[0.08] hover:text-white"
                  )}
                >
                  Sign in
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/48">
                    Visual motif
                  </p>
                  <p className="mt-2 text-lg font-medium text-white">
                    Smooth energy wave
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/48">
                    Palette
                  </p>
                  <p className="mt-2 text-lg font-medium text-white">
                    Violet to cyan neon
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/48">
                    Ready now
                  </p>
                  <p className="mt-2 text-lg font-medium text-white">
                    SVG mark + app icon
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/28 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">
                    ISO logo system
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/58">
                    Designed to stay legible at app-icon size while still
                    feeling like nightlife software instead of generic SaaS.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <FileText className="size-5 text-white/64" />
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="rounded-[1.5rem] border border-white/10 bg-[#0B0B0F] p-6">
                  <EnergyCurveLogo
                    variant="gradient"
                    tone="light"
                    size="xl"
                    withWordmark={false}
                  />
                  <p className="mt-5 text-sm font-medium text-white">
                    Gradient mark
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/58">
                    A single rounded waveform carries the core idea: a set that
                    rises, falls, and releases energy with intention.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-5">
                    <EnergyCurveLogo
                      variant="mono"
                      tone="light"
                      size="md"
                      withWordmark={false}
                    />
                    <p className="mt-4 text-sm font-medium text-white">
                      Monochrome fallback
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/56">
                      A clean white-on-night version is ready for constrained UI
                      surfaces and export use.
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                      App icon
                    </p>
                    <p className="mt-3 text-lg font-medium text-white">
                      Already wired
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/56">
                      The gradient mark is also used as the browser icon through
                      `app/icon.svg`.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <Card
              key={title}
              className="border-white/10 bg-white/[0.04] text-white ring-0"
            >
              <CardHeader>
                <CardTitle className="text-white">{title}</CardTitle>
                <CardDescription className="text-white/62">
                  {description}
                </CardDescription>
                <CardAction>
                  <Icon className="size-5 text-white/54" />
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-white/10 bg-white/[0.04] text-white ring-0">
            <CardHeader>
              <CardTitle className="text-white">Current scope</CardTitle>
              <CardDescription className="text-white/62">
                Product logic is still intentionally deferred, but the product
                identity no longer has to wait.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-white/64">
              <p>
                Included now: logo assets, favicon, branded landing surface,
                authentication, protected routes, data model, and technical
                documentation.
              </p>
              <p>
                Deferred on purpose: playlist ingestion, BPM workflows, energy
                scoring, imports, exports, and collaboration logic.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.04] text-white ring-0">
            <CardHeader>
              <CardTitle className="text-white">Design direction</CardTitle>
              <CardDescription className="text-white/62">
                The visual system starts from club-light contrast, not generic
                productivity software.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-white/64">
              <p>
                Dark surfaces establish the nightlife context while the neon
                gradient carries motion and energy without resorting to obvious
                DJ clichés.
              </p>
              <p>
                The first goal is recognition and mood. Broader UI styling can
                expand later from the same mark, palette, and motion concept.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
