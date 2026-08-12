import type { Metadata } from "next"

import { LandingPage } from "@/components/marketing/landing-page"
import { buildLandingStructuredData, SITE_URL } from "@/lib/seo"

const TITLE = "EnergyCurve — DJ Set Energy Analysis & Track Order"
const DESCRIPTION =
  "Analyze your DJ set's energy curve, score it 1–10, and get the exact track moves that fix it. Imports Rekordbox, Traktor, M3U8, and your own audio files — exports the corrected order back."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/`,
    siteName: "EnergyCurve",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function HomePage() {
  const structuredData = buildLandingStructuredData()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  )
}
