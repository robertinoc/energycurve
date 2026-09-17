import Link from "next/link"

import { CamelotWheel } from "@/components/tools/camelot-wheel"
import { KeyBpmChecker } from "@/components/tools/key-bpm-checker"
import { KeyTable } from "@/components/tools/key-table"
import { PageShell } from "@/components/marketing/page-shell"
import {
  CHECKER_COPY,
  spokenKeyName,
  WHEEL_COPY,
} from "@/lib/content/harmonic-tools-copy"
import type { CopySection, FaqEntry } from "@/lib/content/tools-copy"
import { localizedPath, type LocalizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"
import { keyTable } from "@/lib/tools/harmonic-tools"

/**
 * The shared page body for both harmonic tools.
 *
 * A **server** component; the wheel, the table and the checker are the only
 * client islands. The article, the FAQ and the 24-row key table all arrive in
 * the HTML, which is what makes these pages worth landing on rather than just
 * worth using.
 *
 * The key rows are resolved here, once, from the engine's converters — so the
 * client components hold no key data that could drift from the app's.
 */

function Article({
  sections,
  locale,
}: {
  sections: readonly CopySection[]
  locale: SiteLocale
}) {
  return (
    <article className="ec-prose">
      {sections.map((section) => (
        <section key={section.heading.en}>
          <h2>{section.heading[locale]}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph[locale]}</p>
          ))}
        </section>
      ))}
    </article>
  )
}

function Faq({
  entries,
  locale,
}: {
  entries: readonly FaqEntry[]
  locale: SiteLocale
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-semibold text-white">
        {locale === "es" ? "Preguntas frecuentes" : "Frequently asked"}
      </h2>
      <dl className="flex flex-col gap-3">
        {entries.map((entry) => (
          <div
            key={entry.question.en}
            className="rounded-2xl border border-white/8 bg-white/[0.02] p-5"
          >
            <dt className="font-heading text-base font-semibold text-white">
              {entry.question[locale]}
            </dt>
            <dd className="mt-1.5 text-sm leading-6 text-white/64">
              {entry.answer[locale]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function CrossLinks({
  locale,
  except,
}: {
  locale: SiteLocale
  except: LocalizedPath
}) {
  const links: Array<{ path: LocalizedPath; label: Record<SiteLocale, string> }> =
    [
      {
        path: "/tools/camelot-wheel",
        label: { en: "Camelot wheel", es: "Rueda Camelot" },
      },
      {
        path: "/tools/key-bpm-compatibility",
        label: {
          en: "Key and BPM checker",
          es: "Compatibilidad de tonalidad y BPM",
        },
      },
      {
        path: "/tools/energy-curve",
        label: { en: "Energy curve analyzer", es: "Analizador de curva de energía" },
      },
    ]

  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/8 pt-6 text-sm">
      {links
        .filter((link) => link.path !== except)
        .map((link) => (
          <Link
            key={link.path}
            href={localizedPath(link.path, locale)}
            className="text-ec-cyan underline-offset-4 hover:underline"
          >
            {link.label[locale]} →
          </Link>
        ))}
    </nav>
  )
}

export function CamelotWheelPage({ locale }: { locale: SiteLocale }) {
  const rows = keyTable()
  const spokenNames = Object.fromEntries(
    rows.map((row) => [
      row.camelot,
      spokenKeyName(row.noteIndex, row.minor, locale),
    ])
  )

  return (
    <PageShell locale={locale} togglePath="/tools/camelot-wheel" width="wide">
      <header className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.14]">
          {WHEEL_COPY.h1[locale]}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/64">
          {WHEEL_COPY.lede[locale]}
        </p>
      </header>

      <CamelotWheel locale={locale} spokenNames={spokenNames} />

      <KeyTable
        locale={locale}
        rows={rows.map((row) => ({
          camelot: row.camelot,
          openKey: row.openKey,
          abbreviation: row.abbreviation,
          spoken: spokenNames[row.camelot],
        }))}
      />

      <Article sections={WHEEL_COPY.article} locale={locale} />
      <Faq entries={WHEEL_COPY.faq} locale={locale} />
      <CrossLinks locale={locale} except="/tools/camelot-wheel" />
    </PageShell>
  )
}

export function KeyBpmPage({ locale }: { locale: SiteLocale }) {
  return (
    <PageShell
      locale={locale}
      togglePath="/tools/key-bpm-compatibility"
      width="wide"
    >
      <header className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.14]">
          {CHECKER_COPY.h1[locale]}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/64">
          {CHECKER_COPY.lede[locale]}
        </p>
      </header>

      <KeyBpmChecker locale={locale} />

      <Article sections={CHECKER_COPY.article} locale={locale} />
      <Faq entries={CHECKER_COPY.faq} locale={locale} />
      <CrossLinks locale={locale} except="/tools/key-bpm-compatibility" />
    </PageShell>
  )
}
