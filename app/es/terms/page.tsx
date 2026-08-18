import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "es" as const

export const metadata: Metadata = marketingMetadata("/terms", LOCALE)

export default function TermsPageEs() {
  return <LegalPage doc="terms" locale={LOCALE} />
}
