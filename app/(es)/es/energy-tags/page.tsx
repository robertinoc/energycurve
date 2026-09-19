import type { Metadata } from "next"

import { EnergyTagsPage } from "@/components/marketing/energy-tags-page"
import { buildReferenceStructuredData } from "@/lib/content/reference-structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const
const PATH = "/energy-tags" as const

export const metadata: Metadata = marketingMetadata(PATH, LOCALE)

export default function EnergyTagsRouteEs() {
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
      <EnergyTagsPage locale={LOCALE} />
    </>
  )
}
