import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of EnergyCurve.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return <LegalPage doc="terms" />
}
