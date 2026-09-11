"use client"

import { useState } from "react"

import { clearConsent, readConsent } from "@/lib/privacy/consent"
import { getSiteCopy, type SiteLocale } from "@/lib/content/site-copy"
import { useConsent } from "@/lib/privacy/use-consent"

/**
 * "Change my analytics choice", on the cookie policy page.
 *
 * Consent that cannot be withdrawn as easily as it was given is not consent,
 * and this is the withdrawal. It lives on the page that explains what is
 * collected, which is where someone reconsidering is already standing.
 *
 * Clearing rather than flipping, on purpose: it returns the banner and lets the
 * person answer again with the current explanation in front of them, instead of
 * silently toggling a setting whose meaning they may be re-reading right now.
 */
export function ConsentControl({ locale }: { locale: SiteLocale }) {
  const copy = getSiteCopy(locale).consent
  const state = useConsent()
  const [justCleared, setJustCleared] = useState(false)

  function reconsider() {
    clearConsent()
    setJustCleared(true)
  }

  const current =
    state === "granted"
      ? locale === "es"
        ? "Ahora mismo: aceptada."
        : "Right now: accepted."
      : state === "denied"
        ? locale === "es"
          ? "Ahora mismo: rechazada."
          : "Right now: declined."
        : locale === "es"
          ? "Ahora mismo: sin responder, así que no se recolecta nada."
          : "Right now: unanswered, so nothing is collected."

  return (
    <div className="mt-6 rounded-[14px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[13px] leading-6 text-white/62">{current}</p>

      {justCleared && readConsent() === "unset" ? (
        <p className="mt-2 text-[13px] leading-6 text-white/80">{copy.changed}</p>
      ) : (
        <button
          type="button"
          onClick={reconsider}
          className="mt-3 rounded-full border border-white/16 px-4 py-2 text-[13px] font-medium text-white transition hover:border-white/30 hover:bg-white/5"
        >
          {copy.changeChoice}
        </button>
      )}
    </div>
  )
}
