import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/terms", LOCALE)

export default function TermsPage() {
  return <LegalPage doc="terms" locale={LOCALE} />
}
