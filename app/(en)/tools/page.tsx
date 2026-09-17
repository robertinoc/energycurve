import type { Metadata } from "next"

import { ToolsHubPage } from "@/components/tools/tools-hub-page"
import { buildToolsHubStructuredData } from "@/lib/tools/structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/tools", LOCALE)

export default function ToolsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(buildToolsHubStructuredData(LOCALE)),
        }}
      />
      <ToolsHubPage locale={LOCALE} />
    </>
  )
}
