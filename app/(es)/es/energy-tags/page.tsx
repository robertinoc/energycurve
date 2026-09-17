import type { Metadata } from "next"

import { EnergyTagsPage } from "@/components/marketing/energy-tags-page"
import { marketingMetadata } from "@/lib/seo"

const LOCALE = "es" as const

export const metadata: Metadata = marketingMetadata("/energy-tags", LOCALE)

export default function EnergyTagsRouteEs() {
  return <EnergyTagsPage locale={LOCALE} />
}
