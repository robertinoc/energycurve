import type { Metadata } from "next"

import { LandingPage } from "@/components/marketing/landing-page"

export const metadata: Metadata = {
  title: "EnergyCurve | DJ Set Energy Analysis & Performance Intelligence",
  description:
    "EnergyCurve helps DJs analyze set energy, transition quality, and performance flow to design better mixes and more intentional dancefloor momentum.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "EnergyCurve | DJ Set Energy Analysis & Performance Intelligence",
    description:
      "Analyze DJ set energy, transition quality, and performance flow to design better mixes and shape momentum with more intention.",
    url: "https://energycurve.vercel.app/",
    siteName: "EnergyCurve",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EnergyCurve | DJ Set Energy Analysis & Performance Intelligence",
    description:
      "Analyze DJ set energy, track transitions, and performance flow to build better performances.",
  },
}

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EnergyCurve",
    applicationCategory: "MusicApplication",
    operatingSystem: "Web",
    description:
      "EnergyCurve helps DJs analyze set energy, transition quality, and performance flow to design better mixes and more intentional dancefloor momentum.",
    url: "https://energycurve.vercel.app/",
    audience: {
      "@type": "Audience",
      audienceType: "DJs, producers, and performers",
    },
  }

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
