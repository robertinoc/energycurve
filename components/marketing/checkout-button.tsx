"use client"

import { useState } from "react"

import { buildReturnToHref } from "@/lib/auth/return-to"
import { cn } from "@/lib/utils"

/**
 * Starts a Stripe Checkout session for a plan.
 *
 * A POST rather than a link because the session is minted per click and expires,
 * and because the price id is resolved **server-side** from the environment — the
 * client sends `plan` + `interval` and never says what anything costs. That's the
 * invariant that keeps a tampered request from buying PRO+ at the PRO price.
 *
 * `/pricing` is a public page, so most people clicking this aren't signed in yet.
 * A 401 is therefore the expected path, not an error: it sends them to sign up and
 * back here, rather than showing a failure for something they did right.
 */
export function CheckoutButton({
  plan,
  interval,
  label,
  startingLabel,
  errorLabel,
  emphasis,
}: {
  /** API-side plan key, which is not the same as the copy's plan id. */
  plan: "pro" | "pro_plus"
  interval: "monthly" | "yearly"
  label: string
  startingLabel: string
  errorLabel: string
  emphasis: boolean
}) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function start() {
    setPending(true)
    setFailed(false)

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      })

      if (response.status === 401) {
        window.location.href = buildReturnToHref("/signup", "/pricing")
        return
      }

      const data: unknown = await response.json()
      const url =
        data && typeof data === "object" && "url" in data ? data.url : null

      if (!response.ok || typeof url !== "string") {
        setFailed(true)
        setPending(false)
        return
      }

      // `pending` stays set: the navigation ends this component, and re-enabling
      // first invites a second click that mints a second session.
      window.location.href = url
    } catch {
      setFailed(true)
      setPending(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={start}
        className={cn(
          "rounded-full px-6 py-3 text-center text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
          emphasis
            ? "ec-gradient-bg text-white shadow-[0_8px_24px_rgba(120,60,220,0.35)] hover:opacity-95"
            : "border border-white/20 text-white/82 hover:border-white/40 hover:text-white"
        )}
      >
        {pending ? startingLabel : label}
      </button>
      {failed ? (
        <span role="alert" className="text-center text-xs text-ec-error">
          {errorLabel}
        </span>
      ) : null}
    </div>
  )
}
