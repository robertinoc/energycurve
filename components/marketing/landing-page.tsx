"use client"

import { useEffect, useState } from "react"

import { LandingNavbar } from "@/components/marketing/landing-navbar"
import {
  ContactSection,
  DifferentiationSection,
  FeaturesSection,
  FinalCTASection,
  FooterSection,
  HeroSection,
  HowItWorksSection,
  StorySection,
} from "@/components/marketing/landing-sections"
import { getSiteCopy, SiteLocale } from "@/lib/content/site-copy"

const STORAGE_KEY = "energycurve:locale"
const SECTION_IDS = ["features", "how-it-works", "story", "contact"]

export function LandingPage() {
  const [locale, setLocale] = useState<SiteLocale>(() => {
    if (typeof window === "undefined") {
      return "en"
    }

    const storedLocale = window.localStorage.getItem(STORAGE_KEY)
    return storedLocale === "es" ? "es" : "en"
  })
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const observers = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)

        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id)
        }
      },
      {
        rootMargin: "-25% 0px -55% 0px",
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
  const navItems = [
    { href: "#features", label: copy.nav.features },
    { href: "#how-it-works", label: copy.nav.how },
    { href: "#story", label: copy.nav.story },
    { href: "#contact", label: copy.nav.contact },
  ]

  return (
    <main
      id="top"
      className="relative min-h-screen overflow-hidden bg-[#0B0B0F] text-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(circle_at_50%_0%,rgba(123,63,228,0.28),transparent_36%),radial-gradient(circle_at_72%_18%,rgba(255,45,117,0.1),transparent_24%),radial-gradient(circle_at_28%_18%,rgba(0,209,255,0.08),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-4 lg:px-10">
        <LandingNavbar
          items={navItems}
          activeSection={activeSection}
          scrolled={scrolled}
          locale={locale}
          onLocaleChange={setLocale}
          ctaLabel={copy.nav.cta}
          loginLabel={copy.ui.login}
        />

        <HeroSection copy={copy} signupHref={signupHref} />
        <FeaturesSection copy={copy} />
        <HowItWorksSection copy={copy} signupHref={signupHref} />
        <DifferentiationSection copy={copy} />
        <StorySection copy={copy} />
        <ContactSection copy={copy} />
        <FinalCTASection copy={copy} signupHref={signupHref} />
        <FooterSection copy={copy} />
      </div>
    </main>
  )
}
