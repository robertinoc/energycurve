import type { Metadata } from "next"

import { InstallGuide } from "@/components/marketing/install-guide"
import { buildInstallStructuredData } from "@/lib/content/install-structured-data"
import { marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/install", LOCALE)

export default function InstallPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(buildInstallStructuredData(LOCALE)),
        }}
      />
      <InstallGuide locale={LOCALE} />
    </>
  )
}
