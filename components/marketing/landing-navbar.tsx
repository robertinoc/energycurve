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
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-3 lg:px-6 lg:pt-4">
      <header
        className={cn(
          "mx-auto w-full max-w-6xl rounded-[24px] border px-5 py-3.5 transition-all duration-300",
          scrolled
            ? "border-fuchsia-400/18 bg-[#0F1017]/88 shadow-[0_20px_50px_rgba(0,0,0,0.34),0_0_28px_rgba(123,63,228,0.12)] backdrop-blur-xl"
            : "border-white/10 bg-white/[0.045] shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <a href="#top" className="min-w-0">
            <EnergyCurveLogo tone="light" size="md" kind="horizontal" priority />
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-2 lg:flex">
            {items.map((item) => {
              const active = activeSection === item.href.slice(1)

              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "location" : undefined}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D75]/45",
                    active
                      ? "bg-linear-to-r from-white/[0.08] to-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(255,255,255,0.05),0_0_20px_rgba(123,63,228,0.14)]"
                      : "text-white/62 hover:bg-white/[0.05] hover:text-white hover:shadow-[0_0_18px_rgba(255,45,117,0.08)]"
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
              className="rounded-full px-3 py-2 text-sm text-white/72 transition hover:bg-white/[0.04] hover:text-white"
            >
              {loginLabel}
            </Link>
            <CTAButton href="/signup?returnTo=%2Fdashboard" className="h-10 px-4 text-sm shadow-[0_0_24px_rgba(123,63,228,0.16)]">
              {ctaLabel}
            </CTAButton>
          </div>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.07] lg:hidden"
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
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const active = activeSection === item.href.slice(1)

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "location" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm transition duration-200",
                        active
                          ? "bg-white/[0.06] text-white shadow-[0_0_18px_rgba(123,63,228,0.12)]"
                          : "text-white/72 hover:bg-white/[0.04] hover:text-white"
                      )}
                    >
                      {item.label}
                    </a>
                  )
                })}
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
    </div>
  )
}
