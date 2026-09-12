"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import {
  IDLE_ACCOUNT_STATE,
  updateNameAction,
  type AccountActionState,
} from "@/app/dashboard/account/actions"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.account

function SaveButton({ locale }: { locale: SiteLocale }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[11px] border border-white/14 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.06] disabled:opacity-50"
    >
      {pending ? COPY.nameSaving[locale] : COPY.nameSave[locale]}
    </button>
  )
}

/**
 * Rectification, on the page where someone reads their own details.
 *
 * Two plain inputs and a button, deliberately. The right this closes (Art. 16)
 * was previously exercised by emailing support to fix a typo in your own name,
 * and anything more elaborate than this would still be slower than that felt
 * like it should be.
 */
export function NameForm({
  locale,
  defaultFirstName,
  defaultLastName,
}: {
  locale: SiteLocale
  defaultFirstName: string
  defaultLastName: string
}) {
  const [state, formAction] = useActionState<AccountActionState, FormData>(
    updateNameAction,
    IDLE_ACCOUNT_STATE
  )

  return (
    <form action={formAction} className="mt-5 space-y-3">
      <div>
        <h3 className="text-[13px] font-semibold text-white">
          {COPY.nameEditHeading[locale]}
        </h3>
        <p className="mt-1 text-[12px] leading-5 text-white/50">
          {COPY.nameEditHint[locale]}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="block text-[11px] uppercase tracking-[0.14em] text-white/50">
            {COPY.firstNameLabel[locale]}
          </span>
          <input
            name="firstName"
            type="text"
            maxLength={80}
            defaultValue={defaultFirstName}
            autoComplete="given-name"
            className="w-full rounded-[11px] border border-ec-border bg-[#0A0714] px-3 py-2 text-sm text-white outline-none focus:border-ec-violet"
          />
        </label>
        <label className="space-y-1.5">
          <span className="block text-[11px] uppercase tracking-[0.14em] text-white/50">
            {COPY.lastNameLabel[locale]}
          </span>
          <input
            name="lastName"
            type="text"
            maxLength={80}
            defaultValue={defaultLastName}
            autoComplete="family-name"
            className="w-full rounded-[11px] border border-ec-border bg-[#0A0714] px-3 py-2 text-sm text-white outline-none focus:border-ec-violet"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton locale={locale} />
        {state.message ? (
          // aria-live so the outcome reaches a screen reader: without it the
          // only signal that a save worked is a line of text appearing silently.
          <p
            aria-live="polite"
            className={`text-[12px] ${state.ok ? "text-[#4ADE80]" : "text-[#FF6B6B]"}`}
          >
            {state.message}
          </p>
        ) : (
          <p aria-live="polite" className="sr-only" />
        )}
      </div>

      <p className="text-[12px] leading-5 text-white/40">
        {COPY.emailChangeNote[locale]}
      </p>
    </form>
  )
}
