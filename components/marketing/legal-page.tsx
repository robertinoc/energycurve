"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { getLegalCopy, type LegalDocId } from "@/lib/content/legal-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  persistSiteLocale,
  readStoredSiteLocale,
} from "@/lib/content/site-locale"

export function LegalPage({ doc }: { doc: LegalDocId }) {
  // Match the landing's locale mechanism (localStorage). Default EN on the server
  // + first render, then sync from storage after mount to avoid hydration diffs.
  const [locale, setLocale] = useState<SiteLocale>("en")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocale(readStoredSiteLocale() ?? "en")
  }, [])

  // Without this the page served Spanish copy under `lang="en"`.
  useEffect(() => {
    persistSiteLocale(locale)
  }, [locale])

  const t = getLegalCopy(locale, doc)
  const backLabel = locale === "es" ? "Volver al inicio" : "Back to home"

  return (
    <main className="min-h-screen bg-[#08050F] text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="EnergyCurve home">
            <EnergyCurveLogo tone="light" size="sm" kind="horizontal" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            {backLabel}
          </Link>
        </div>

        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.title}
          </h1>
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">{t.updated}</p>
          <p className="max-w-2xl text-sm leading-7 text-white/64">{t.intro}</p>
        </header>

        <div className="space-y-7">
          {t.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="font-heading text-lg font-semibold text-white">
                {section.heading}
              </h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="max-w-2xl text-sm leading-7 text-white/64">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/8 pt-6 text-sm text-white/48">
          <Link href="/privacy" className="transition hover:text-white">
            {getLegalCopy(locale, "privacy").title}
          </Link>
          <Link href="/terms" className="transition hover:text-white">
            {getLegalCopy(locale, "terms").title}
          </Link>
          <Link href="/cookie-policy" className="transition hover:text-white">
            {getLegalCopy(locale, "cookies").title}
          </Link>
        </nav>
      </div>
    </main>
  )
}
