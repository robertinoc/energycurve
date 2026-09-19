import Link from "next/link"
import { Activity, BookOpen, Music4, Scale } from "lucide-react"

import { PageShell } from "@/components/marketing/page-shell"
import { TOOLS_HUB_COPY } from "@/lib/content/tools-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The tools, in the order they are most likely to be wanted: the one that reads
 * a whole set first, the two reference tools after it.
 */
const TOOLS = [
  {
    path: "/tools/energy-curve",
    name: "toolName",
    blurb: "toolBlurb",
    icon: Activity,
  },
  {
    path: "/tools/camelot-wheel",
    name: "wheelName",
    blurb: "wheelBlurb",
    icon: Music4,
  },
  {
    path: "/tools/key-bpm-compatibility",
    name: "checkerName",
    blurb: "checkerBlurb",
    icon: Scale,
  },
] as const

/**
 * The tools index.
 *
 * Three tools now. The list is data rather than markup so a fourth is one entry
 * and not a copied block — the first version of this page had the single tool
 * hardcoded, which is exactly the shape that rots.
 */
export function ToolsHubPage({ locale }: { locale: SiteLocale }) {
  return (
    <PageShell locale={locale} togglePath="/tools">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {TOOLS_HUB_COPY.h1[locale]}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/64">
          {TOOLS_HUB_COPY.intro[locale]}
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {TOOLS.map((tool) => (
          <li key={tool.path}>
            <Link
              href={localizedPath(tool.path, locale)}
              className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-white/16 hover:bg-white/[0.04]"
            >
              <tool.icon
                className="mt-0.5 size-5 shrink-0 text-ec-cyan/70"
                aria-hidden
              />
              <span>
                <span className="block font-heading text-lg font-semibold text-white">
                  {TOOLS_HUB_COPY[tool.name][locale]}
                </span>
                <span className="mt-1 block text-sm leading-6 text-white/60">
                  {TOOLS_HUB_COPY[tool.blurb][locale]}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* The glossary, offered here rather than only in the footer: a reader who
          came for a tool and met a word they do not know is exactly who it is
          for, and this is where they meet the word. */}
      <Link
        href={localizedPath("/glossary", locale)}
        className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-white/16 hover:bg-white/[0.04]"
      >
        <BookOpen className="mt-0.5 size-5 shrink-0 text-ec-cyan/70" aria-hidden />
        <span>
          <span className="block font-heading text-lg font-semibold text-white">
            {TOOLS_HUB_COPY.glossaryName[locale]}
          </span>
          <span className="mt-1 block text-sm leading-6 text-white/60">
            {TOOLS_HUB_COPY.glossaryBlurb[locale]}
          </span>
        </span>
      </Link>

      <section className="rounded-2xl border border-dashed border-white/10 p-5">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.14em] text-white/50">
          {TOOLS_HUB_COPY.comingUp[locale]}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
          {TOOLS_HUB_COPY.comingUpBody[locale]}
        </p>
      </section>
    </PageShell>
  )
}
