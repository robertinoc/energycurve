import type { Metadata } from "next"

import { ImportFormatsPage } from "@/components/marketing/import-formats-page"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "es" as const

export const metadata: Metadata = marketingMetadata("/import-formats", LOCALE)

export default function ImportFormatsRouteEs() {
  return <ImportFormatsPage locale={LOCALE} />
}
