import type { Metadata } from "next"

import { EnergyTagsPage } from "@/components/marketing/energy-tags-page"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "en" as const

export const metadata: Metadata = marketingMetadata("/energy-tags", LOCALE)

export default function EnergyTagsRoute() {
  return <EnergyTagsPage locale={LOCALE} />
}
