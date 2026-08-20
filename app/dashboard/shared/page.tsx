import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"

import { buildReturnToHref } from "@/lib/auth/return-to"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { getRequestLocale } from "@/lib/server-locale"
import { listSharedWithMe } from "@/services/collaboration-service"

export const metadata: Metadata = { title: "Shared with me" }
export const dynamic = "force-dynamic"

const COPY = DASHBOARD_COPY.collaboration

/**
 * Sets other DJs shared with this person.
 *
 * Keyed off the login email rather than a profile id, which is what makes an
 * invite sent before signup work with no claim flow: the row was always addressed
 * to this address, and today is the first day someone is logged in with it.
 */
export default async function SharedWithMePage() {
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/shared"))
  }

  const [shared, locale] = await Promise.all([
    listSharedWithMe(user.email),
    getRequestLocale(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 lg:px-10">
      <header className="space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-white">
          {COPY.sharedIndexTitle[locale]}
        </h1>
        <p className="max-w-[62ch] text-sm leading-6 text-white/58">
          {COPY.sharedIndexIntro[locale]}
        </p>
      </header>

      {shared.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-10 text-center text-sm text-white/50">
          {COPY.sharedIndexEmpty[locale]}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shared.map((set) => (
            <li key={set.playlistId}>
              <Link
                href={`/dashboard/shared/${set.playlistId}`}
                className="block rounded-2xl border border-white/10 bg-ec-surface p-4 transition hover:border-white/20"
              >
                <p className="font-heading text-base font-semibold text-white">
                  {set.name}
                </p>
                <p className="mt-0.5 text-[13px] text-white/50">
                  {set.trackCount} · {formatTemplate(COPY.sharedBy[locale], {
                    email: set.ownerEmail,
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
