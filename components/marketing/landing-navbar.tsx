"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { CTAButton } from "@/components/marketing/cta-button"
import { LanguageToggle } from "@/components/marketing/language-toggle"
import { SiteLocale } from "@/lib/content/site-copy"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
}

interface LandingNavbarProps {
  items: NavItem[]
  activeSection: string | null
  scrolled: boolean
  locale: SiteLocale
  onLocaleChange: (locale: SiteLocale) => void
  ctaLabel: string
  loginLabel: string
}

export function LandingNavbar({
  items,
  activeSection,
  scrolled,
  locale,
  onLocaleChange,
  ctaLabel,
  loginLabel,
}: LandingNavbarProps) {
  const [open, setOpen] = useState(false)

  return (
    <header
      className={cn(
        "sticky top-4 z-40 rounded-[24px] border px-5 py-4 transition-all duration-300",
        scrolled
          ? "border-white/12 bg-[#0F1017]/82 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl"
          : "border-white/10 bg-white/[0.03] backdrop-blur"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <a href="#top" className="min-w-0">
          <EnergyCurveLogo tone="light" size="md" caption="Performance intelligence" />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {items.map((item) => {
            const active = activeSection === item.href.slice(1)

            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm transition",
                  active ? "text-white" : "text-white/60 hover:text-white"
                )}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageToggle locale={locale} onChange={onLocaleChange} />
          <Link
            href="/login?returnTo=%2Fdashboard"
            className="text-sm text-white/72 transition hover:text-white"
          >
            {loginLabel}
          </Link>
          <CTAButton href="/signup?returnTo=%2Fdashboard" className="h-10 px-4 text-sm">
            {ctaLabel}
          </CTAButton>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 lg:hidden",
          open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 border-t border-white/8 pt-4">
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="text-sm text-white/72 transition hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <LanguageToggle locale={locale} onChange={onLocaleChange} compact />
            <div className="flex flex-col gap-3">
              <Link
                href="/login?returnTo=%2Fdashboard"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72 transition hover:text-white"
                onClick={() => setOpen(false)}
              >
                {loginLabel}
              </Link>
              <CTAButton
                href="/signup?returnTo=%2Fdashboard"
                className="w-full"
              >
                {ctaLabel}
              </CTAButton>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
