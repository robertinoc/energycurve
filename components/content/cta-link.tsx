"use client"

import Link from "next/link"

import { CTAButton } from "@/components/marketing/cta-button"
import { captureContentCtaClick } from "@/lib/analytics/content-events"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The clickable half of a content CTA — SEO-E28.
 *
 * Split out of `<CTA>` rather than making that block a client component. The
 * block's heading and body are the words a crawler and an answer engine read,
 * and the note at the top of `blocks.tsx` says they are server-rendered on
 * purpose. An `onClick` anywhere in the tree would have moved all of it to the
 * client to instrument one link.
 *
 * So the text stays on the server and only the anchor knows about analytics.
 */
export function ContentCtaLink({
  variant,
  locale,
  page,
  label,
}: {
  variant: "tool" | "signup"
  locale: SiteLocale
  /** The path this CTA sits on, for the funnel's first step. */
  page: string
  label: string
}) {
  const onClick = () => captureContentCtaClick({ page, locale, variant })

  if (variant === "signup") {
    return (
      <CTAButton href="/signup" onClick={onClick}>
        {label}
      </CTAButton>
    )
  }

  return (
    <Link
      href={localizedPath("/tools/energy-curve", locale)}
      onClick={onClick}
      className="text-sm text-ec-cyan underline-offset-4 hover:underline"
    >
      {label} →
    </Link>
  )
}
