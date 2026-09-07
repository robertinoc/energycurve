"use client"

import Link from "next/link"
import { ArrowLeft, Check, Minus } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { LanguageToggle } from "@/components/marketing/language-toggle"
import { useSiteLocale } from "@/components/marketing/use-site-locale"
import { getEnergyTagsCopy } from "@/lib/content/energy-tags-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The answer to "which tag, and in what format?" — asked by an alpha user who
 * tags with Lexicon DJ rather than Mixed In Key.
 *
 * Public rather than in-app on purpose: it is the thing you want to read
 * *before* you export a playlist, and someone comparing tools should be able to
 * see the contract without signing up.
 */
export function EnergyTagsPage({ locale }: { locale: SiteLocale }) {
  const changeLocale = useSiteLocale("/energy-tags", locale)
  const t = getEnergyTagsCopy(locale)
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
          <h2 className="font-heading text-lg font-semibold">{t.fieldsHeading}</h2>
          <p className="max-w-2xl text-sm leading-6 text-white/56">{t.fieldsNote}</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10.5px] uppercase tracking-[0.14em] text-white/48">
                  <th className="px-3 py-2 font-medium">{t.fieldHeading}</th>
                  <th className="px-3 py-2 font-medium">{t.whereHeading}</th>
                  <th className="whitespace-nowrap px-3 py-2 text-center font-medium">
                    {t.bareNumberHeading}
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.fields.map((row) => (
                  <tr key={row.field} className="border-b border-white/[0.06] last:border-0">
                    <th
                      scope="row"
                      className="whitespace-nowrap px-3 py-2.5 align-top font-medium text-white/88"
                    >
                      {row.field}
                    </th>
                    <td className="px-3 py-2.5 align-top leading-6 text-white/62">
                      {row.where}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      {row.bareNumber ? (
                        <>
                          <Check
                            aria-hidden
                            className="mx-auto size-4 text-[#86EFAC]"
                          />
                          <span className="sr-only">{t.bareNumberYes}</span>
                        </>
                      ) : (
                        <>
                          <Minus
                            aria-hidden
                            className="mx-auto size-4 text-white/28"
                          />
                          <span className="sr-only">{t.bareNumberNo}</span>
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
          <h2 className="font-heading text-lg font-semibold">{t.formatsHeading}</h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10.5px] uppercase tracking-[0.14em] text-white/48">
                  <th className="px-3 py-2 font-medium">{t.writtenHeading}</th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t.readsHeading}
                  </th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {t.formats.map((row) => (
                  <tr
                    key={row.written}
                    className="border-b border-white/[0.06] last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12.5px] text-white/88">
                      {row.written}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[12.5px] text-[#86EFAC]">
                      {row.reads}
                    </td>
                    <td className="px-3 py-2 leading-6 text-white/52">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">{t.notReadHeading}</h2>
          <ul className="space-y-2">
            {t.notRead.map((line) => (
              <li
                key={line}
                className="flex gap-2 text-sm leading-6 text-white/62"
              >
                <Minus aria-hidden className="mt-1.5 size-3 shrink-0 text-white/28" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="max-w-2xl text-sm leading-6 text-white/48">{t.notReadNote}</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">
            {t.provenanceHeading}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-white/64">
            {t.provenanceBody}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">{t.noEnergyHeading}</h2>
          <p className="max-w-2xl text-sm leading-7 text-white/64">
            {t.noEnergyBody}
          </p>
        </section>
      </div>
    </main>
  )
}
