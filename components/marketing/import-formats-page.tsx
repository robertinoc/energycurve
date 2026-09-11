"use client"

import Link from "next/link"
import { ArrowLeft, Check, Minus } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { LanguageToggle } from "@/components/marketing/language-toggle"
import { useSiteLocale } from "@/components/marketing/use-site-locale"
import { getImportFormatsCopy } from "@/lib/content/import-formats-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The answer to "estableced una base, qué datos son necesarios en el csv" —
 * asked by an alpha user who noticed we export CSV and couldn't read it back.
 *
 * Public rather than in-app because you need it *before* you have a playlist
 * in EnergyCurve to export and copy.
 */
export function ImportFormatsPage({ locale }: { locale: SiteLocale }) {
  const changeLocale = useSiteLocale("/import-formats", locale)
  const t = getImportFormatsCopy(locale)
  const backLabel = locale === "es" ? "Volver al inicio" : "Back to home"

  return (
    <main className="min-h-screen bg-[#08050F] text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12 lg:px-8">
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

        <header className="space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-white/64">{t.intro}</p>
        </header>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            {t.formatsHeading}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10.5px] uppercase tracking-[0.14em] text-white/48">
                  <th className="px-3 py-2 font-medium">{t.formatHeading}</th>
                  <th className="px-3 py-2 font-medium">{t.carriesHeading}</th>
                  <th className="whitespace-nowrap px-3 py-2 text-center font-medium">
                    {t.relinksHeading}
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.formats.map((row) => (
                  <tr
                    key={row.format}
                    className="border-b border-white/[0.06] last:border-0"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-3 py-2.5 align-top font-medium text-white/88"
                    >
                      {row.format}
                    </th>
                    <td className="px-3 py-2.5 align-top leading-6 text-white/62">
                      {row.carries}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      {row.relinks ? (
                        <>
                          <Check aria-hidden className="mx-auto size-4 text-[#86EFAC]" />
                          <span className="sr-only">{t.yes}</span>
                        </>
                      ) : (
                        <>
                          <Minus aria-hidden className="mx-auto size-4 text-white/28" />
                          <span className="sr-only">{t.no}</span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            {t.columnsHeading}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-white/56">
            {t.columnsNote}
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10.5px] uppercase tracking-[0.14em] text-white/48">
                  <th className="px-3 py-2 font-medium">{t.fieldHeading}</th>
                  <th className="px-3 py-2 font-medium">{t.acceptedHeading}</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {t.columns.map((row) => (
                  <tr
                    key={row.field}
                    className="border-b border-white/[0.06] last:border-0"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap px-3 py-2.5 align-top font-medium text-white/88"
                    >
                      {row.field}
                      {row.required ? (
                        <span className="ml-1.5 rounded border border-[#F5A524]/35 px-1 text-[9px] uppercase tracking-[0.1em] text-[#F5C15E]">
                          {t.requiredLabel}
                        </span>
                      ) : null}
                    </th>
                    <td className="px-3 py-2.5 align-top font-mono text-[11.5px] leading-6 text-white/72">
                      {row.accepted}
                    </td>
                    <td className="px-3 py-2.5 align-top leading-6 text-white/52">
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">
            {t.referenceHeading}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/64">
            {t.referenceBody}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">
            {t.delimiterHeading}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/64">
            {t.delimiterBody}
          </p>
        </section>
      </div>
    </main>
  )
}
