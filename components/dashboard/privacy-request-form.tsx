"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"

import {
  filePrivacyRequestAction,
  IDLE_ACCOUNT_STATE,
  type AccountActionState,
} from "@/app/(en)/dashboard/account/actions"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import type { PrivacyRequestKind } from "@/services/privacy-request-service"

const COPY = DASHBOARD_COPY.account

type LocalizedText = Record<SiteLocale, string>

const KIND_OPTIONS: Array<{
  value: PrivacyRequestKind
  label: LocalizedText
  hint: LocalizedText | null
}> = [
  {
    value: "rectify_email",
    label: COPY.rightsKindRectifyEmail,
    hint: COPY.rightsKindHintRectifyEmail,
  },
  { value: "object", label: COPY.rightsKindObject, hint: COPY.rightsKindHintObject },
  {
    value: "restrict",
    label: COPY.rightsKindRestrict,
    hint: COPY.rightsKindHintRestrict,
  },
  { value: "other", label: COPY.rightsKindOther, hint: null },
]

function SubmitButton({ locale }: { locale: SiteLocale }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[11px] border border-white/14 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.06] disabled:opacity-50"
    >
      {pending ? COPY.rightsSubmitting[locale] : COPY.rightsSubmit[locale]}
    </button>
  )
}

/**
 * Filing a request for the rights that are not a switch.
 *
 * Two deliberate choices about what this form does *not* do.
 *
 * It does not collect the new email address in a field. Changing the address
 * moves the login identity and drops every set shared with you — matched by
 * address — so a field labelled "new email" next to a Save button would promise
 * a swap this product cannot make in one step. The note is free text and the
 * hint says what to write.
 *
 * And it sends people away from itself. The first thing above the form says that
 * two of the nearby things are already one click: the name field above, and the
 * analytics switch on the Cookie Policy page. Somebody filing a request to turn
 * off analytics and then waiting a month would be a worse outcome than not
 * offering the form — the right was already immediate and the form made it
 * slower.
 */
export function PrivacyRequestForm({ locale }: { locale: SiteLocale }) {
  const [state, formAction] = useActionState<AccountActionState, FormData>(
    filePrivacyRequestAction,
    IDLE_ACCOUNT_STATE
  )
  const [kind, setKind] = useState<PrivacyRequestKind>("rectify_email")

  const hint = KIND_OPTIONS.find((option) => option.value === kind)?.hint

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="privacy-request-kind"
          className="block text-[11px] uppercase tracking-[0.14em] text-white/50"
        >
          {COPY.rightsKindLabel[locale]}
        </label>
        <select
          id="privacy-request-kind"
          name="kind"
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as PrivacyRequestKind)
          }
          className="w-full rounded-[11px] border border-ec-border bg-[#0A0714] px-3 py-2 text-sm text-white outline-none focus:border-ec-violet"
        >
          {KIND_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label[locale]}
            </option>
          ))}
        </select>
        {/* The hint is what makes the choice meaningful: "restriction of
            processing" is a phrase from a regulation, not from anyone's life. */}
        {hint ? (
          <p className="text-[12px] leading-5 text-white/50">{hint[locale]}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="privacy-request-details"
          className="block text-[11px] uppercase tracking-[0.14em] text-white/50"
        >
          {COPY.rightsDetailsLabel[locale]}
        </label>
        <textarea
          id="privacy-request-details"
          name="details"
          rows={3}
          maxLength={2000}
          className="w-full rounded-[11px] border border-ec-border bg-[#0A0714] px-3 py-2 text-sm text-white outline-none focus:border-ec-violet"
        />
        <p className="text-[12px] leading-5 text-white/40">
          {COPY.rightsDetailsHint[locale]}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton locale={locale} />
        {state.message ? (
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
    </form>
  )
}
