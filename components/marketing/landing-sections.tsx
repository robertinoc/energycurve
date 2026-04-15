import { ArrowRight, BarChart3, GitBranch, LineChart, Mail, Sparkles, Waves } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { CTAButton } from "@/components/marketing/cta-button"
import { LandingContactForm } from "@/components/marketing/landing-contact-form"
import { SectionContainer } from "@/components/marketing/section-container"
import { SectionReveal } from "@/components/marketing/section-reveal"
import { EnergyCurveHeroVisual } from "@/components/marketing/energy-curve-hero-visual"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResolvedSiteCopy } from "@/lib/content/site-copy"
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
      <section className="rounded-[30px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.38)] backdrop-blur">
        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,28,0.96),rgba(11,11,15,0.98))] px-5 py-7 shadow-[0_0_60px_rgba(123,63,228,0.08)]">
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
                        <LineChart className="size-4 text-[#C06BFF]" />
                      ) : index === 1 ? (
                        <Sparkles className="size-4 text-[#C06BFF]" />
                      ) : (
                        <Waves className="size-4 text-[#C06BFF]" />
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
                  "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4.5 text-sm text-white transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-card hover:shadow-[0_14px_36px_rgba(0,0,0,0.26),0_0_22px_rgba(0,209,255,0.08)]"
                )}
              >
                {copy.hero.cta.secondary}
              </a>
            </div>

            <div className="flex flex-col gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-5 py-4 text-left text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
              <p>{copy.ui.trustSignals.founder}</p>
              <p>{copy.ui.trustSignals.workflows}</p>
              <p>{copy.ui.trustSignals.access}</p>
            </div>
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
      <SectionContainer id="features" className="space-y-5">
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
                className="border-white/10 bg-white/[0.03] text-white ring-0 transition hover:-translate-y-1 hover:border-white/16"
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
      <SectionContainer className="bg-[linear-gradient(135deg,rgba(123,63,228,0.14),rgba(0,209,255,0.06),rgba(255,45,117,0.12))]">
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
      <div id="how-it-works" className="scroll-mt-36 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
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

        <Card className="overflow-hidden border-white/10 bg-white/[0.03] text-white ring-0">
          <CardHeader>
            <CardTitle className="text-white">{copy.ui.previewTitle}</CardTitle>
            <CardDescription className="text-white/56">
              {copy.ui.previewDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(123,63,228,0.22),transparent_28%),#111118] p-4">
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
      <div id="story" className="scroll-mt-36 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
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
      </div>
    </SectionReveal>
  )
}

export function ContactSection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
    <SectionReveal delay={250}>
      <div id="contact" className="scroll-mt-36 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
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
                  <p className="text-sm text-white/48">{copy.ui.directContact}</p>
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
        className="bg-[linear-gradient(135deg,rgba(123,63,228,0.14),rgba(0,209,255,0.06),rgba(255,45,117,0.12))]"
      >
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
            <CTAButton href={signupHref} className="bg-[#0B0B0F] text-white hover:bg-[#14141b]">
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

export function FooterSection({ copy }: { copy: ResolvedSiteCopy }) {
  return (
    <footer className="flex flex-col gap-5 border-t border-white/8 pt-6 text-sm text-white/46 md:flex-row md:items-end md:justify-between">
      <div className="space-y-4">
        <EnergyCurveLogo kind="horizontal" size="md" tone="light" />
        <p className="max-w-md text-sm leading-6 text-white/52">
          {copy.footer.description}
        </p>
        <div className="flex items-center gap-6">
          <span>{copy.footer.product}</span>
          <a href="#features" className="transition hover:text-white">
            {copy.footer.features}
          </a>
          <a href="#contact" className="transition hover:text-white">
            {copy.footer.contact}
          </a>
        </div>
      </div>
      <p>{copy.footer.rights}</p>
    </footer>
  )
}
