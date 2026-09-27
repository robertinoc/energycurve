import Link from "next/link"

import { FAQ } from "@/components/content/blocks"
import { PageShell } from "@/components/marketing/page-shell"
import {
  CHEAT_SHEET_COPY,
  CHEAT_SHEET_FAQ,
  fillCounts,
} from "@/lib/content/harmonic-cheat-sheet-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  cheatSheetCounts,
  cheatSheetKeys,
  cheatSheetLevels,
  cheatSheetMoves,
  formatMoves,
} from "@/lib/tools/harmonic-cheat-sheet"

/** The downloadable wheel. One path, both languages — see `lib/tools/camelot-wheel-svg.ts`. */
export const CAMELOT_WHEEL_SVG_PATH = "/camelot-wheel.svg"

const TABLE_WRAP =
  "overflow-x-auto rounded-2xl border border-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/45"
const TH = "px-3 py-2.5 font-semibold"
const TD = "px-3 py-2"

/**
 * The two generated tables, with no hooks and no shell, so a test can render
 * them with `renderToStaticMarkup` and compare every cell against the constant.
 */
export function CheatSheetTables({ locale }: { locale: SiteLocale }) {
  const t = CHEAT_SHEET_COPY
  const counts = cheatSheetCounts()
  const keys = cheatSheetKeys(locale)
  const levels = cheatSheetLevels(locale)
  const rows = cheatSheetMoves()

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 id="cheat-sheet-keys" className="font-heading text-xl font-semibold text-white">
          {t.keysHeading[locale]}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-white/56">{t.keysNote[locale]}</p>
        {/* A scrollable region has to be a keyboard stop (see key-table.tsx). */}
        <div className={TABLE_WRAP} tabIndex={0} role="region" aria-labelledby="cheat-sheet-keys">
          <table className="w-full min-w-[420px] text-left text-sm" data-testid="cheat-sheet-keys">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.14em] text-white/55">
              <tr>
                <th scope="col" className={TH}>{t.colCamelot[locale]}</th>
                <th scope="col" className={TH}>{t.colKey[locale]}</th>
                <th scope="col" className={TH}>{t.colShort[locale]}</th>
                <th scope="col" className={TH}>{t.colOpenKey[locale]}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((row) => (
                <tr key={row.camelot} className="border-t border-white/6">
                  <th scope="row" className={`${TD} font-mono font-bold text-white`}>{row.camelot}</th>
                  <td className={`${TD} text-white/70`}>{row.spoken}</td>
                  <td className={`${TD} font-mono text-white/70`}>{row.abbreviation}</td>
                  <td className={`${TD} font-mono text-white/70`}>{row.openKey}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 id="cheat-sheet-moves" className="font-heading text-xl font-semibold text-white">
          {t.movesHeading[locale]}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-white/56">
          {fillCounts(t.movesNote[locale], counts)}
        </p>
        <div className={TABLE_WRAP} tabIndex={0} role="region" aria-labelledby="cheat-sheet-moves">
          <table className="w-full min-w-[760px] text-left text-sm" data-testid="cheat-sheet-moves">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.14em] text-white/55">
              <tr>
                <th scope="col" className={TH}>{t.colFrom[locale]}</th>
                {levels.map((column) => (
                  <th key={column.level} scope="col" className={TH}>{column.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.from} className="border-t border-white/6">
                  <th scope="row" className={`${TD} font-mono font-bold text-white`}>{row.from}</th>
                  {levels.map((column) => (
                    <td
                      key={column.level}
                      className={`${TD} whitespace-nowrap font-mono text-white/70`}
                      data-from={row.from}
                      data-level={column.level}
                    >
                      {formatMoves(row.moves[column.level])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export function HarmonicCheatSheetPage({ locale }: { locale: SiteLocale }) {
  const t = CHEAT_SHEET_COPY
  const counts = cheatSheetCounts()

  return (
    <PageShell locale={locale} togglePath="/harmonic-mixing-cheat-sheet" width="wide">
      <header className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.14]">
          {t.h1[locale]}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/64">{fillCounts(t.lede[locale], counts)}</p>
      </header>

      <CheatSheetTables locale={locale} />

      <section className="ec-prose">
        <h2>{t.theoryHeading[locale]}</h2>
        {t.theory[locale].map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold text-white">{t.downloadHeading[locale]}</h2>
        <p className="max-w-2xl text-sm leading-6 text-white/56">
          {fillCounts(t.downloadNote[locale], counts)}
        </p>
        <div className="mx-auto w-full max-w-[420px]">
          {/* A plain <img>, not the inline SVG: the file is the deliverable, and
              showing the same bytes a reader downloads is the honest preview.
              Not `next/image` either: it is a static SVG served by our own
              route, and an optimizer between the reader and the file would
              show something other than what the download link hands over. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CAMELOT_WHEEL_SVG_PATH}
            alt={t.wheelAlt[locale]}
            width={900}
            height={900}
            className="h-auto w-full rounded-2xl border border-white/8"
            loading="lazy"
          />
        </div>
        <p>
          <a
            href={CAMELOT_WHEEL_SVG_PATH}
            download="camelot-wheel.svg"
            className="inline-flex items-center rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition hover:border-ec-cyan hover:text-ec-cyan"
          >
            {t.downloadLabel[locale]}
          </a>
        </p>
      </section>

      <section className="ec-prose">
        <h2>{t.sourceHeading[locale]}</h2>
        <p>{fillCounts(t.source[locale], counts)}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold text-white">
          {locale === "es" ? "Preguntas frecuentes" : "Frequently asked"}
        </h2>
        <FAQ entries={CHEAT_SHEET_FAQ} locale={locale} />
      </section>

      <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/8 pt-6 text-sm">
        <Link href={localizedPath("/tools/camelot-wheel", locale)} className="text-ec-cyan underline-offset-4 hover:underline">
          {t.toolLink[locale]} →
        </Link>
        <Link href={localizedPath("/tools/key-bpm-compatibility", locale)} className="text-ec-cyan underline-offset-4 hover:underline">
          {t.checkerLink[locale]} →
        </Link>
        <Link
          href={locale === "es" ? "/es/glosario/mezcla-armonica" : "/glossary/harmonic-mixing"}
          className="text-ec-cyan underline-offset-4 hover:underline"
        >
          {t.glossaryLink[locale]} →
        </Link>
      </nav>
    </PageShell>
  )
}
