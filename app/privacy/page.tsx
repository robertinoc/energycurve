import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How EnergyCurve collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />
}
