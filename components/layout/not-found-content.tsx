import Link from "next/link"
import { Compass } from "lucide-react"

import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.home

/**
 * The branded 404 body, without the page shell around it.
 *
 * It got lifted out of `not-found.tsx` when the app grew a second root layout.
 * Next resolves a `notFound()` to the nearest `not-found.tsx`, and a URL that
 * matched no route at all is inside neither `(en)` nor `(es)` — so it reaches
 * `app/not-found.tsx`, which has no layout above it and has to render its own
 * `<html>`. Three call sites, one body: the Spanish tree, the English tree, and
 * the nowhere-at-all case.
 *
 * Takes its locale rather than reading the cookie, because one of those three
 * already knows the answer from the route it sits in.
 */
export function NotFoundContent({ locale }: { locale: SiteLocale }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-20 text-center lg:px-10">
      <Compass className="size-9 text-ec-cyan/70" aria-hidden />

      <h1 className="font-heading text-2xl font-semibold text-white sm:text-3xl">
        {COPY.missingTitle[locale]}
      </h1>

      <p className="max-w-lg text-sm leading-7 text-white/60">
        {COPY.missingBody[locale]}
      </p>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-[13px] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_26px_rgba(106,92,240,0.35)] transition-transform hover:-translate-y-px"
          style={{
            background:
              "linear-gradient(96deg, #A24DE0 0%, #6A5CF0 46%, #22D3EE 100%)",
          }}
        >
          {COPY.crashHome[locale]}
        </Link>
      </div>
    </div>
  )
}
