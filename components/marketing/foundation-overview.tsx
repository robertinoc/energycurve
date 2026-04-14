import Link from "next/link"
import {
  ArrowRight,
  Brain,
  Headphones,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { EnergyCurveHeroVisual } from "@/components/marketing/energy-curve-hero-visual"
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

const featureCards = [
  {
    title: "Energy Scoring",
    description: "Every set gets a score.",
    icon: Sparkles,
  },
  {
    title: "Peak Detection",
    description: "Find the highs and drops.",
    icon: Waves,
  },
  {
    title: "Set Structure",
    description: "Build, peak, closing.",
    icon: Zap,
  },
] as const

const brandTraits = [
  { label: "Intelligent", icon: Brain },
  { label: "Creative", icon: Headphones },
  { label: "Nightlife", icon: Zap },
] as const

const brandColors = ["#7B3FE4", "#00D1FF", "#FF2D75", "#2A2A35"] as const

export function FoundationOverview() {
  const loginHref = "/login?returnTo=%2Fdashboard"
  const signupHref = "/signup?returnTo=%2Fdashboard"

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B0F] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_50%_0%,rgba(123,63,228,0.42),transparent_38%),radial-gradient(circle_at_67%_18%,rgba(255,45,117,0.18),transparent_24%),radial-gradient(circle_at_30%_18%,rgba(0,209,255,0.18),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-16" />
        <div className="absolute inset-x-0 top-16 h-px bg-linear-to-r from-transparent via-[#7B3FE4]/36 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur">
          <EnergyCurveLogo tone="light" size="md" caption="Set intelligence" />
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href={loginHref}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-white/72 hover:text-white"
              )}
            >
              Login
            </Link>
            <Link
              href={signupHref}
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] text-[#071018]"
              )}
            >
              Create your account
            </Link>
          </div>
        </header>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-7 shadow-[0_28px_80px_rgba(0,0,0,0.36)] backdrop-blur">
          <div className="flex flex-col items-center gap-5 text-center">
            <EnergyCurveLogo tone="light" size="xl" />
            <div className="h-px w-full max-w-5xl bg-linear-to-r from-transparent via-[#7B3FE4]/40 to-transparent" />
            <p className="text-2xl font-heading font-semibold tracking-tight text-white sm:text-3xl">
              Shape the curve. Own the dancefloor.
            </p>
          </div>

          <div className="mt-6 grid gap-0 rounded-[22px] border border-white/8 bg-black/18 lg:grid-cols-[1fr_1fr_220px]">
            <div className="border-b border-white/8 px-5 py-5 lg:border-b-0 lg:border-r">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                Brand Personality
              </p>
              <div className="mt-4 space-y-3">
                {brandTraits.map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 text-white/72">
                    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-2">
                      <Icon className="size-4 text-[#C06BFF]" />
                    </div>
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-white/8 px-5 py-5 lg:border-b-0 lg:border-r">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                Tagline
              </p>
              <p className="mt-4 text-2xl font-heading font-semibold leading-tight text-white">
                Shape the curve.
                <br />
                Own the dancefloor.
              </p>
            </div>

            <div className="px-5 py-5">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                Colors
              </p>
              <div className="mt-4 flex items-center gap-3">
                {brandColors.map((color) => (
                  <span
                    key={color}
                    className="h-10 w-10 rounded-xl border border-white/8"
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.38)] backdrop-blur">
          <div className="rounded-[24px] border border-[#FF2D75]/18 bg-[linear-gradient(180deg,rgba(123,63,228,0.22),rgba(12,12,18,0.96))] px-5 py-6 shadow-[0_0_90px_rgba(123,63,228,0.12)]">
            <div className="space-y-4 text-center">
              <h1 className="text-3xl font-heading font-semibold text-white sm:text-4xl">
                Shape the curve. Own the dancefloor.
              </h1>
              <p className="mx-auto max-w-2xl text-sm leading-6 text-white/64 sm:text-base">
                Analyze, design and optimize the energy of your DJ sets using
                real data, not guesswork at the booth.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href={signupHref}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "justify-between bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] px-5 text-[#071018]"
                  )}
                >
                  Create your account
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={loginHref}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-white/10 bg-white/[0.03] px-5 text-white"
                  )}
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-[22px] border border-white/8 bg-black/18 p-3">
              <EnergyCurveHeroVisual />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <Card
              key={title}
              className="border-white/10 bg-white/[0.03] text-white ring-0"
            >
              <CardHeader className="gap-3">
                <CardAction className="static justify-self-start">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <Icon className="size-5 text-white/62" />
                  </div>
                </CardAction>
                <CardTitle className="text-xl text-white">{title}</CardTitle>
                <CardDescription className="text-white/60">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden border-white/10 bg-white/[0.03] text-white ring-0">
            <CardHeader>
              <CardTitle className="text-white">EnergyCurve desktop preview</CardTitle>
              <CardDescription className="text-white/56">
                A showcase frame shaped to feel closer to the final product
                reveal: centered, luminous, and graph-led.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(123,63,228,0.22),transparent_28%),#111118] p-4">
                <div className="rounded-[16px] border border-white/8 bg-black/20 p-3">
                  <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <EnergyCurveLogo tone="light" size="sm" caption="Analysis screen" />
                      <p className="max-w-xl text-sm leading-6 text-white/56">
                        A reference composition for the core product surface:
                        graph first, metrics visible, and enough structure to
                        support quick booth decisions.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-right text-xs uppercase tracking-[0.16em] text-white/40">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        Average Energy
                        <p className="mt-1 font-heading text-2xl text-white">7.2</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        Peak Intensity
                        <p className="mt-1 font-heading text-2xl text-white">9.7</p>
                      </div>
                    </div>
                  </div>
                  <EnergyCurveHeroVisual />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white ring-0">
            <CardHeader>
              <CardTitle className="text-white">Set Analysis</CardTitle>
              <CardDescription className="text-white/56">
                A phone-like companion surface for reading the same set arc in a
                more focused, stacked format.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto w-full max-w-[280px] rounded-[34px] border border-white/10 bg-[#13131A] p-4 shadow-[0_0_48px_rgba(123,63,228,0.18)]">
                <div className="rounded-[24px] border border-white/10 bg-black/22 p-4">
                  <p className="text-sm font-medium text-white">Set Analysis</p>
                  <div className="mt-5 space-y-4">
                    <PhoneMetric label="Peak Energy" value="9.8" tone="pink" />
                    <PhoneMetric label="Flat Zone" value="3.2" tone="cyan" />
                    <PhoneMetric label="Drop Intensity" value="Very High" tone="violet" />
                  </div>

                  <div className="mt-6 space-y-2">
                    {["Opening", "Build-Up", "Peak", "Closing"].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/68"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

function PhoneMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "pink" | "cyan" | "violet"
}) {
  const toneClassName =
    tone === "pink"
      ? "from-[#FF2D75]/20 to-[#FF2D75]/4 text-[#FF7CAB]"
      : tone === "cyan"
        ? "from-[#00D1FF]/18 to-[#00D1FF]/4 text-[#76E7FF]"
        : "from-[#7B3FE4]/18 to-[#7B3FE4]/4 text-[#B28CFF]"

  return (
    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/40">
        {label}
      </p>
      <div className={cn("mt-3 rounded-xl bg-linear-to-r p-3", toneClassName)}>
        <p className="font-heading text-xl font-semibold">{value}</p>
      </div>
    </div>
  )
}
