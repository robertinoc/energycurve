"use client"

import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.billing.checkoutSuccess

/**
 * Confirms a completed purchase.
 *
 * `/api/billing/checkout` has always redirected back with `?checkout=success`,
 * and nothing read it — so the app's response to being paid was to look exactly
 * as it did before. That reads as a failed payment.
 *
 * The flag arrives as a prop rather than from `useSearchParams` so the server
 * page stays the only thing parsing the query, and this component needs no
 * Suspense boundary.
 */
export function CheckoutConfirmation({
  planLabel,
  locale,
}: {
  planLabel: string
  locale: SiteLocale
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Drop the query param without a navigation, so a refresh or a shared URL
    // doesn't replay a confirmation for a purchase made days ago.
    window.history.replaceState(null, "", window.location.pathname)
  }, [])

  if (!visible) {
    return null
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-[28px] border border-ec-cyan/24 bg-ec-cyan/[0.07] p-5"
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-ec-cyan/16 text-ec-cyan">
        <Check className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-heading text-base font-semibold text-white">
          {formatTemplate(COPY.title[locale], { plan: planLabel })}
        </p>
        <p className="text-sm leading-6 text-white/62">{COPY.body[locale]}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={COPY.dismiss[locale]}
        className="shrink-0 text-white/48 hover:text-white"
        onClick={() => setVisible(false)}
      >
        <X />
      </Button>
    </div>
  )
}
