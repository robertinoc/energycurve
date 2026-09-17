import Link from "next/link"
import { Activity } from "lucide-react"

import { PageShell } from "@/components/marketing/page-shell"
import { TOOLS_HUB_COPY } from "@/lib/content/tools-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The tools index.
 *
 * One tool today, which is why the "coming up" note is on it: a list of one is
 * indistinguishable from an abandoned section, and naming the next two is more
 * honest than "more soon" and more useful than nothing. It exists now rather
 * than when there are three because the energy-curve page needs a parent for its
 * breadcrumb, and because "free dj tools" is a search with no page to match.
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
        <li>
          <Link
            href={localizedPath("/tools/energy-curve", locale)}
            className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-white/16 hover:bg-white/[0.04]"
          >
            <Activity className="mt-0.5 size-5 shrink-0 text-ec-cyan/70" aria-hidden />
            <span>
              <span className="block font-heading text-lg font-semibold text-white">
                {TOOLS_HUB_COPY.toolName[locale]}
              </span>
              <span className="mt-1 block text-sm leading-6 text-white/60">
                {TOOLS_HUB_COPY.toolBlurb[locale]}
              </span>
            </span>
          </Link>
        </li>
      </ul>

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
