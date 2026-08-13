"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.billing

/**
 * Opens Stripe's billing portal.
 *
 * Until this existed the only way to reach it was to hand-call
 * `/api/billing/portal` from a browser console — so in practice a subscriber had
 * no way to change their card or cancel. Taking money with no self-serve way to
 * stop paying generates chargebacks, and in several jurisdictions isn't legal.
 *
 * A POST rather than a link because the portal session is minted per click and
 * expires; a stored URL would 404 by the time anyone clicked it.
 */
export function ManageBillingButton({ locale }: { locale: SiteLocale }) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function open() {
    setPending(true)
    setFailed(false)

    try {
      const response = await fetch("/api/billing/portal", { method: "POST" })
      const data: unknown = await response.json()
      const url =
        data && typeof data === "object" && "url" in data ? data.url : null

      if (!response.ok || typeof url !== "string") {
        setFailed(true)
        setPending(false)
        return
      }

      // Leave `pending` set: the navigation is what ends this component's life,
      // and re-enabling the button first invites a second click that mints a
      // second session.
      window.location.href = url
    } catch {
      setFailed(true)
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={open}
        className="border-white/10 bg-white/[0.04] text-white hover:border-white/16 hover:bg-white/[0.07]"
      >
        {pending ? COPY.managing[locale] : COPY.manage[locale]}
        {pending ? null : <ExternalLink className="size-3.5" />}
      </Button>
      {failed ? (
        <span role="alert" className="text-xs text-ec-error">
          {COPY.manageError[locale]}
        </span>
      ) : null}
    </div>
  )
}
