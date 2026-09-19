import Link from "next/link"

import { ContentBody } from "@/components/content/content-body"
import { PageShell } from "@/components/marketing/page-shell"
import { GUIDES_COPY } from "@/lib/content/content-copy"
import { formatPostDate } from "@/lib/content/blog-copy"
import { guideIndexPath, guidePath } from "@/lib/content/glossary/paths"
import { localizedPath } from "@/lib/content/locale-routing"
import { readingMinutes, type Guide } from "@/lib/content/guides/guides"
import type { SiteLocale } from "@/lib/content/site-copy"

export function GuideIndexPage({
  guides,
  locale,
}: {
  guides: Guide[]
  locale: SiteLocale
}) {
  return (
    <PageShell locale={locale} togglePath="/guide">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.15]">
          {GUIDES_COPY.h1[locale]}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-white/64">
          {GUIDES_COPY.standfirst[locale]}
        </p>
      </header>

      {/* An index with nothing in it says so, in words. The alternative — an
          empty page that looks broken — is worse than admitting the first guide
          is still being written. */}
      {guides.length === 0 ? (
        <p className="text-sm text-white/60" data-testid="guides-empty">
          {GUIDES_COPY.empty[locale]}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {guides.map((guide) => (
            <li key={guide.id}>
              <Link
                href={guidePath(guide, locale)}
                className="block rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-white/16 hover:bg-white/[0.04]"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  {readingMinutes(guide, locale)}{" "}
                  {GUIDES_COPY.readingTime[locale]}
                </p>
                <h2 className="mt-1.5 font-heading text-lg font-semibold leading-snug text-white">
                  {guide.title[locale]}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-white/60">
                  {guide.summary[locale]}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  )
}

export function GuidePage({
  guide,
  locale,
}: {
  guide: Guide
  locale: SiteLocale
}) {
  return (
    <PageShell locale={locale} togglePath="/guide" width="wide">
      <article className="flex flex-col gap-6">
        <nav aria-label={GUIDES_COPY.h1[locale]} className="text-xs text-white/50">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={localizedPath("/", locale)} className="hover:text-white">
                {GUIDES_COPY.home[locale]}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={guideIndexPath(locale)} className="hover:text-white">
                {GUIDES_COPY.h1[locale]}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-white/72">
              {guide.title[locale]}
            </li>
          </ol>
        </nav>

        <header className="flex flex-col gap-3">
          {guide.draft ? (
            <p
              data-testid="guide-draft-badge"
              className="inline-flex w-fit rounded-full border border-ec-amber/40 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-ec-amber"
            >
              {GUIDES_COPY.draftBadge[locale]}
            </p>
          ) : null}

          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.15]">
            {guide.title[locale]}
          </h1>

          <p className="max-w-2xl text-base leading-7 text-white/64">
            {guide.summary[locale]}
          </p>

          <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            {GUIDES_COPY.updatedOn[locale]}{" "}
            {formatPostDate(guide.updatedAt, locale)} ·{" "}
            {readingMinutes(guide, locale)} {GUIDES_COPY.readingTime[locale]}
          </p>
        </header>

        {/* The table of contents is derived from the sections, so it cannot
            list a heading the page does not have or miss one it does. */}
        <nav
          aria-label={GUIDES_COPY.contents[locale]}
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            {GUIDES_COPY.contents[locale]}
          </p>
          <ol className="mt-2 flex flex-col gap-1.5 text-sm">
            {guide.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-ec-cyan underline-offset-4 hover:underline"
                >
                  {section.heading[locale]}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {guide.sections.map((section) => (
          <section key={section.id} className="flex flex-col">
            <h2
              id={section.id}
              className="scroll-mt-24 font-heading text-xl font-semibold text-white"
            >
              {section.heading[locale]}
            </h2>
            <ContentBody
              nodes={section.nodes}
              locale={locale}
              page={guidePath(guide, locale)}
            />
          </section>
        ))}

        {(guide.related?.length || guide.articles?.length) && (
          <section className="flex flex-col gap-3 border-t border-white/8 pt-6">
            <h2 className="font-heading text-lg font-semibold text-white">
              {GUIDES_COPY.related[locale]}
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              {guide.related?.map((link) => (
                <li key={link.path}>
                  <Link
                    href={localizedPath(link.path, locale)}
                    className="text-ec-cyan underline-offset-4 hover:underline"
                  >
                    {link.label[locale]}
                  </Link>
                </li>
              ))}
              {guide.articles?.map((article) => (
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

        <nav>
          <Link
            href={guideIndexPath(locale)}
            className="text-sm text-white/60 transition hover:text-white"
          >
            ← {GUIDES_COPY.backToIndex[locale]}
          </Link>
        </nav>
      </article>
    </PageShell>
  )
}
