import type { Metadata } from "next"

import { KeyBpmPage } from "@/components/tools/harmonic-tool-page"
import { buildHarmonicToolStructuredData } from "@/lib/tools/structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const
const PATH = "/tools/key-bpm-compatibility" as const

export const metadata: Metadata = marketingMetadata(PATH, LOCALE)

export default function KeyBpmRouteEs() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildHarmonicToolStructuredData(PATH, LOCALE)
          ),
        }}
      />
      <KeyBpmPage locale={LOCALE} />
    </>
  )
}
