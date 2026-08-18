import type { Metadata } from "next"

import { PricingPage } from "@/components/marketing/pricing-page"
import { buildPricingStructuredData, marketingMetadata } from "@/lib/seo"

const LOCALE = "es" as const

export const metadata: Metadata = marketingMetadata("/pricing", LOCALE)

export default function PricingEs() {
  const structuredData = buildPricingStructuredData({ locale: LOCALE })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PricingPage locale={LOCALE} />
    </>
  )
}
