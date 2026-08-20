"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, Menu, X } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { CTAButton } from "@/components/marketing/cta-button"
import { LanguageToggle } from "@/components/marketing/language-toggle"
import { SiteLocale } from "@/lib/content/site-copy"
import { cn } from "@/lib/utils"

export interface NavLink {
  href: string
  label: string
  /** Opens in a new tab and gets the usual safety attributes. */
  external?: boolean
}

/**
 * The bar mirrors the footer's grouping: two menus and one direct link instead
 * of six loose anchors. It reads tidier, and it leaves room for the pages we
 * add later without the bar growing every time.
 */
export type NavEntry =
  | ({ kind: "link" } & NavLink)
  | { kind: "group"; label: string; items: NavLink[] }

interface LandingNavbarProps {
  entries: NavEntry[]
  activeSection: string | null
  scrolled: boolean
  locale: SiteLocale
  onLocaleChange: (locale: SiteLocale) => void
  ctaLabel: string
  loginLabel: string
}

const isActive = (href: string, activeSection: string | null) =>
  href.startsWith("#") && activeSection === href.slice(1)

function itemClasses(active: boolean) {
  return cn(
    "whitespace-nowrap rounded-full px-2.5 py-2 text-sm transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/45",
    active
      ? "bg-linear-to-r from-[#A24DE0]/18 via-[#6A5CF0]/10 to-[#22D3EE]/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(255,255,255,0.05),0_0_24px_rgba(162,77,224,0.16)]"
      : "text-white/62 hover:-translate-y-0.5 hover:bg-linear-to-r hover:from-[#A24DE0]/16 hover:via-[#6A5CF0]/10 hover:to-[#22D3EE]/18 hover:text-white hover:shadow-[0_12px_28px_rgba(82,77,255,0.14),0_0_22px_rgba(34,211,238,0.1)]"
  )
}

function NavAnchor({
  link,
  className,
  onNavigate,
}: {
  link: NavLink
  className: string
  onNavigate?: () => void
}) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {link.label}
      </a>
    )
  }

  // Anchors stay plain <a> so the browser handles the hash jump; real routes go
  // through next/link so they don't reload the app.
  return link.href.startsWith("#") ? (
    <a href={link.href} className={className} onClick={onNavigate}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={className} onClick={onNavigate}>
      {link.label}
    </Link>
  )
}

function NavGroup({
  label,
  items,
  activeSection,
}: {
  label: string
  items: NavLink[]
  activeSection: string | null
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const groupActive = items.some((item) => isActive(item.href, activeSection))

  // A menu that only closes from its own trigger is a menu that gets left open.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(itemClasses(groupActive), "inline-flex items-center gap-1")}
      >
        {label}
        <ChevronDown
          aria-hidden
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[13rem] rounded-2xl border border-white/12 bg-[#0C0917]/97 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {items.map((item) => (
            <NavAnchor
              key={item.href}
              link={item}
              onNavigate={() => setOpen(false)}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm transition",
                isActive(item.href, activeSection)
                  ? "bg-white/[0.06] text-white"
                  : "text-white/70 hover:bg-white/[0.05] hover:text-white"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function LandingNavbar({
  entries,
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
            ? "border-[#A24DE0]/20 bg-[#0C0917]/88 shadow-[0_20px_50px_rgba(0,0,0,0.34),0_0_28px_rgba(162,77,224,0.12)] backdrop-blur-xl"
            : "border-white/8 bg-[#0C0917]/60 backdrop-blur-lg"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <a href="#top" className="shrink-0">
            <EnergyCurveLogo tone="light" size="md" kind="horizontal" priority />
          </a>

          {/* Three entries fit comfortably, so the bar comes back at lg. */}
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {entries.map((entry) =>
              entry.kind === "group" ? (
                <NavGroup
                  key={entry.label}
                  label={entry.label}
                  items={entry.items}
                  activeSection={activeSection}
                />
              ) : (
                <NavAnchor
                  key={entry.href}
                  link={entry}
                  className={itemClasses(isActive(entry.href, activeSection))}
                />
              )
            )}
          </nav>

          <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
            <LanguageToggle locale={locale} onChange={onLocaleChange} />
            <Link
              href="/login?returnTo=%2Fdashboard"
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-white/72 transition hover:bg-white/[0.04] hover:text-white"
            >
              {loginLabel}
            </Link>
            <CTAButton
              href="/signup?returnTo=%2Fdashboard"
              className="h-10 px-4 text-sm shadow-[0_0_24px_rgba(162,77,224,0.16)]"
            >
              {ctaLabel}
            </CTAButton>
          </div>

          <button
            type="button"
            aria-controls="mobile-nav"
            aria-expanded={open}
            className="inline-flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.07] lg:hidden"
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
              {/* No dropdowns on a panel that is already a list: the groups
                  become labelled sections. */}
              <div className="flex flex-col gap-3">
                {entries.map((entry) =>
                  entry.kind === "group" ? (
                    <div key={entry.label} className="flex flex-col gap-1">
                      <p className="ec-eyebrow px-3 text-[0.66rem]">{entry.label}</p>
                      {entry.items.map((item) => (
                        <NavAnchor
                          key={item.href}
                          link={item}
                          onNavigate={() => setOpen(false)}
                          className={cn(
                            "rounded-2xl px-3 py-2 text-sm transition",
                            isActive(item.href, activeSection)
                              ? "bg-white/[0.06] text-white"
                              : "text-white/72 hover:bg-white/[0.04] hover:text-white"
                          )}
                        />
                      ))}
                    </div>
                  ) : (
                    <NavAnchor
                      key={entry.href}
                      link={entry}
                      onNavigate={() => setOpen(false)}
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm transition",
                        isActive(entry.href, activeSection)
                          ? "bg-white/[0.06] text-white"
                          : "text-white/72 hover:bg-white/[0.04] hover:text-white"
                      )}
                    />
                  )
                )}
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
                <CTAButton href="/signup?returnTo=%2Fdashboard" className="w-full">
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
