"use client"

import { useEffect, useState } from "react"

import {
  AmbientGlow,
  EnergyWaveBackdrop,
} from "@/components/marketing/ambient-decor"
import {
  LandingNavbar,
  type NavEntry,
} from "@/components/marketing/landing-navbar"
import {
  ContactSection,
  DifferentiationSection,
  LoopSection,
  FaqSection,
  FeaturesSection,
  FinalCTASection,
  FooterSection,
  HeroSection,
  HowItWorksSection,
  PricingTeaserSection,
  StorySection,
  SuiteSection,
} from "@/components/marketing/landing-sections"
import { InstallBanner } from "@/components/marketing/install-banner"
import { useSiteLocale } from "@/components/marketing/use-site-locale"
import { LOCALE_PREFIX, localizedPath } from "@/lib/content/locale-routing"
import { getSiteCopy, SiteLocale } from "@/lib/content/site-copy"
import { isStandaloneDisplayMode } from "@/lib/pwa"

const SECTION_IDS = [
  "features",
  "how-it-works",
  "loop",
  "story",
  "pricing",
  "faq",
  "contact",
]

/** Both addresses of the landing page — the installed app leaves either one. */
const LANDING_PATHS = new Set(["/", LOCALE_PREFIX, `${LOCALE_PREFIX}/`])

export function LandingPage({ locale }: { locale: SiteLocale }) {
  // The locale is a prop, not state read from localStorage: the server needs to
  // render the right language for a crawler that has no storage at all. The
  // toggle navigates between /  and /es instead of swapping copy in place — see
  // useSiteLocale and lib/content/locale-routing.ts.
  const changeLocale = useSiteLocale("/", locale)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Installed-app launches should never sit on the marketing page: send
    // them to /login, which forwards logged-in users straight to /dashboard.
    if (isStandaloneDisplayMode() && LANDING_PATHS.has(window.location.pathname)) {
      window.location.replace("/login")
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const observers = new IntersectionObserver(
      (entries) => {
        if (window.scrollY < 180) {
          setActiveSection(null)
          return
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)

        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id)
        }
      },
      {
        rootMargin: "-32% 0px -48% 0px",
        threshold: [0.2, 0.4, 0.6],
      }
    )

    for (const id of SECTION_IDS) {
      const element = document.getElementById(id)
      if (element) {
        observers.observe(element)
      }
    }

    return () => observers.disconnect()
  }, [])

  const copy = getSiteCopy(locale)
  const signupHref = "/signup?returnTo=%2Fdashboard"
  // Grouped to match the footer: what the product is, and everything around it.
  const navEntries: NavEntry[] = [
    {
      kind: "group",
      label: copy.footer.product,
      items: [
        { href: "#features", label: copy.nav.features },
        { href: "#how-it-works", label: copy.nav.how },
        { href: "#loop", label: copy.loop.navLabel },
        { href: "#story", label: copy.nav.story },
      ],
    },
    {
      kind: "group",
      label: copy.footer.resources,
      items: [
        { href: "#faq", label: copy.nav.faq },
        { href: localizedPath("/pricing", locale), label: copy.pricing.navLabel },
        { href: localizedPath("/blog", locale), label: copy.footer.blog },
        { href: localizedPath("/install", locale), label: copy.install.footerLink },
        { href: "https://stagelink.art", label: copy.footer.stagelink, external: true },
      ],
    },
    { kind: "link", href: "#contact", label: copy.nav.contact },
  ]

  return (
    <main
      id="top"
      className="relative min-h-screen overflow-hidden bg-[#08050F] text-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(circle_at_50%_0%,rgba(162,77,224,0.28),transparent_36%),radial-gradient(circle_at_72%_18%,rgba(76,110,245,0.1),transparent_24%),radial-gradient(circle_at_28%_18%,rgba(34,211,238,0.08),transparent_24%)]" />
        <AmbientGlow
          tone="violet"
          className="ambient-drift-slow left-[-8rem] top-[10rem] h-[26rem] w-[26rem] opacity-70"
        />
        <AmbientGlow
          tone="cyan"
          className="ambient-drift-reverse right-[-10rem] top-[22rem] h-[24rem] w-[24rem] opacity-45"
        />
        <AmbientGlow
          tone="magenta"
          className="ambient-drift-slow left-[12%] top-[58rem] h-[22rem] w-[22rem] opacity-35"
        />
        <AmbientGlow
          tone="blend"
          className="ambient-drift-reverse right-[8%] top-[96rem] h-[30rem] w-[30rem] opacity-40"
        />
        <EnergyWaveBackdrop className="left-0 top-[38rem] h-[14rem] w-full opacity-30" />
        <EnergyWaveBackdrop className="left-0 top-[126rem] h-[16rem] w-full scale-y-[-1] opacity-20" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-4 pt-28 lg:px-10 lg:pt-34">
        <LandingNavbar
          entries={navEntries}
          activeSection={activeSection}
          scrolled={scrolled}
          locale={locale}
          onLocaleChange={changeLocale}
          ctaLabel={copy.nav.cta}
          loginLabel={copy.ui.login}
        />

        <HeroSection copy={copy} signupHref={signupHref} />
        <FeaturesSection copy={copy} />
        <HowItWorksSection copy={copy} signupHref={signupHref} />
        <LoopSection copy={copy} />
        <DifferentiationSection copy={copy} />
        <StorySection copy={copy} />
        <SuiteSection copy={copy} />
        <PricingTeaserSection copy={copy} />
        <FaqSection copy={copy} />
        <ContactSection copy={copy} />
        <FinalCTASection copy={copy} signupHref={signupHref} />
        <FooterSection copy={copy} />
      </div>

      <InstallBanner copy={copy.install} locale={locale} />
    </main>
  )
}
