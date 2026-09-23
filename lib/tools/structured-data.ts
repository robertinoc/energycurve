import { CHECKER_COPY, WHEEL_COPY } from "@/lib/content/harmonic-tools-copy"
import { TOOL_COPY, TOOLS_HUB_COPY } from "@/lib/content/tools-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import { pageMetadata } from "@/lib/content/page-metadata"
import type { SiteLocale } from "@/lib/content/site-copy"
import { SITE_URL, buildFaqPage, buildOrganization } from "@/lib/seo"

/**
 * Structured data for the free tools.
 *
 * `WebApplication` is the entity that matters here and it is not the same claim
 * as the landing page's `SoftwareApplication`: that one describes the product
 * you sign up for, this one describes a thing that runs on this page for
 * nothing. Both are true, and conflating them would tell an answer engine that
 * the free tool costs US$9.99.
 *
 * The FAQ is generated from the same copy the page renders, so the markup cannot
 * drift from the visible text — the rule the landing page's FAQ already follows.
 */

const HOME_CRUMB: Record<SiteLocale, string> = { en: "Home", es: "Inicio" }

function crumb(
  position: number,
  name: string,
  path: string,
  locale: SiteLocale
) {
  return {
    "@type": "ListItem",
    position,
    name,
    item: `${SITE_URL}${localizedPath(path, locale)}`,
  }
}

export function buildToolsHubStructuredData(locale: SiteLocale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}${localizedPath("/tools", locale)}#breadcrumb`,
        itemListElement: [
          crumb(1, HOME_CRUMB[locale], "/", locale),
          crumb(2, TOOLS_HUB_COPY.h1[locale], "/tools", locale),
        ],
      },
    ],
  }
}

export function buildEnergyCurveToolStructuredData(locale: SiteLocale) {
  const url = `${SITE_URL}${localizedPath("/tools/energy-curve", locale)}`
  const { description } = pageMetadata("/tools/energy-curve", locale)

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: TOOL_COPY.h1[locale],
        url,
        description,
        applicationCategory: "MultimediaApplication",
        applicationSubCategory: "DJ set analysis",
        operatingSystem: "Web browser",
        browserRequirements: "Requires JavaScript",
        inLanguage: locale,
        publisher: buildOrganization(locale),
        // Free, and stated as a price rather than as an adjective: "0" is what a
        // machine can answer "how much does it cost" with.
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        featureList: [
          TOOL_COPY.ui.curveTitle[locale],
          TOOL_COPY.ui.scoreLabel[locale],
          TOOL_COPY.ui.energyJumps[locale],
          TOOL_COPY.ui.harmonicClashes[locale],
          TOOL_COPY.ui.misplacedPeaks[locale],
        ],
      },
      {
        ...buildFaqPage({
          id: url,
          inLanguage: locale,
          entries: TOOL_COPY.faq.map((entry) => ({
            question: entry.question[locale],
            answer: entry.answer[locale],
          })),
        }),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          crumb(1, HOME_CRUMB[locale], "/", locale),
          crumb(2, TOOLS_HUB_COPY.h1[locale], "/tools", locale),
          crumb(3, TOOLS_HUB_COPY.toolName[locale], "/tools/energy-curve", locale),
        ],
      },
    ],
  }
}

/**
 * The two harmonic tools' graph, built from the same three entities as the
 * energy tool's: what the page is, what it answers, and where it sits.
 *
 * Shared rather than copied twice because the only differences are the strings —
 * and a second copy is how one of them ends up claiming a price.
 */
export function buildHarmonicToolStructuredData(
  path: "/tools/camelot-wheel" | "/tools/key-bpm-compatibility",
  locale: SiteLocale
) {
  const url = `${SITE_URL}${localizedPath(path, locale)}`
  const { description } = pageMetadata(path, locale)
  const copy = path === "/tools/camelot-wheel" ? WHEEL_COPY : CHECKER_COPY
  const featureList =
    path === "/tools/camelot-wheel"
      ? [
          WHEEL_COPY.ui.compatibleWith[locale],
          WHEEL_COPY.ui.tableTitle[locale],
        ]
      : [
          CHECKER_COPY.ui.harmonyTitle[locale],
          CHECKER_COPY.ui.tempoTitle[locale],
          CHECKER_COPY.ui.pitchTitle[locale],
        ]

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: copy.h1[locale],
        url,
        description,
        applicationCategory: "MultimediaApplication",
        applicationSubCategory: "Harmonic mixing",
        operatingSystem: "Web browser",
        browserRequirements: "Requires JavaScript",
        inLanguage: locale,
        publisher: buildOrganization(locale),
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        featureList,
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: locale,
        mainEntity: copy.faq.map((entry) => ({
          "@type": "Question",
          name: entry.question[locale],
          acceptedAnswer: { "@type": "Answer", text: entry.answer[locale] },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          crumb(1, HOME_CRUMB[locale], "/", locale),
          crumb(2, TOOLS_HUB_COPY.h1[locale], "/tools", locale),
          crumb(3, copy.h1[locale], path, locale),
        ],
      },
    ],
  }
}
