import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/cookie-policy", LOCALE)

export default function CookiePolicyPage() {
  return <LegalPage doc="cookies" locale={LOCALE} />
}
