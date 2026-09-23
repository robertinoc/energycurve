/**
 * schema.org for the glossary and the guides.
 *
 * Built the way `lib/seo.ts` and `lib/tools/structured-data.ts` build theirs:
 * from the same objects the page renders, never hand-written beside them. The
 * `FAQPage` here is generated from the guide's own FAQ nodes, so the markup
 * cannot claim an answer the page does not show — the rule `AGENTS.md` sets for
 * the landing page's FAQ, applied to the one new place that has questions.
 */

import {
  glossaryIndexPath,
  glossaryTermPath,
  guideIndexPath,
  guidePath,
} from "@/lib/content/glossary/paths"
import { GLOSSARY_COPY, GUIDES_COPY } from "@/lib/content/content-copy"
import { GLOSSARY_TERMS, type GlossaryTerm } from "@/lib/content/glossary/terms"
import { localizedPath } from "@/lib/content/locale-routing"
import { SITE_URL, SOCIAL_IMAGE_URL, buildFaqPage, buildOrganization } from "@/lib/seo"
import type { Guide } from "@/lib/content/guides/guides"
import type { SiteLocale } from "@/lib/content/site-copy"

function crumb(position: number, name: string, url: string) {
  return { "@type": "ListItem", position, name, item: url }
}

function homeCrumb(locale: SiteLocale) {
  return crumb(
    1,
    GLOSSARY_COPY.home[locale],
    `${SITE_URL}${localizedPath("/", locale)}`
  )
}

/** The set every entry belongs to, referenced by `@id` from each one. */
function definedTermSetId(locale: SiteLocale) {
  return `${SITE_URL}${glossaryIndexPath(locale)}#termset`
}

export function buildGlossaryIndexStructuredData(locale: SiteLocale) {
  const url = `${SITE_URL}${glossaryIndexPath(locale)}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DefinedTermSet",
        "@id": definedTermSetId(locale),
        name: GLOSSARY_COPY.h1[locale],
        url,
        inLanguage: locale,
        publisher: buildOrganization(locale),
        hasDefinedTerm: GLOSSARY_TERMS.map((term) => ({
          "@type": "DefinedTerm",
          "@id": `${SITE_URL}${glossaryTermPath(term, locale)}#term`,
          name: term.title[locale],
          description: term.short[locale],
          url: `${SITE_URL}${glossaryTermPath(term, locale)}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          homeCrumb(locale),
          crumb(2, GLOSSARY_COPY.h1[locale], url),
        ],
      },
    ],
  }
}

export function buildGlossaryTermStructuredData(
  term: GlossaryTerm,
  locale: SiteLocale
) {
  const url = `${SITE_URL}${glossaryTermPath(term, locale)}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DefinedTerm",
        "@id": `${url}#term`,
        name: term.title[locale],
        // The short definition, which is also what the page shows first and
        // what the tooltip shows elsewhere. One sentence, one source.
        description: term.short[locale],
        url,
        inLanguage: locale,
        inDefinedTermSet: {
          "@type": "DefinedTermSet",
          "@id": definedTermSetId(locale),
          name: GLOSSARY_COPY.h1[locale],
          url: `${SITE_URL}${glossaryIndexPath(locale)}`,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          homeCrumb(locale),
          crumb(
            2,
            GLOSSARY_COPY.h1[locale],
            `${SITE_URL}${glossaryIndexPath(locale)}`
          ),
          crumb(3, term.title[locale], url),
        ],
      },
    ],
  }
}

export function buildGuideIndexStructuredData(
  guides: Guide[],
  locale: SiteLocale
) {
  const url = `${SITE_URL}${guideIndexPath(locale)}`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        name: GUIDES_COPY.h1[locale],
        url,
        inLanguage: locale,
        publisher: buildOrganization(locale),
        hasPart: guides.map((guide) => ({
          "@type": "TechArticle",
          "@id": `${SITE_URL}${guidePath(guide, locale)}#article`,
          headline: guide.title[locale],
          url: `${SITE_URL}${guidePath(guide, locale)}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          homeCrumb(locale),
          crumb(2, GUIDES_COPY.h1[locale], url),
        ],
      },
    ],
  }
}

export function buildGuideStructuredData(guide: Guide, locale: SiteLocale) {
  const url = `${SITE_URL}${guidePath(guide, locale)}`

  // Straight off the page's own nodes. A question that is not rendered cannot
  // reach the markup, which is the entire safety property.
  const faqEntries = guide.sections
    .flatMap((section) => section.nodes)
    .filter((node) => node.kind === "faq")
    .flatMap((node) => node.entries)

  const graph: Record<string, unknown>[] = [
    {
      "@type": "TechArticle",
      "@id": `${url}#article`,
      headline: guide.title[locale],
      description: guide.description[locale],
      url,
      inLanguage: locale,
      dateModified: guide.updatedAt,
      author: { "@type": "Person", name: "ROBERTINOC" },
      publisher: buildOrganization(locale),
      image: SOCIAL_IMAGE_URL,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        homeCrumb(locale),
        crumb(
          2,
          GUIDES_COPY.h1[locale],
          `${SITE_URL}${guideIndexPath(locale)}`
        ),
        crumb(3, guide.title[locale], url),
      ],
    },
  ]

  if (faqEntries.length > 0) {
    graph.push({
      ...buildFaqPage({
        id: url,
        entries: faqEntries.map((entry) => ({
          question: entry.question[locale],
          answer: entry.answer[locale],
        })),
      }),
    })
  }

  return { "@context": "https://schema.org", "@graph": graph }
}
