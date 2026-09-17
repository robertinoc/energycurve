import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/subprocessors", LOCALE)

export default function SubprocessorsPage() {
  return <LegalPage doc="subprocessors" locale={LOCALE} />
}
