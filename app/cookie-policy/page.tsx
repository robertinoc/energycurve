import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How EnergyCurve uses cookies and similar storage.",
  alternates: { canonical: "/cookie-policy" },
}

export default function CookiePolicyPage() {
  return <LegalPage doc="cookies" />
}
