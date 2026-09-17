import type { Metadata } from "next"

import { InstallGuide } from "@/components/marketing/install-guide"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/install", LOCALE)

export default function InstallPage() {
  return <InstallGuide locale={LOCALE} />
}
