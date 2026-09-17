import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Download, MessageSquare } from "lucide-react"

import { NameForm } from "@/components/dashboard/name-form"
import { PlanCard } from "@/components/dashboard/plan-card"
import { LandingContactForm } from "@/components/marketing/landing-contact-form"
import { buildReturnToHref } from "@/lib/auth/return-to"
import { isBillingConfigured } from "@/lib/billing/config"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import { getSiteCopy, type SiteLocale } from "@/lib/content/site-copy"
import { KEY_NOTATIONS, type KeyNotation } from "@/lib/music/camelot"
import { getRequestLocale } from "@/lib/server-locale"
import { getProfileBilling } from "@/services/billing-service"
import {
  getProfileKeyNotation,
  syncProfileFromWorkOSUser,
} from "@/services/profile-service"

export const metadata: Metadata = {
  title: "Account",
}

export const dynamic = "force-dynamic"

const COPY = DASHBOARD_COPY.account

/** Human names for the notation codes, matching the tracklist's own switcher. */
const NOTATION_LABELS: Record<KeyNotation, Record<SiteLocale, string>> = {
  camelot: DASHBOARD_COPY.trackTable.keyNotationCamelot,
  open_key: DASHBOARD_COPY.trackTable.keyNotationOpenKey,
  musical: DASHBOARD_COPY.trackTable.keyNotationMusical,
  as_imported: DASHBOARD_COPY.trackTable.keyNotationAsImported,
}

/**
 * Your details, your plan, and a way to reach us without leaving the app.
 *
 * The last part is why this page exists. An alpha user reported having to log
 * out to send feedback, because the contact form lived only on the landing
 * page — so the cost of telling us about a bug was losing your session. During
 * an alpha, reports are the entire point; anything that taxes them is a bug of
 * its own.
 *
 * Deliberately thin on "settings". There is no personal data here beyond a
 * name, an email and two display preferences, and both preferences are already
 * changed where they are used — duplicating the controls would create two
 * places to look and one of them would drift.
 */
export default async function AccountPage() {
  const { user } = await withAuth()

  if (!user) {
    redirect(buildReturnToHref("/login", "/dashboard/account"))
  }

  const profile = await syncProfileFromWorkOSUser({
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  })

  const locale = await getRequestLocale()
  const [billing, keyNotation] = await Promise.all([
    getProfileBilling(profile.id),
    getProfileKeyNotation(profile.id),
  ])

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "—"

  const notation = KEY_NOTATIONS.includes(keyNotation) ? keyNotation : "camelot"

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-white">
          {COPY.title[locale]}
        </h1>
        <p className="text-sm leading-6 text-white/60">
          {COPY.subtitle[locale]}
        </p>
      </header>

      <section className="rounded-[16px] border border-ec-border bg-[#0C0917] p-5">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
          {COPY.detailsHeading[locale]}
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail label={COPY.nameLabel[locale]} value={displayName} />
          <Detail label={COPY.emailLabel[locale]} value={user.email} />
          <Detail
            label={COPY.languageLabel[locale]}
            value={locale === "es" ? "Español" : "English"}
          />
          <Detail
            label={COPY.keyNotationLabel[locale]}
            value={NOTATION_LABELS[notation][locale]}
            hint={COPY.keyNotationHint[locale]}
          />
        </dl>

        <NameForm
          locale={locale}
          defaultFirstName={user.firstName ?? ""}
          defaultLastName={user.lastName ?? ""}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
          {COPY.planHeading[locale]}
        </h2>
        <PlanCard
          billing={billing}
          locale={locale}
          billingConfigured={isBillingConfigured()}
        />
      </section>

      <section className="rounded-[16px] border border-ec-border bg-[#0C0917] p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-white">
          <MessageSquare aria-hidden className="size-4 text-ec-violet" />
          {COPY.contactHeading[locale]}
        </h2>
        <p className="mt-1.5 mb-5 text-[13px] leading-6 text-white/60">
          {COPY.contactBody[locale]}
        </p>
        {/* Name and email prefilled: we already know both, and making someone
            retype them is how a two-line bug report becomes no bug report. */}
        <LandingContactForm
          copy={getSiteCopy(locale).contact}
          defaultName={displayName === "—" ? undefined : displayName}
          defaultEmail={user.email}
        />
      </section>

      {/*
        Portability, reachable without asking us for it.

        This is on the account page rather than buried in the privacy policy
        because a right you have to read a legal document to discover is a right
        most people never exercise. A plain anchor, not a fetch: the route
        answers with Content-Disposition, so the browser saves the file and
        there is no blob URL to revoke — which is the mechanism that made the
        playlist export fail silently on iOS in August.
      */}
      <section className="rounded-[16px] border border-ec-border bg-[#0C0917] p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-white">
          <Download aria-hidden className="size-4 text-ec-violet" />
          {COPY.dataHeading[locale]}
        </h2>
        <p className="mt-1.5 text-[13px] leading-6 text-white/60">
          {COPY.dataBody[locale]}
        </p>
        <p className="mt-2 text-[12px] leading-5 text-white/45">
          {COPY.dataAudioNote[locale]}
        </p>
        <a
          href="/api/account/export"
          download
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/14 px-4 py-2 text-[13px] font-medium text-white transition hover:border-white/28 hover:bg-white/5"
        >
          <Download aria-hidden className="size-3.5" />
          {COPY.dataDownload[locale]}
        </a>
      </section>
    </div>
  )
}

function Detail({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-white/40">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm text-white/88">{value}</dd>
      {hint ? (
        <p className="mt-1 text-[11px] leading-4 text-white/38">{hint}</p>
      ) : null}
    </div>
  )
}
