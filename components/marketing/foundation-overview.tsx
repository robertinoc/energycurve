import Link from "next/link"

import {
  ArrowRight,
  BarChart3,
  Brain,
  GitBranch,
  Headphones,
  LineChart,
  Mail,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { EnergyCurveHeroVisual } from "@/components/marketing/energy-curve-hero-visual"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSiteCopy } from "@/lib/content/site-copy"
import { cn } from "@/lib/utils"

const brandTraits = [
  { label: "Intelligent", icon: Brain },
  { label: "Creative", icon: Headphones },
  { label: "Nightlife", icon: Zap },
] as const

const featureIcons = [LineChart, GitBranch, Sparkles, BarChart3, Waves] as const

export function FoundationOverview() {
  const locale = "en"
  const copy = getSiteCopy(locale)
  const loginHref = "/login?returnTo=%2Fdashboard"
  const signupHref = "/signup?returnTo=%2Fdashboard"
  const navItems = [
    { href: "#features", label: copy.nav.features },
    { href: "#how-it-works", label: copy.nav.how },
    { href: "#story", label: copy.nav.story },
    { href: "#contact", label: copy.nav.contact },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B0F] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(circle_at_50%_0%,rgba(123,63,228,0.4),transparent_36%),radial-gradient(circle_at_68%_18%,rgba(255,45,117,0.18),transparent_24%),radial-gradient(circle_at_28%_18%,rgba(0,209,255,0.18),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-15" />
        <div className="absolute inset-x-0 top-16 h-px bg-linear-to-r from-transparent via-[#7B3FE4]/34 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur">
          <EnergyCurveLogo tone="light" size="md" caption="Set intelligence" />
          <nav aria-label="Primary" className="hidden items-center gap-5 text-sm text-white/60 lg:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
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
              {copy.nav.cta}
            </Link>
          </div>
        </header>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.38)] backdrop-blur">
          <div className="rounded-[26px] border border-[#FF2D75]/16 bg-[linear-gradient(180deg,rgba(123,63,228,0.18),rgba(9,9,15,0.98))] px-5 py-7 shadow-[0_0_90px_rgba(123,63,228,0.12)]">
            <div className="flex flex-col items-center gap-5 text-center">
              <EnergyCurveLogo tone="light" size="xl" />
              <div className="grid w-full gap-4 rounded-[22px] border border-white/8 bg-black/18 px-5 py-5 lg:grid-cols-[0.9fr_1.1fr_0.7fr]">
                <div className="space-y-3 text-left">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                    Brand Personality
                  </p>
                  {brandTraits.map(({ label, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 text-white/70">
                      <div className="rounded-xl border border-white/8 bg-white/[0.04] p-2">
                        <Icon className="size-4 text-[#C06BFF]" />
                      </div>
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-y border-white/8 py-4 text-left lg:border-x lg:border-y-0 lg:px-5 lg:py-0">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                    Tagline
                  </p>
                  <p className="text-2xl font-heading font-semibold leading-tight text-white">
                    Shape the curve.
                    <br />
                    Own the dancefloor.
                  </p>
                </div>

                <div className="space-y-3 text-left">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                    Positioning
                  </p>
                  <p className="text-sm leading-6 text-white/68">
                    Music-tech for DJs who want more than track management.
                  </p>
                </div>
              </div>

              <div className="mt-2 max-w-4xl space-y-4">
                <h1 className="text-balance text-4xl font-heading font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {copy.hero.title}
                </h1>
                <p className="mx-auto max-w-3xl text-base leading-7 text-white/68 sm:text-lg">
                  {copy.hero.subtitle}
                </p>
                <p className="mx-auto max-w-3xl text-sm leading-6 text-white/46">
                  {copy.hero.support}
                </p>
              </div>

              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href={signupHref}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "justify-between bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] px-5 text-[#071018]"
                  )}
                >
                  {copy.hero.cta.primary}
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-white/10 bg-white/[0.03] px-5 text-white"
                  )}
                >
                  {copy.hero.cta.secondary}
                </a>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/8 bg-black/18 p-3">
              <EnergyCurveHeroVisual />
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-24 space-y-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
        >
          <div className="space-y-3">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
              {copy.nav.features}
            </p>
            <h2 className="text-3xl font-heading font-semibold text-white sm:text-4xl">
              {copy.features.title}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {copy.features.cards.map((feature, index) => {
              const Icon = featureIcons[index % featureIcons.length]

              return (
                <Card
                  key={feature.key}
                  className="border-white/10 bg-white/[0.03] text-white ring-0"
                >
                  <CardHeader className="gap-3">
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <Icon className="size-5 text-white/66" />
                      </div>
                      <span className="text-[0.68rem] uppercase tracking-[0.2em] text-white/28">
                        0{index + 1}
                      </span>
                    </div>
                    <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                    <CardDescription className="text-white/60">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(123,63,228,0.18),rgba(0,209,255,0.08),rgba(255,45,117,0.14))] p-6">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
              Differentiation
            </p>
            <h3 className="mt-3 text-2xl font-heading font-semibold text-white">
              {copy.diff.title}
            </h3>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/68">
              {copy.diff.body}
            </p>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-24 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <Card className="border-white/10 bg-white/[0.03] text-white ring-0">
            <CardHeader className="space-y-3">
              <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
                {copy.nav.how}
              </p>
              <CardTitle className="text-3xl text-white sm:text-4xl">
                {copy.how.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {copy.how.steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[22px] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white/78">
                      0{index + 1}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-white">{step.title}</h3>
                      <p className="text-sm leading-6 text-white/62">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/10 bg-white/[0.03] text-white ring-0">
            <CardHeader>
              <CardTitle className="text-white">EnergyCurve desktop preview</CardTitle>
              <CardDescription className="text-white/56">
                Graph-led feedback makes the full set easier to read and refine.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(123,63,228,0.22),transparent_28%),#111118] p-4">
                <div className="rounded-[16px] border border-white/8 bg-black/20 p-3">
                  <EnergyCurveHeroVisual />
                </div>
              </div>
              <Link
                href={signupHref}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full justify-between bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] text-[#071018]"
                )}
              >
                {copy.how.cta}
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </section>

        <section
          id="story"
          className="scroll-mt-24 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <Card className="border-white/10 bg-white/[0.03] text-white ring-0">
            <CardHeader className="space-y-3">
              <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
                {copy.nav.story}
              </p>
              <CardTitle className="text-3xl text-white sm:text-4xl">
                {copy.story.title}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white ring-0">
            <CardContent className="space-y-4 pt-6">
              {copy.story.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-7 text-white/68">
                  {paragraph}
                </p>
              ))}
            </CardContent>
          </Card>
        </section>

        <section
          id="contact"
          className="scroll-mt-24 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <Card className="border-white/10 bg-white/[0.03] text-white ring-0">
            <CardHeader className="space-y-3">
              <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
                {copy.nav.contact}
              </p>
              <CardTitle className="text-3xl text-white sm:text-4xl">
                {copy.contact.title}
              </CardTitle>
              <CardDescription className="text-base leading-7 text-white/62">
                {copy.contact.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-3 text-white/70">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm text-white/48">Direct contact</p>
                    <a
                      href="mailto:hello@energycurve.app"
                      className="text-base font-medium text-white transition hover:text-[#76E7FF]"
                    >
                      hello@energycurve.app
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white ring-0">
            <CardContent className="pt-6">
              <form className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={copy.contact.form.name} placeholder={copy.contact.form.name} />
                  <Field label={copy.contact.form.email} placeholder={copy.contact.form.email} type="email" />
                </div>
                <Field
                  label={copy.contact.form.message}
                  placeholder={copy.contact.form.message}
                  multiline
                />
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full justify-between bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] text-[#071018]"
                  )}
                >
                  {copy.contact.form.submit}
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section
          id="early-access"
          className="scroll-mt-24 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(123,63,228,0.18),rgba(0,209,255,0.08),rgba(255,45,117,0.16))] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.3)]"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
                Early access
              </p>
              <h2 className="text-3xl font-heading font-semibold text-white sm:text-4xl">
                {copy.cta.title}
              </h2>
              <p className="text-base leading-7 text-white/68">
                {copy.cta.subtitle}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={signupHref}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "justify-between bg-[#0B0B0F] text-white hover:bg-[#12121A]"
                )}
              >
                {copy.cta.primary}
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#contact"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/14 bg-white/[0.03] text-white"
                )}
              >
                {copy.cta.secondary}
              </a>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-white/8 pt-6 text-sm text-white/46 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <span>{copy.footer.product}</span>
            <a href="#features" className="transition hover:text-white">
              {copy.footer.features}
            </a>
            <a href="#contact" className="transition hover:text-white">
              {copy.footer.contact}
            </a>
          </div>
          <p>{copy.footer.rights}</p>
        </footer>
      </div>
    </main>
  )
}

function Field({
  label,
  placeholder,
  type = "text",
  multiline = false,
}: {
  label: string
  placeholder: string
  type?: string
  multiline?: boolean
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-white/68">{label}</span>
      {multiline ? (
        <textarea
          rows={5}
          placeholder={placeholder}
          className="w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/18"
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          className="h-12 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/18"
        />
      )}
    </label>
  )
}
