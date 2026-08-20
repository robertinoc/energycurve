"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { LanguageToggle } from "@/components/marketing/language-toggle"
import { useSiteLocale } from "@/components/marketing/use-site-locale"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The chrome around blog pages: logo, language toggle, back link.
 *
 * Lifted out of the pages rather than copied into each because the header is the
 * part a reader uses to leave, and three near-identical copies is how one of them
 * ends up without a way home.
 *
 * The language toggle always points at `/blog`, never at the current article. An
 * article exists in one language; sending a reader to a translation that doesn't
 * exist is a 404, and sending them to the index in their language is the useful
 * version of the same intent.
 */
export function BlogShell({
  locale,
  children,
}: {
  locale: SiteLocale
  children: React.ReactNode
}) {
  const changeLocale = useSiteLocale("/blog", locale)
  const backLabel = locale === "es" ? "Volver al inicio" : "Back to home"

  return (
    <main className="min-h-screen bg-[#08050F] text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href={localizedPath("/", locale)} aria-label="EnergyCurve home">
            <EnergyCurveLogo tone="light" size="sm" kind="horizontal" />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle locale={locale} onChange={changeLocale} />
            <Link
              href={localizedPath("/", locale)}
              className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
            >
              <ArrowLeft className="size-3.5" />
              {backLabel}
            </Link>
          </div>
        </div>

        {children}
      </div>
    </main>
  )
}
