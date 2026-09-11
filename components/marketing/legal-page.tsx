"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { LanguageToggle } from "@/components/marketing/language-toggle"
import { useSiteLocale } from "@/components/marketing/use-site-locale"
import { ConsentControl } from "@/components/privacy/consent-control"
import { getLegalCopy, type LegalDocId } from "@/lib/content/legal-copy"
import {
  localizedPath,
  type LocalizedPath,
} from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/** Each legal document's own URL, so the language toggle stays on this page. */
const DOC_PATHS: Record<LegalDocId, LocalizedPath> = {
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookie-policy",
}

export function LegalPage({
  doc,
  locale,
}: {
  doc: LegalDocId
  locale: SiteLocale
}) {
  // Locale comes from the route, so the served HTML is already in the right
  // language rather than being corrected after hydration.
  const changeLocale = useSiteLocale(DOC_PATHS[doc], locale)

  const t = getLegalCopy(locale, doc)
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

        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.title}
          </h1>
          {/*
            white/40 measured 3.73:1 against --ec-bg (#08050f), and WCAG AA asks
            4.5:1 for text this size. white/50 is 5.31:1. Not /45, which is 4.47
            and would sit on the wrong side of the line the day the background
            token moves by a shade.
          */}
          <p className="text-xs uppercase tracking-[0.18em] text-white/50">{t.updated}</p>
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

          {/*
            Only on the cookie page, because that is where someone reconsidering
            is already standing. Consent that cannot be withdrawn as easily as it
            was given is not consent, and a policy page that explains the
            collection without offering a way out is a leaflet.
          */}
          {doc === "cookies" ? <ConsentControl locale={locale} /> : null}
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/8 pt-6 text-sm text-white/48">
          <Link
            href={localizedPath("/privacy", locale)}
            className="transition hover:text-white"
          >
            {getLegalCopy(locale, "privacy").title}
          </Link>
          <Link
            href={localizedPath("/terms", locale)}
            className="transition hover:text-white"
          >
            {getLegalCopy(locale, "terms").title}
          </Link>
          <Link
            href={localizedPath("/cookie-policy", locale)}
            className="transition hover:text-white"
          >
            {getLegalCopy(locale, "cookies").title}
          </Link>
        </nav>
      </div>
    </main>
  )
}
