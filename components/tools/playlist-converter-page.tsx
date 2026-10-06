import Link from "next/link"

import {
  ToolArticle,
  ToolCrossLinks,
  ToolFaq,
} from "@/components/tools/harmonic-tool-page"
import { PlaylistConverter } from "@/components/tools/playlist-converter"
import { PageShell } from "@/components/marketing/page-shell"
import { ContentFooter } from "@/components/marketing/content-footer"
import { CONVERTER_COPY } from "@/lib/content/playlist-converter-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The converter's page: the tool, and under it the text that makes the page
 * worth landing on.
 *
 * A **server** component holding one client island, like the other three tool
 * pages. The heading, the article, the FAQ and the links are in the HTML a
 * crawler receives; only the drop zone needs a browser.
 */

/**
 * The article this tool is the missing step of. It exists in both languages,
 * so each locale links its own — unlike the energy tool's further reading,
 * which points English readers at Spanish articles because that is where the
 * articles were.
 */
const ARTICLE: Record<SiteLocale, { slug: string; label: string }> = {
  en: {
    slug: "export-traktor-playlist-to-rekordbox",
    label: "Export a Traktor playlist to Rekordbox: what survives the move",
  },
  es: {
    slug: "exportar-playlist-de-traktor-a-rekordbox",
    label: "Exportar una playlist de Traktor a Rekordbox: qué sobrevive al cambio",
  },
}

const READ_MORE: Record<SiteLocale, string> = {
  en: "Read more",
  es: "Seguir leyendo",
}

const ENERGY_TAGS_LINK: Record<SiteLocale, string> = {
  en: "Where each program stores energy tags",
  es: "Dónde guarda cada programa los tags de energía",
}

export function PlaylistConverterPage({ locale }: { locale: SiteLocale }) {
  const article = ARTICLE[locale]

  return (
    <PageShell
      locale={locale}
      footer={<ContentFooter locale={locale} />}
      togglePath="/tools/traktor-rekordbox-converter"
      width="wide"
    >
      <header className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.14]">
          {CONVERTER_COPY.h1[locale]}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/64">
          {CONVERTER_COPY.lede[locale]}
        </p>
      </header>

      <PlaylistConverter locale={locale} />

      <ToolArticle sections={CONVERTER_COPY.article} locale={locale} />
      <ToolFaq entries={CONVERTER_COPY.faq} locale={locale} />

      <section className="flex flex-col gap-3 border-t border-white/8 pt-8">
        <h2 className="font-heading text-xl font-semibold text-white">
          {READ_MORE[locale]}
        </h2>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href={localizedPath(`/blog/${article.slug}`, locale)}
              className="text-sm text-ec-cyan underline-offset-4 hover:underline"
            >
              {article.label}
            </Link>
          </li>
          <li>
            <Link
              href={localizedPath("/energy-tags", locale)}
              className="text-sm text-ec-cyan underline-offset-4 hover:underline"
            >
              {ENERGY_TAGS_LINK[locale]}
            </Link>
          </li>
        </ul>
      </section>

      <ToolCrossLinks locale={locale} except="/tools/traktor-rekordbox-converter" />
    </PageShell>
  )
}
