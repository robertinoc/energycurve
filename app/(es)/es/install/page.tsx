import type { Metadata } from "next"

import { InstallGuide } from "@/components/marketing/install-guide"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "es" as const

export const metadata: Metadata = marketingMetadata("/install", LOCALE)

export default function InstallPageEs() {
  return <InstallGuide locale={LOCALE} />
}
