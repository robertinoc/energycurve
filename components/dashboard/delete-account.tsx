"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import {
  cancelAccountDeletionAction,
  IDLE_ACCOUNT_STATE,
  requestAccountDeletionAction,
  type AccountActionState,
} from "@/app/(en)/dashboard/account/actions"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.account

function Button({
  idle,
  busy,
  tone,
}: {
  idle: string
  busy: string
  tone: "danger" | "safe"
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        tone === "danger"
          ? "rounded-[11px] border border-[rgba(255,107,107,0.4)] px-4 py-2 text-[13px] font-semibold text-[#FF8F8F] transition-colors hover:bg-[rgba(255,107,107,0.08)] disabled:opacity-50"
          : "rounded-[11px] border border-white/14 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.06] disabled:opacity-50"
      }
    >
      {pending ? busy : idle}
    </button>
  )
}

function Outcome({ state }: { state: AccountActionState }) {
  if (!state.message) {
    return <p aria-live="polite" className="sr-only" />
  }

  return (
    <p
      aria-live="polite"
      className={`text-[12px] leading-5 ${state.ok ? "text-[#4ADE80]" : "text-[#FF6B6B]"}`}
    >
      {state.message}
    </p>
  )
}

/**
 * Erasure, on the page where somebody reads their own details.
 *
 * Two states, and which one renders is the whole component: a pending deletion
 * shows the date and one button that undoes it, and nothing else. Leaving the
 * scheduling form up next to a pending request would offer a second delete to
 * somebody who has already asked, which is the kind of interface that produces
 * "I clicked it twice, did that make it worse?".
 *
 * The confirmation is the account email, typed. Not a checkbox: a checkbox stops
 * a misclick and nothing more, and this is the only thing on the page that does
 * not come back. What it explicitly does NOT defend against is a hijacked
 * session — whoever has the session can read the address off this very page —
 * and that is what the notification email is for.
 */
export function DeleteAccount({
  locale,
  email,
  planEndsAt,
  pendingUntil,
}: {
  locale: SiteLocale
  email: string
  /** Formatted date the paid period runs to, or null when there is no plan. */
  planEndsAt: string | null
  /** Formatted date the account will be deleted, or null when none is pending. */
  pendingUntil: string | null
}) {
  const [requestState, requestAction] = useActionState<
    AccountActionState,
    FormData
  >(requestAccountDeletionAction, IDLE_ACCOUNT_STATE)
  const [cancelState, cancelAction] = useActionState<
    AccountActionState,
    FormData
  >(cancelAccountDeletionAction, IDLE_ACCOUNT_STATE)

  // The server is the authority on whether a deletion is pending, except right
  // after a successful action in this render pass — `revalidatePath` refreshes
  // the page, but the optimistic read keeps the two buttons from both showing
  // for a frame.
  const isPending = cancelState.ok
    ? false
    : requestState.ok || pendingUntil !== null

  if (isPending) {
    return (
      <section className="rounded-[16px] border border-[rgba(255,107,107,0.28)] bg-[rgba(255,107,107,0.04)] p-5">
        <h2 className="font-heading text-base font-semibold text-[#FF8F8F]">
          {COPY.deletePendingHeading[locale]}
        </h2>
        {pendingUntil ? (
          <p className="mt-1.5 text-[13px] leading-6 text-white/70">
            {COPY.deletePendingBody[locale].replace("{date}", pendingUntil)}
          </p>
        ) : null}
        <p className="mt-2 text-[12px] leading-5 text-white/50">
          {COPY.deleteExportFirst[locale]}
        </p>

        <form action={cancelAction} className="mt-4 space-y-2">
          <Button
            idle={COPY.deleteCancel[locale]}
            busy={COPY.deleteCancelling[locale]}
            tone="safe"
          />
          <Outcome state={cancelState} />
        </form>

        {/* The scheduling outcome stays visible under the pending state: it is
            the message that carries the date and the billing warning. */}
        {requestState.ok ? <Outcome state={requestState} /> : null}
      </section>
    )
  }

  return (
    <section className="rounded-[16px] border border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.03)] p-5">
      <h2 className="font-heading text-base font-semibold text-[#FF8F8F]">
        {COPY.deleteHeading[locale]}
      </h2>
      <p className="mt-1.5 text-[13px] leading-6 text-white/70">
        {COPY.deleteBody[locale]}
      </p>
      <p className="mt-2 text-[13px] leading-6 text-white/70">
        {COPY.deleteGrace[locale]}
      </p>

      {/* Only when there is something to lose. A free account does not need a
          paragraph about refunds. */}
      {planEndsAt ? (
        <p className="mt-3 rounded-[11px] border border-white/10 bg-[#0A0714]/60 px-3 py-2 text-[12px] leading-5 text-white/65">
          {COPY.deletePlanWarning[locale].replace("{date}", planEndsAt)}
        </p>
      ) : null}

      <p className="mt-3 text-[12px] leading-5 text-white/50">
        {COPY.deleteExportFirst[locale]}
      </p>
      <p className="mt-1 text-[12px] leading-5 text-white/40">
        {COPY.deleteAudioNote[locale]}
      </p>

      <form action={requestAction} className="mt-5 space-y-3">
        <label className="block space-y-1.5">
          <span className="block text-[11px] uppercase tracking-[0.14em] text-white/50">
            {COPY.deleteConfirmLabel[locale]}
          </span>
          <input
            name="confirmEmail"
            type="text"
            inputMode="email"
            // No autofill, and no `type="email"`. A browser filling this in
            // would remove the only friction the control has, and native email
            // validation would reject the typo before the server can say
            // "that is not the email on this account" — which is the message
            // that actually tells somebody they mistyped.
            autoComplete="off"
            placeholder={email}
            className="w-full rounded-[11px] border border-ec-border bg-[#0A0714] px-3 py-2 text-sm text-white outline-none focus:border-[rgba(255,107,107,0.5)]"
          />
        </label>
        <p className="text-[12px] leading-5 text-white/40">
          {COPY.deleteConfirmHint[locale]}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            idle={COPY.deleteSubmit[locale]}
            busy={COPY.deleteSubmitting[locale]}
            tone="danger"
          />
          <Outcome state={requestState} />
        </div>
      </form>
    </section>
  )
}
