import type { Metadata } from "next"
import Link from "next/link"
import { Compass } from "lucide-react"

import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { getRequestLocale } from "@/lib/server-locale"

const COPY = DASHBOARD_COPY.home

/**
 * Without this the page inherited the root layout's title, so every dead link
 * produced a tab reading "EnergyCurve — DJ Set Energy Analysis & Track Order":
 * a 404 announcing itself as the marketing homepage, in the browser tab, in
 * history, and in anything that reads a title off a shared URL.
 *
 * No `robots` here on purpose. Next already emits `<meta name="robots"
 * content="noindex">` for a not-found render, and the root layout emits
 * `index, follow` after it — two contradictory directives on the same page.
 * Harmless in practice (the 404 status is what search engines act on, and the
 * more restrictive directive wins when they conflict), and adding a third would
 * not make it less confusing. Recorded in docs/qa/ux-edge-cases.md instead.
 */
export const metadata: Metadata = { title: "Set not found" }

/**
 * The dashboard's own 404, rendered inside the dashboard shell so a signed-in DJ
 * keeps their sidebar and their sets.
 *
 * Separate from the root one because the audience is different and so is the
 * honest message. Six of the ten `notFound()` calls are under /dashboard, and
 * every one of them is reached in one of two ways: the set was deleted, or **it
 * belongs to another account**. That second case is the ownership check
 * refusing, and the wording has to cover it without confirming anything: "it may
 * belong to another account" is true whether or not the id exists, which is the
 * same reasoning the service layer uses when it returns nothing rather than 403.
 */
export default async function DashboardNotFound() {
  const locale = await getRequestLocale()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-20 text-center lg:px-10">
      <Compass className="size-9 text-ec-cyan/70" aria-hidden />

      <h1 className="font-heading text-2xl font-semibold text-white sm:text-3xl">
        {COPY.missingTitleDashboard[locale]}
      </h1>

      <p className="max-w-lg text-sm leading-7 text-white/60">
        {COPY.missingBodyDashboard[locale]}
      </p>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard/playlists"
          className="rounded-[13px] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_26px_rgba(106,92,240,0.35)] transition-transform hover:-translate-y-px"
          style={{
            background:
              "linear-gradient(96deg, #A24DE0 0%, #6A5CF0 46%, #22D3EE 100%)",
          }}
        >
          {COPY.missingBackToSets[locale]}
        </Link>
      </div>
    </div>
  )
}
