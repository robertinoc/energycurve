import type { Metadata } from "next"

import { HarmonicCheatSheetPage } from "@/components/marketing/harmonic-cheat-sheet-page"
import { buildReferenceStructuredData } from "@/lib/content/reference-structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const
const PATH = "/harmonic-mixing-cheat-sheet" as const

export const metadata: Metadata = marketingMetadata(PATH, LOCALE)

export default function HarmonicCheatSheetRouteEs() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildReferenceStructuredData(PATH, LOCALE)
          ),
        }}
      />
      <HarmonicCheatSheetPage locale={LOCALE} />
    </>
  )
}
