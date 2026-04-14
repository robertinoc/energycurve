import Link from "next/link"
import {
  ArrowRight,
  AudioLines,
  Gauge,
  Orbit,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { EnergyCurveHeroVisual } from "@/components/marketing/energy-curve-hero-visual"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const featureCards = [
  {
    title: "See the set arc before the room does",
    description:
      "Map energy intentionally instead of improvising every transition when the pressure is already live.",
    icon: Gauge,
  },
  {
    title: "Shape tension with precision",
    description:
      "Use the curve as a control surface for lifts, fake-outs, resets, and final-release moments.",
    icon: AudioLines,
  },
  {
    title: "Keep the tech invisible",
    description:
      "Hosted auth, protected routes, and app data are already handled so the product can grow without foundation churn.",
    icon: ShieldCheck,
  },
] as const

const differentiators = [
  {
    eyebrow: "Plan momentum",
    title: "Not just playlists. A pressure map for the night.",
    description:
      "EnergyCurve is designed around motion, not just track storage. Think in waves, not lists.",
    icon: Orbit,
  },
  {
    eyebrow: "Move faster",
    title: "Build a set shape in minutes, not in your head at 2 AM.",
    description:
      "The interface is built to expose spikes, dips, and pacing mistakes before they hit the crowd.",
    icon: Sparkles,
  },
  {
    eyebrow: "Stay sharp",
    title: "Sleek enough for modern SaaS. Edgy enough for after-hours culture.",
    description:
      "Linear discipline, Stripe clarity, and just enough nightlife voltage to feel like a music-tech product instead of another admin tool.",
    icon: WandSparkles,
  },
] as const

const placeholderLogos = [
  "Night Rooms",
  "Afterform",
  "Pulse Unit",
  "Basement FM",
] as const

export function FoundationOverview() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B0F] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-[-4rem] h-96 w-96 rounded-full bg-[#7B3FE4]/26 blur-3xl" />
        <div className="absolute right-[-8rem] top-10 h-[28rem] w-[28rem] rounded-full bg-[#00D1FF]/12 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#FF2D75]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur">
          <EnergyCurveLogo tone="light" size="md" caption="Set intelligence" />

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-white/72 hover:text-white"
              )}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] text-[#071018]"
              )}
            >
              Start free
            </Link>
          </div>
        </header>

        <section className="grid gap-8 pb-6 pt-4 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-white/56">
              From playlist prep to energy architecture
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl xl:text-7xl">
                Stop guessing the night.
                <span className="block bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] bg-clip-text text-transparent">
                  Design the curve.
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/66 sm:text-lg">
                EnergyCurve helps DJs shape the rise, release, and rebound of a
                set with the same clarity elite teams expect from modern SaaS.
                Built for nightlife pressure, not spreadsheet thinking.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "justify-between bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] px-5 text-[#071018]"
                )}
              >
                Start shaping your next set
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/10 bg-white/[0.03] px-5 text-white hover:border-white/18 hover:bg-white/[0.06]"
                )}
              >
                Explore the dashboard
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ValuePill label="Visual planning" value="Curve-first" />
              <ValuePill label="Auth & data" value="Already wired" />
              <ValuePill label="Product tone" value="SaaS x nightlife" />
            </div>
          </div>

          <EnergyCurveHeroVisual />
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">
                Social proof
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-white">
                Placeholder credibility while the product is still early
              </p>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/54">
              This strip is intentionally placeholder-only for now, but the
              layout is ready for artist logos, venue marks, or launch quotes.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {placeholderLogos.map((logo) => (
              <div
                key={logo}
                className="rounded-[20px] border border-white/8 bg-black/18 px-5 py-4 text-center text-sm uppercase tracking-[0.24em] text-white/42"
              >
                {logo}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <Card
              key={title}
              className="border-white/10 bg-white/[0.04] text-white ring-0"
            >
              <CardHeader>
                <CardTitle className="text-white">{title}</CardTitle>
                <CardDescription className="text-white/60">
                  {description}
                </CardDescription>
                <CardAction>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <Icon className="size-5 text-white/60" />
                  </div>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {differentiators.map(({ eyebrow, title, description, icon: Icon }) => (
            <Card
              key={title}
              className="border-white/10 bg-[#14141B]/90 text-white ring-0"
            >
              <CardHeader>
                <CardDescription className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                  {eyebrow}
                </CardDescription>
                <CardTitle className="text-2xl text-white">{title}</CardTitle>
                <CardDescription className="text-base leading-7 text-white/60">
                  {description}
                </CardDescription>
                <CardAction>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <Icon className="size-5 text-white/56" />
                  </div>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="rounded-[32px] border border-white/10 bg-linear-to-r from-[#15131E] via-[#101823] to-[#18101B] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/42">
                Final call
              </p>
              <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                If your set has an arc, your software should too.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-white/62">
                EnergyCurve is ready to move from infrastructure into product.
                The visual system, auth foundation, and data model are already
                in place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "justify-between bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] px-5 text-[#071018]"
                )}
              >
                Create your account
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/10 bg-white/[0.03] px-5 text-white"
                )}
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function ValuePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/40">
        {label}
      </p>
      <p className="mt-2 font-heading text-lg font-semibold text-white">
        {value}
      </p>
    </div>
  )
}
