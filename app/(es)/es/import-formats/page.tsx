import type { Metadata } from "next"

import { ImportFormatsPage } from "@/components/marketing/import-formats-page"
import { buildReferenceStructuredData } from "@/lib/content/reference-structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const
const PATH = "/import-formats" as const

export const metadata: Metadata = marketingMetadata(PATH, LOCALE)

export default function ImportFormatsRouteEs() {
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
      <ImportFormatsPage locale={LOCALE} />
    </>
  )
}
