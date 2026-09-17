import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "es" as const

export const metadata: Metadata = marketingMetadata("/cookie-policy", LOCALE)

export default function CookiePolicyPageEs() {
  return <LegalPage doc="cookies" locale={LOCALE} />
}
