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
export const metadata: Metadata = { title: "Page not found" }

/**
 * The 404 page, which did not exist.
 *
 * Ten `notFound()` calls live in this app — a blog post that moved, a set that
 * belongs to someone else, a share link whose signature no longer verifies —
 * and none of them had a not-found.tsx behind it. Every one rendered Next's
 * built-in page: black on white, English only, no heading structure, no
 * navigation, nothing that says EnergyCurve.
 *
 * The one that made this worth fixing rather than noting is `/c/[token]`. That
 * page refuses on purpose to distinguish a bad signature from a deleted set,
 * because saying which would confirm the id existed. Correct — and it meant a
 * DJ's client, clicking a link the DJ sent them, landed on an unstyled dead end
 * with no explanation and no way back to anything.
 *
 * A server component, unlike error.tsx: Next renders this during the server
 * render, so the language comes from the cookie the same way every other server
 * surface reads it, rather than being sniffed from document.cookie on the client.
 */
export default async function NotFound() {
  const locale = await getRequestLocale()

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
