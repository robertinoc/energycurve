import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ComparisonPage } from "@/components/content/comparison-page"
import { buildComparisonStructuredData } from "@/lib/content/structured-data"
import { comparisonMetadata } from "@/lib/content/entry-metadata"
import {
  COMPARISONS,
  comparisonBySlug,
} from "@/lib/content/compare/comparisons"
import { serializeStructuredData } from "@/lib/seo"

const LOCALE = "es" as const

export function generateStaticParams() {
  return COMPARISONS.map((comparison) => ({ slug: comparison.slug[LOCALE] }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const comparison = comparisonBySlug(slug, LOCALE)

  return comparison ? comparisonMetadata(comparison, LOCALE) : {}
}

export default async function ComparisonRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const comparison = comparisonBySlug(slug, LOCALE)

  if (!comparison) {
    notFound()
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildComparisonStructuredData(comparison, LOCALE)
          ),
        }}
      />
      <ComparisonPage comparison={comparison} locale={LOCALE} />
    </>
  )
}
