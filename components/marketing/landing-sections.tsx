import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  CreditCard,
  GitBranch,
  Layers,
  LineChart,
  Mail,
  Sparkles,
  Waves,
} from "lucide-react"
import Link from "next/link"

import {
  AmbientGlow,
  EnergyWaveBackdrop,
} from "@/components/marketing/ambient-decor"
import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { CTAButton } from "@/components/marketing/cta-button"
import { LandingContactForm } from "@/components/marketing/landing-contact-form"
import { SectionContainer } from "@/components/marketing/section-container"
import { SectionReveal } from "@/components/marketing/section-reveal"
import { EnergyCurveHeroVisual } from "@/components/marketing/energy-curve-hero-visual"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResolvedSiteCopy } from "@/lib/content/site-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import { cn } from "@/lib/utils"

const featureIcons = [LineChart, GitBranch, Sparkles, BarChart3, Waves] as const

export function HeroSection({
  copy,
  signupHref,
}: {
  copy: ResolvedSiteCopy
  signupHref: string
}) {
  return (
    <SectionReveal>
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.38)] backdrop-blur">
        <AmbientGlow tone="violet" className="ambient-drift-slow left-[-6rem] top-[-5rem] h-[18rem] w-[18rem] opacity-55" />
        <AmbientGlow tone="cyan" className="ambient-drift-reverse right-[-4rem] top-[4rem] h-[18rem] w-[18rem] opacity-35" />
        <EnergyWaveBackdrop
          emphasis="hero"
          className="left-[8%] top-[18rem] h-[10rem] w-[84%] opacity-28"
        />
        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,31,0.96),rgba(8,5,15,0.98))] px-5 py-7 shadow-[0_0_60px_rgba(162,77,224,0.08)]">
          <div className="flex flex-col items-center gap-5 text-center">
            <EnergyCurveLogo tone="light" size="xl" kind="horizontal" priority />
            <div className="grid w-full gap-4 rounded-[22px] border border-white/8 bg-black/18 px-5 py-5 lg:grid-cols-[0.9fr_1.1fr_0.7fr]">
              <div className="space-y-3 text-left">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                  {copy.ui.builtFor}
                </p>
                {copy.hero.audienceTags.map((label, index) => (
                  <div key={label} className="flex items-center gap-3 text-white/70">
                    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-2">
                      {index === 0 ? (
                        <LineChart className="size-4 text-[#CDA2F1]" />
                      ) : index === 1 ? (
                        <Sparkles className="size-4 text-[#CDA2F1]" />
                      ) : (
                        <Waves className="size-4 text-[#CDA2F1]" />
                      )}
                    </div>
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-y border-white/8 py-4 text-left lg:border-x lg:border-y-0 lg:px-5 lg:py-0">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                  {copy.ui.firstOutput}
                </p>
                <p className="text-2xl font-heading font-semibold leading-tight text-white">
                  {copy.hero.support}
                </p>
              </div>

              <div className="space-y-3 text-left">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/38">
                  {copy.ui.whyTrust}
                </p>
                <div className="space-y-2 text-sm leading-6 text-white/68">
                  <p>{copy.ui.trustSignals.founder}</p>
                  <p>{copy.ui.trustSignals.workflows}</p>
                </div>
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
                {copy.hero.audienceLine}
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <CTAButton href={signupHref}>
                <>
                  {copy.hero.cta.primary}
                  <ArrowRight className="size-4" />
                </>
              </CTAButton>
              <a
                href="#how-it-works"
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4.5 text-sm text-white transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-card hover:shadow-[0_14px_36px_rgba(0,0,0,0.26),0_0_22px_rgba(34,211,238,0.08)]"
                )}
              >
                {copy.hero.cta.secondary}
              </a>
            </div>

            <p className="text-sm text-white/50">
              {copy.ui.trustSignals.founder} {copy.ui.trustSignals.access}
            </p>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/8 bg-black/18 p-3">
            <EnergyCurveHeroVisual labels={copy.hero.visual} />
          </div>
        </div>
      </section>
    </SectionReveal>
  )
}

export function FeaturesSection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
    <SectionReveal delay={50}>
      <SectionContainer
        id="features"
        className="space-y-5 bg-[linear-gradient(180deg,rgba(12,9,23,0.98),rgba(12,9,23,0.98)),radial-gradient(circle_at_12%_16%,rgba(162,77,224,0.14),transparent_28%),radial-gradient(circle_at_88%_28%,rgba(34,211,238,0.1),transparent_24%),radial-gradient(circle_at_52%_108%,rgba(255,94,138,0.08),transparent_28%)]"
      >
        <AmbientGlow tone="cyan" className="ambient-drift-reverse right-[-6rem] top-[-4rem] h-[16rem] w-[16rem] opacity-28" />
        <AmbientGlow tone="magenta" className="ambient-drift-slow left-[18%] top-[55%] h-[14rem] w-[14rem] opacity-18" />
        <div className="space-y-3">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
            {copy.nav.features}
          </p>
          <h2 className="text-3xl font-heading font-semibold text-white sm:text-4xl">
            {copy.features.title}
          </h2>
          <p className="max-w-3xl text-base leading-7 text-white/62">
            {copy.features.intro}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {copy.features.cards.map((feature, index) => {
            const Icon = featureIcons[index % featureIcons.length]

            return (
              <Card
                key={feature.key}
                className="border-white/10 bg-white/[0.03] text-white ring-0 transition hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_20px_48px_rgba(0,0,0,0.22),0_0_32px_rgba(162,77,224,0.08)]"
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
      </SectionContainer>
    </SectionReveal>
  )
}

export function DifferentiationSection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
      <SectionReveal delay={100}>
      <SectionContainer className="bg-[linear-gradient(135deg,rgba(162,77,224,0.14),rgba(34,211,238,0.06),rgba(76,110,245,0.10))]">
        <AmbientGlow tone="blend" className="ambient-drift-slow right-[-5rem] top-[-5rem] h-[18rem] w-[18rem] opacity-45" />
        <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
          {copy.ui.differentiation}
        </p>
        <h2 className="mt-3 text-3xl font-heading font-semibold text-white sm:text-4xl">
          {copy.diff.title}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-white/68">
          {copy.diff.body}
        </p>
      </SectionContainer>
    </SectionReveal>
  )
}

export function HowItWorksSection({
  copy,
  signupHref,
}: {
  copy: ResolvedSiteCopy
  signupHref: string
}) {
  return (
    <SectionReveal delay={150}>
      <div id="how-it-works" className="scroll-mt-40 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(20,16,31,0.98),rgba(12,12,18,0.98)),radial-gradient(circle_at_16%_12%,rgba(162,77,224,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(255,94,138,0.1),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(83,175,255,0.08),transparent_28%)] text-white ring-0">
          <AmbientGlow tone="violet" className="ambient-drift-slow left-[-6rem] top-[4rem] h-[16rem] w-[16rem] opacity-22" />
          <EnergyWaveBackdrop className="left-[2%] top-[-1rem] h-[9rem] w-[96%] opacity-16" />
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
                className="rounded-[22px] border border-white/10 bg-black/20 p-5 transition hover:border-white/16"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white/78">
                    0{index + 1}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-white">{step.title}</h3>
                    <p className="text-sm leading-6 text-white/62">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(12,9,23,0.98),rgba(12,12,18,0.98)),radial-gradient(circle_at_86%_14%,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_18%_84%,rgba(162,77,224,0.12),transparent_26%)] text-white ring-0">
          <AmbientGlow tone="cyan" className="ambient-drift-reverse right-[-4rem] top-[-3rem] h-[15rem] w-[15rem] opacity-24" />
          <CardHeader>
            <CardTitle className="text-white">{copy.ui.previewTitle}</CardTitle>
            <CardDescription className="text-white/56">
              {copy.ui.previewDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(162,77,224,0.22),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.08),transparent_22%),#14101F] p-4 shadow-[0_0_42px_rgba(162,77,224,0.08)]">
              <div className="rounded-[16px] border border-white/8 bg-black/20 p-3">
                <EnergyCurveHeroVisual labels={copy.hero.visual} />
              </div>
            </div>
            <CTAButton href={signupHref} className="w-full">
              <>
                {copy.how.cta}
                <ArrowRight className="size-4" />
              </>
            </CTAButton>
          </CardContent>
        </Card>
      </div>
    </SectionReveal>
  )
}

export function StorySection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
    <SectionReveal delay={200}>
      <Card
        id="story"
        className="relative scroll-mt-40 overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(12,9,23,0.98),rgba(12,12,18,0.98)),radial-gradient(circle_at_14%_16%,rgba(255,94,138,0.08),transparent_26%),radial-gradient(circle_at_86%_84%,rgba(162,77,224,0.12),transparent_26%)] text-white ring-0"
      >
        <AmbientGlow tone="magenta" className="ambient-drift-slow left-[-5rem] top-[-4rem] h-[14rem] w-[14rem] opacity-20" />
        <AmbientGlow tone="violet" className="ambient-drift-reverse right-[-4rem] bottom-[-4rem] h-[14rem] w-[14rem] opacity-16" />
        <EnergyWaveBackdrop className="right-[4%] top-[0.5rem] h-[8rem] w-[42%] opacity-12" />
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <CardHeader className="space-y-3">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
              {copy.nav.story}
            </p>
            <CardTitle className="text-3xl text-white sm:text-4xl">
              {copy.story.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {copy.story.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-7 text-white/68">
                {paragraph}
              </p>
            ))}
          </CardContent>
        </div>
      </Card>
    </SectionReveal>
  )
}

export function SuiteSection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
    <SectionReveal delay={80}>
      <SectionContainer
        id="suite"
        className="bg-[linear-gradient(150deg,rgba(162,77,224,0.12),rgba(76,110,245,0.08),rgba(34,211,238,0.06))]"
      >
        <AmbientGlow
          tone="violet"
          className="ambient-drift-slow left-[-6rem] top-[-4rem] h-[18rem] w-[18rem] opacity-40"
        />

        <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
              {copy.suite.eyebrow}
            </p>
            <h2 className="mt-3 flex items-center gap-3 text-3xl font-heading font-semibold text-white sm:text-4xl">
              <Layers aria-hidden className="size-7 shrink-0 text-white/50" />
              {copy.suite.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/68">
              {copy.suite.body}
            </p>
            <a
              href="https://stagelink.art"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/78 underline decoration-white/24 underline-offset-4 transition hover:text-[#7DE6F7]"
            >
              {copy.suite.link}
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>

          {/* Billing transparency: say it before Stripe does. */}
          <div className="rounded-3xl border border-white/12 bg-black/24 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
                <CreditCard aria-hidden className="size-5 text-white/66" />
              </div>
              <h3 className="text-base font-heading font-semibold text-white">
                {copy.suite.billingTitle}
              </h3>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/64">
              {copy.suite.billingBody}
            </p>
          </div>
        </div>
      </SectionContainer>
    </SectionReveal>
  )
}

export function PricingTeaserSection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
    <SectionReveal delay={85}>
      <SectionContainer
        id="pricing"
        className="space-y-6 bg-[linear-gradient(180deg,rgba(12,9,23,0.98),rgba(12,9,23,0.98)),radial-gradient(circle_at_18%_14%,rgba(162,77,224,0.14),transparent_28%)]"
      >
        <div className="space-y-3">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
            {copy.pricing.eyebrow}
          </p>
          <h2 className="text-3xl font-heading font-semibold text-white sm:text-4xl">
            {copy.pricing.teaserTitle}
          </h2>
          <p className="max-w-3xl text-base leading-7 text-white/62">
            {copy.pricing.teaserBody}
          </p>
        </div>

        <div className="grid gap-3 pt-3 sm:grid-cols-3">
          {copy.pricing.plans.map((plan) => (
            <Link
              key={plan.id}
              href={localizedPath("/pricing", copy.locale)}
              className={cn(
                "relative rounded-2xl border p-5 transition hover:-translate-y-1",
                plan.recommended
                  ? "border-[#A24DE0]/50 bg-[linear-gradient(165deg,rgba(162,77,224,0.18),rgba(20,16,31,0.9))] shadow-[0_16px_40px_rgba(120,60,220,0.2)] hover:border-[#A24DE0]/70"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              )}
            >
              {plan.recommended ? (
                <span className="ec-gradient-bg absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white">
                  {copy.pricing.recommendedBadge}
                </span>
              ) : null}

              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading text-base font-semibold text-white">
                  {plan.name}
                </span>
                <span
                  className={cn(
                    "text-[0.62rem] font-medium uppercase tracking-[0.12em]",
                    plan.live ? "text-[#7DF0C4]" : "text-[#F5C15E]"
                  )}
                >
                  {plan.live ? copy.pricing.liveBadge : copy.pricing.soonBadge}
                </span>
              </div>

              <p className="mt-3 font-heading text-2xl font-semibold tracking-tight text-white">
                {plan.price}
                {plan.annual ? (
                  <span className="ml-1 text-sm font-normal text-white/46">
                    {copy.pricing.perMonth}
                  </span>
                ) : null}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/58">{plan.tagline}</p>
            </Link>
          ))}
        </div>

        <CTAButton href={localizedPath("/pricing", copy.locale)}>
          <>
            {copy.pricing.teaserCta}
            <ArrowRight className="size-4" />
          </>
        </CTAButton>
      </SectionContainer>
    </SectionReveal>
  )
}

export function FaqSection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
    <SectionReveal delay={90}>
      <SectionContainer
        id="faq"
        className="space-y-5 bg-[linear-gradient(180deg,rgba(12,9,23,0.98),rgba(12,9,23,0.98)),radial-gradient(circle_at_88%_12%,rgba(162,77,224,0.12),transparent_26%)]"
      >
        <div className="space-y-3">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
            {copy.faq.eyebrow}
          </p>
          <h2 className="text-3xl font-heading font-semibold text-white sm:text-4xl">
            {copy.faq.title}
          </h2>
          <p className="max-w-3xl text-base leading-7 text-white/62">{copy.faq.intro}</p>
        </div>

        {/* Native <details> so every answer ships in the HTML even while
            collapsed — crawlers and answer engines read it without running JS. */}
        <div className="divide-y divide-white/8 border-t border-white/8">
          {copy.faq.items.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
                <h3 className="text-base font-heading font-medium text-white/88 transition group-hover:text-white sm:text-lg">
                  {item.question}
                </h3>
                <ChevronDown
                  aria-hidden
                  className="mt-1 size-5 shrink-0 text-white/40 transition group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 max-w-3xl pr-9 text-sm leading-7 text-white/62">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </SectionContainer>
    </SectionReveal>
  )
}

export function ContactSection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
    <SectionReveal delay={250}>
      <div id="contact" className="scroll-mt-40 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="relative overflow-hidden border-white/10 bg-white/[0.03] text-white ring-0">
          <AmbientGlow tone="cyan" className="ambient-drift-slow right-[-5rem] top-[-4rem] h-[14rem] w-[14rem] opacity-18" />
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
                  <p className="text-sm text-white/48">{copy.ui.directContact}</p>
                  <a
                    href="mailto:hello@energycurve.app"
                    className="text-base font-medium text-white transition hover:text-[#7DE6F7]"
                  >
                    hello@energycurve.app
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-white/10 bg-white/[0.03] text-white ring-0">
          <AmbientGlow tone="blend" className="ambient-drift-reverse left-[-5rem] bottom-[-4rem] h-[15rem] w-[15rem] opacity-18" />
          <CardContent className="pt-6">
            <LandingContactForm copy={copy.contact} />
          </CardContent>
        </Card>
      </div>
    </SectionReveal>
  )
}

export function FinalCTASection({
  copy,
  signupHref,
}: {
  copy: ResolvedSiteCopy
  signupHref: string
}) {
  return (
    <SectionReveal delay={300}>
      <SectionContainer
        id="early-access"
        className="bg-[linear-gradient(135deg,rgba(162,77,224,0.14),rgba(34,211,238,0.06),rgba(76,110,245,0.10))]"
      >
        <AmbientGlow tone="violet" className="ambient-drift-slow left-[-4rem] bottom-[-5rem] h-[18rem] w-[18rem] opacity-34" />
        <AmbientGlow tone="cyan" className="ambient-drift-reverse right-[-4rem] top-[-4rem] h-[16rem] w-[16rem] opacity-28" />
        <EnergyWaveBackdrop className="right-[-2rem] top-0 h-full w-[52%] opacity-18" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/34">
              {copy.ui.earlyAccess}
            </p>
            <h2 className="text-3xl font-heading font-semibold text-white sm:text-4xl">
              {copy.cta.title}
            </h2>
            <p className="text-base leading-7 text-white/68">{copy.cta.subtitle}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CTAButton href={signupHref}>
              <>
                {copy.cta.primary}
                <ArrowRight className="size-4" />
              </>
            </CTAButton>
            <a
              href="#contact"
              className={cn(
                "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/14 bg-white/[0.03] px-4.5 text-sm text-white transition hover:-translate-y-0.5 hover:border-white/18"
              )}
            >
              {copy.cta.secondary}
            </a>
          </div>
        </div>
      </SectionContainer>
    </SectionReveal>
  )
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string
  links: { href: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
        {heading}
      </p>
      <nav className="flex flex-col gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-sm font-medium text-white/64 transition hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

export function FooterSection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
    <footer className="flex flex-col gap-10 border-t border-white/8 pt-8 text-sm text-white/46">
      <div className="flex flex-col gap-10 md:flex-row md:justify-between">
        {/* Brand */}
        <div className="max-w-xs space-y-4">
          <EnergyCurveLogo kind="horizontal" size="md" tone="light" />
          <p className="text-sm leading-6 text-white/52">{copy.footer.description}</p>
          <p className="text-sm leading-6 text-white/52">
            {copy.footer.family.split("StageLink").map((part, index, parts) => (
              <span key={index}>
                {part}
                {index < parts.length - 1 ? (
                  <a
                    href="https://stagelink.art"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/72 underline decoration-white/24 underline-offset-4 transition hover:text-[#7DE6F7]"
                  >
                    StageLink
                  </a>
                ) : null}
              </span>
            ))}
          </p>
          <p className="text-xs leading-5 text-white/40">{copy.footer.billing}</p>
        </div>

        {/* Link columns */}
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-14">
          <FooterColumn
            heading={copy.footer.product}
            links={[
              { href: "#features", label: copy.nav.features },
              { href: "#how-it-works", label: copy.nav.how },
              { href: "#story", label: copy.nav.story },
              { href: "#faq", label: copy.nav.faq },
              { href: "#contact", label: copy.nav.contact },
            ]}
          />
          <FooterColumn
            heading={copy.footer.resources}
            links={[
              {
                href: localizedPath("/pricing", copy.locale),
                label: copy.pricing.navLabel,
              },
              {
                href: localizedPath("/install", copy.locale),
                label: copy.install.footerLink,
              },
            ]}
          />
          <FooterColumn
            heading={copy.footer.legal}
            links={[
              {
                href: localizedPath("/privacy", copy.locale),
                label: copy.footer.privacy,
              },
              {
                href: localizedPath("/terms", copy.locale),
                label: copy.footer.terms,
              },
              {
                href: localizedPath("/cookie-policy", copy.locale),
                label: copy.footer.cookies,
              },
            ]}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col gap-1.5 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="ec-gradient-text font-medium">{copy.footer.madeIn}</p>
        <p>{copy.footer.rights}</p>
      </div>
    </footer>
  )
}
