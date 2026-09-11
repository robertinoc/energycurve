import type { Metadata } from "next"

import { LandingPage } from "@/components/marketing/landing-page"
import { buildLandingStructuredData, marketingMetadata, serializeStructuredData } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/", LOCALE)

export default function HomePage() {
  // The locale is fixed by the route, so the structured data, the metadata above
  // and the rendered copy are guaranteed to be the same language — the JSON-LD
  // used to default to English on a page that rendered in Spanish.
  const structuredData = buildLandingStructuredData({ locale: LOCALE })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }}
      />
      <LandingPage locale={LOCALE} />
    </>
  )
}
