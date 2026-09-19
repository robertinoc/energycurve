import Link from "next/link"

import { CTA } from "@/components/content/blocks"
import { GlossaryFilter } from "@/components/content/glossary-filter"
import { Prose } from "@/components/content/prose"
import { PageShell } from "@/components/marketing/page-shell"
import { parseMarkdown } from "@/lib/blog/markdown"
import { GLOSSARY_COPY } from "@/lib/content/content-copy"
import {
  glossaryIndexPath,
  glossaryTermPath,
} from "@/lib/content/glossary/paths"
import {
  GLOSSARY_BY_ID,
  groupedByLetter,
  type GlossaryTerm,
} from "@/lib/content/glossary/terms"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/** The index: every entry, grouped by letter, filterable. */
export function GlossaryIndexPage({ locale }: { locale: SiteLocale }) {
  const groups = groupedByLetter(locale).map((group) => ({
    letter: group.letter,
    terms: group.terms.map((term) => ({
      id: term.id,
      title: term.title[locale],
      short: term.short[locale],
      href: glossaryTermPath(term, locale),
    })),
  }))

  return (
    <PageShell locale={locale} togglePath="/glossary">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.15]">
          {GLOSSARY_COPY.h1[locale]}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-white/64">
          {GLOSSARY_COPY.standfirst[locale]}
        </p>
      </header>

      <GlossaryFilter
        groups={groups}
        locale={locale}
        label={GLOSSARY_COPY.filterLabel[locale]}
        placeholder={GLOSSARY_COPY.filterPlaceholder[locale]}
        empty={GLOSSARY_COPY.empty[locale]}
        countLabel={GLOSSARY_COPY.count[locale]}
      />

      <CTA variant="tool" locale={locale} />
    </PageShell>
  )
}

function Breadcrumbs({
  term,
  locale,
}: {
  term: GlossaryTerm
  locale: SiteLocale
}) {
  return (
    <nav
      aria-label={GLOSSARY_COPY.h1[locale]}
      className="text-xs text-white/50"
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href={localizedPath("/", locale)} className="hover:text-white">
            {GLOSSARY_COPY.home[locale]}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href={glossaryIndexPath(locale)} className="hover:text-white">
            {GLOSSARY_COPY.h1[locale]}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-white/72">
          {term.title[locale]}
        </li>
      </ol>
    </nav>
  )
}

/** One entry: short definition first, then the body, then where to go next. */
export function GlossaryTermPage({
  term,
  locale,
}: {
  term: GlossaryTerm
  locale: SiteLocale
}) {
  const seeAlso = (term.see ?? [])
    .map((id) => GLOSSARY_BY_ID.get(id))
    .filter((other): other is GlossaryTerm => Boolean(other))

  return (
    <PageShell locale={locale} togglePath="/glossary">
      <article className="flex flex-col gap-5">
        <Breadcrumbs term={term} locale={locale} />

        <header className="flex flex-col gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.15]">
            {term.title[locale]}
          </h1>

          {/* The short definition, given its own block above the body: it is
              what the tooltip shows, what the index shows and what the schema
              declares, so a reader who came for one sentence gets it first. */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
              {GLOSSARY_COPY.inShort[locale]}
            </p>
            <p className="mt-1.5 text-base leading-7 text-white/80">
              {term.short[locale]}
            </p>
          </div>
        </header>

        <Prose blocks={parseMarkdown(term.body[locale])} />

        {(term.links?.length || term.articles?.length) && (
          <section className="flex flex-col gap-3 border-t border-white/8 pt-6">
            <h2 className="font-heading text-lg font-semibold text-white">
              {GLOSSARY_COPY.keepReading[locale]}
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              {term.links?.map((link) => (
                <li key={link.path}>
                  <Link
                    href={localizedPath(link.path, locale)}
                    className="text-ec-cyan underline-offset-4 hover:underline"
                  >
                    {link.label[locale]}
                  </Link>
                </li>
              ))}
              {/* Articles exist in Spanish only, so an English page links to
                  the Spanish original rather than to a translation that does
                  not exist. Saying which language it is in is the honest part. */}
              {term.articles?.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={localizedPath(`/blog/${article.slug}`, "es")}
                    hrefLang="es"
                    className="text-ec-cyan underline-offset-4 hover:underline"
                  >
                    {article.label[locale]}
                    {locale === "en" ? (
                      <span className="text-white/50"> (en español)</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {seeAlso.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-semibold text-white">
              {GLOSSARY_COPY.seeAlso[locale]}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {seeAlso.map((other) => (
                <li key={other.id}>
                  <Link
                    href={glossaryTermPath(other, locale)}
                    className="inline-flex rounded-full border border-white/12 px-3 py-1.5 text-sm text-white/72 transition hover:border-white/30 hover:text-white"
                  >
                    {other.title[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <CTA variant="tool" locale={locale} />

        <nav>
          <Link
            href={glossaryIndexPath(locale)}
            className="text-sm text-white/60 transition hover:text-white"
          >
            ← {GLOSSARY_COPY.backToIndex[locale]}
          </Link>
        </nav>
      </article>
    </PageShell>
  )
}
