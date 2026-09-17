import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "es" as const

export const metadata: Metadata = marketingMetadata("/privacy", LOCALE)

export default function PrivacyPageEs() {
  return <LegalPage doc="privacy" locale={LOCALE} />
}
