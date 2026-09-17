import type { Metadata } from "next"

import { EnergyCurveToolPage } from "@/components/tools/energy-curve-tool-page"
import { buildEnergyCurveToolStructuredData } from "@/lib/tools/structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const

export const metadata: Metadata = marketingMetadata("/tools/energy-curve", LOCALE)

export default function EnergyCurveToolRouteEs() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildEnergyCurveToolStructuredData(LOCALE)
          ),
        }}
      />
      <EnergyCurveToolPage locale={LOCALE} />
    </>
  )
}
