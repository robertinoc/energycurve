"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { LanguageToggle } from "@/components/marketing/language-toggle"
import {
  useSiteLocale,
  type LocaleToggleTarget,
} from "@/components/marketing/use-site-locale"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The chrome around a standalone marketing page: logo, language toggle, a way
 * home.
 *
 * Lifted out of `blog-shell.tsx` when the tools needed the same header. It is
 * the part a reader uses to leave, and three near-identical copies is how one of
 * them ends up without a way back.
 *
 * A client component that takes server-rendered children, which is the point:
 * the toggle needs state, the content underneath must be in the HTML a crawler
 * receives, and passing it as `children` keeps it that way.
 *
 * `togglePath` is the page in the abstract — `/tools/energy-curve`, not
 * `/es/herramientas/curva-de-energia`. The toggle turns it into the other
 * language's URL, translated slug included.
 */
export function PageShell({
  locale,
  togglePath,
  width = "prose",
  children,
}: {
  locale: SiteLocale
  togglePath: LocaleToggleTarget
  /** `prose` for reading, `wide` for a page with a chart in it. */
  width?: "prose" | "wide"
  children: React.ReactNode
}) {
  const changeLocale = useSiteLocale(togglePath, locale)
  const backLabel = locale === "es" ? "Volver al inicio" : "Back to home"

  return (
    <main className="min-h-screen bg-[#08050F] text-white">
      <div
        className={`mx-auto flex w-full flex-col gap-8 px-6 py-12 lg:px-8 ${
          width === "wide" ? "max-w-4xl" : "max-w-3xl"
        }`}
      >
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
