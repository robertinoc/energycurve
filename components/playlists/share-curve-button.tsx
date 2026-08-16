"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"

const COPY = DASHBOARD_COPY.share

/**
 * Copies the public link for this set's curve.
 *
 * The URL is built on the server (the signature needs the secret) and handed
 * down as a prop, so this component holds nothing but a clipboard call and two
 * seconds of feedback.
 */
export function ShareCurveButton({
  url,
  locale,
}: {
  url: string
  locale: SiteLocale
}) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={COPY.hint[locale]}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // Clipboard access can be refused (permissions, insecure context).
          // Nothing to recover — the button simply doesn't confirm.
        }
      }}
      className="text-white/58 hover:text-white"
    >
      <Share2 className="size-4" />
      {copied ? COPY.copied[locale] : COPY.button[locale]}
    </Button>
  )
}
