import type { Metadata } from "next"

import { GlossaryIndexPage } from "@/components/content/glossary-pages"
import { buildGlossaryIndexStructuredData } from "@/lib/content/structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "en" as const
const PATH = "/glossary" as const

export const metadata: Metadata = marketingMetadata(PATH, LOCALE)

export default function GlossaryIndexRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildGlossaryIndexStructuredData(LOCALE)
          ),
        }}
      />
      <GlossaryIndexPage locale={LOCALE} />
    </>
  )
}
