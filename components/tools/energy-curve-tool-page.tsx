import Link from "next/link"

import { EnergyCurveTool } from "@/components/tools/energy-curve-tool"
import { PageShell } from "@/components/marketing/page-shell"
import { TOOL_COPY } from "@/lib/content/tools-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The energy-curve tool's page: the tool itself, and under it the text that
 * makes the page worth landing on.
 *
 * A **server** component holding one client island. Everything but
 * `<EnergyCurveTool>` — the heading, the article, the FAQ, the links — is in the
 * HTML that arrives from the server, which is the entire reason this page exists
 * as a separate surface rather than as a screen inside the app. A tool rendered
 * entirely on the client is a page a crawler reads as empty.
 */

/**
 * The five Spanish articles, linked where each one actually follows on from
 * something the page just said.
 *
 * Spanish slugs under both locales because that is where the articles are; an
 * English reader following one lands on Spanish, which is better than a link
 * that 404s and is what the blog index already tells them.
 */
const FURTHER_READING: Array<{
  slug: string
  label: Record<SiteLocale, string>
}> = [
  {
    slug: "esta-bien-el-orden-de-mi-set",
    label: {
      en: "Is the order of my set any good?",
      es: "¿Está bien el orden de mi set?",
    },
  },
  {
    slug: "cuanto-es-mucho-salto-de-energia",
    label: {
      en: "How big is too big an energy jump?",
      es: "¿Cuánto es mucho salto de energía?",
    },
  },
  {
    slug: "antes-de-tocar-no-despues",
    label: {
      en: "Analyze your set before you play it, not after",
      es: "Analizá tu set antes de tocarlo, no después",
    },
  },
  {
    slug: "tus-temas-no-tienen-bpm-ni-tonalidad",
    label: {
      en: "Your tracks have no BPM or key: what to do",
      es: "Tus temas no tienen BPM ni tonalidad: qué hacer",
    },
  },
  {
    slug: "ordenar-un-set-desde-una-lista-de-texto",
    label: {
      en: "Ordering a set from a plain text list",
      es: "Ordenar un set desde una lista de texto",
    },
  },
]

export function EnergyCurveToolPage({ locale }: { locale: SiteLocale }) {
  return (
    <PageShell locale={locale} togglePath="/tools/energy-curve" width="wide">
      <header className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.6rem] sm:leading-[1.12]">
          {TOOL_COPY.h1[locale]}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/64">
          {TOOL_COPY.lede[locale]}
        </p>
      </header>

      <EnergyCurveTool locale={locale} />

      {/* .ec-prose is the same treatment the blog articles get, so the text
          under a tool reads like the text anywhere else on the site. */}
      <article className="ec-prose mt-2">
        {TOOL_COPY.article.map((section) => (
          <section key={section.heading.en}>
            <h2>{section.heading[locale]}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph[locale]}</p>
            ))}
          </section>
        ))}
      </article>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold text-white">
          {locale === "es" ? "Preguntas frecuentes" : "Frequently asked"}
        </h2>
        <dl className="flex flex-col gap-3">
          {TOOL_COPY.faq.map((entry) => (
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

      <section className="flex flex-col gap-3 border-t border-white/8 pt-8">
        <h2 className="font-heading text-xl font-semibold text-white">
          {TOOL_COPY.readMore[locale]}
        </h2>
        <ul className="flex flex-col gap-2">
          {FURTHER_READING.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={localizedPath(`/blog/${entry.slug}`, "es")}
                className="text-sm text-ec-cyan underline-offset-4 hover:underline"
              >
                {entry.label[locale]}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-sm">
          <Link
            href={localizedPath("/import-formats", locale)}
            className="text-white/60 underline-offset-4 hover:text-white hover:underline"
          >
            {TOOL_COPY.ui.formatsLink[locale]}
          </Link>
        </p>
      </section>
    </PageShell>
  )
}
