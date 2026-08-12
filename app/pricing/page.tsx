import type { Metadata } from "next"

import { PricingPage } from "@/components/marketing/pricing-page"
import { buildPricingStructuredData } from "@/lib/seo"

const TITLE = "Pricing — Free, PRO US$9.99, PRO+ US$19.99"
const DESCRIPTION =
  "EnergyCurve is free to use, with a free tier that stays free. PRO is US$9.99/month and PRO+ is US$19.99/month (US$99 / US$199 a year). Paid plans are in development."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `EnergyCurve ${TITLE}`,
    description: DESCRIPTION,
    url: "https://energycurve.app/pricing",
    siteName: "EnergyCurve",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `EnergyCurve ${TITLE}`,
    description: DESCRIPTION,
  },
}

export default function Pricing() {
  const structuredData = buildPricingStructuredData()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PricingPage />
    </>
  )
}
