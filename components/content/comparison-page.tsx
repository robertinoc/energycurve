import Link from "next/link"

import { ContentBody } from "@/components/content/content-body"
import { PageShell } from "@/components/marketing/page-shell"
import type { Comparison } from "@/lib/content/compare/comparisons"
import {
  comparisonAlternates,
  comparisonPath,
} from "@/lib/content/compare/paths"
import { COMPARE_COPY } from "@/lib/content/content-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * One comparison, rendered from the same content nodes the guides use.
 *
 * Two things on this page are structural rather than decorative:
 *
 * **The verification date and the sources sit above the content**, not in a
 * footnote. A comparison page is a set of claims about somebody else's product;
 * the reader's first question is where the claims came from and when, and
 * answering it after the tables is answering it too late.
 *
 * **The language toggle goes to the twin page**, not to a list. These pages
 * have no index to fall back on, which is why `PageShell` accepts the two URLs
 * outright — see `LocaleToggleTarget`.
 */
export function ComparisonPage({
  comparison,
  locale,
}: {
  comparison: Comparison
  locale: SiteLocale
}) {
  const verified = new Date(comparison.verifiedAt).toLocaleDateString(
    locale === "es" ? "es-AR" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  )

  return (
    <PageShell
      locale={locale}
      togglePath={comparisonAlternates(comparison)}
      width="wide"
    >
      <article className="flex flex-col gap-6">
        <nav
          aria-label={COMPARE_COPY.crumb[locale]}
          className="text-xs text-white/50"
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link
                href={localizedPath("/", locale)}
                className="hover:text-white"
              >
                {COMPARE_COPY.home[locale]}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-white/72">
              {comparison.title[locale]}
            </li>
          </ol>
        </nav>

        <header className="flex flex-col gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.15]">
            {comparison.title[locale]}
          </h1>

          <p className="max-w-2xl text-base leading-7 text-white/64">
            {comparison.summary[locale]}
          </p>
        </header>

        {/* The provenance block. Everything this page says about the other
            product traces to one of these links, on this date. */}
        <aside className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm sm:p-5">
          <p className="text-white/64">
            {COMPARE_COPY.verifiedOn[locale]}{" "}
            <time dateTime={comparison.verifiedAt} className="text-white/85">
              {verified}
            </time>
            .
          </p>
          <p className="mt-2 text-white/64">
            {COMPARE_COPY.sources[locale]}:{" "}
            {comparison.sources.map((source, index) => (
              <span key={source.url}>
                {index > 0 ? " · " : null}
                <a
                  href={source.url}
                  rel="nofollow noopener noreferrer"
                  target="_blank"
                  className="text-white/85 underline underline-offset-4 hover:text-white"
                >
                  {source.label}
                </a>
              </span>
            ))}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-white/50">
            {COMPARE_COPY.disclaimer[locale]}
          </p>
        </aside>

        {/* Derived from the sections, so it cannot list a heading the page does
            not have or miss one it does. */}
        <nav
          aria-label={COMPARE_COPY.contents[locale]}
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
            {COMPARE_COPY.contents[locale]}
          </p>
          <ol className="mt-2 flex flex-col gap-1.5 text-sm">
            {comparison.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-white/70 underline-offset-4 hover:text-white hover:underline"
                >
                  {section.heading[locale]}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {comparison.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="flex scroll-mt-24 flex-col gap-4"
          >
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              {section.heading[locale]}
            </h2>
            <ContentBody
              nodes={section.nodes}
              locale={locale}
              page={comparisonPath(comparison, locale)}
            />
          </section>
        ))}
      </article>
    </PageShell>
  )
}
