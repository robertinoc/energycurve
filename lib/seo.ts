import { getSiteCopy } from "@/lib/content/site-copy"

/**
 * Single source of truth for the canonical origin and the structured data we
 * publish. Kept out of the page files so the landing, robots, and sitemap can't
 * drift from each other.
 */
export const SITE_URL = "https://energycurve.app"

/** The legal entity that operates EnergyCurve — the name that shows up on a
 *  customer's card statement, so it belongs in our public metadata too. */
export const OPERATING_COMPANY = {
  name: "StageLink LLC",
  url: "https://stagelink.art",
} as const

export const SEO_KEYWORDS = [
  "DJ set analysis",
  // "energy flow" and "energy arc" are what DJs actually type — the Aug-2026
  // baseline found both outrank "energy curve" in real usage, so they belong
  // here even though the brand uses the third synonym.
  "energy curve",
  "DJ set energy flow",
  "energy arc",
  "DJ setlist planner",
  "set prep",
  "harmonic mixing",
  "Camelot wheel",
  "Traktor NML",
  "Rekordbox XML",
  "track order",
  "BPM and key analysis",
  "DJ set preparation",
  "set energy score",
]

/**
 * The published price points. Paid tiers are PreOrder until Stripe is live —
 * flip to InStock in the same change that ships checkout, not before.
 */
const PLAN_OFFERS = [
  {
    "@type": "Offer",
    name: "Free",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  {
    "@type": "Offer",
    name: "PRO",
    price: "9.99",
    priceCurrency: "USD",
    availability: "https://schema.org/PreOrder",
  },
  {
    "@type": "Offer",
    name: "PRO+",
    price: "19.99",
    priceCurrency: "USD",
    availability: "https://schema.org/PreOrder",
  },
] as const

interface StructuredDataOptions {
  /** Locale the page is rendered in — the FAQ entities follow it. */
  locale?: "en" | "es"
}

/**
 * schema.org graph for the landing page. Three entities answer engines and
 * rich results actually consume:
 *
 * - Organization  → who we are, and that StageLink LLC is the parent.
 * - SoftwareApplication → what the product is, plus the price points.
 * - FAQPage → the Q&A block, generated from the same copy the page renders so
 *   the markup can never contradict the visible text.
 */
export function buildLandingStructuredData({
  locale = "en",
}: StructuredDataOptions = {}) {
  const copy = getSiteCopy(locale)

  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "EnergyCurve",
    url: SITE_URL,
    logo: `${SITE_URL}/brand-kit/logo-horizontal.png`,
    email: "hello@energycurve.app",
    description: copy.footer.description,
    parentOrganization: {
      "@type": "Organization",
      name: OPERATING_COMPANY.name,
      url: OPERATING_COMPANY.url,
    },
  }

  const application = {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: "EnergyCurve",
    applicationCategory: "MultimediaApplication",
    applicationSubCategory: "DJ set analysis",
    operatingSystem: "Web browser",
    url: SITE_URL,
    description: copy.hero.subtitle,
    publisher: { "@id": `${SITE_URL}/#organization` },
    audience: {
      "@type": "Audience",
      audienceType: "DJs, producers, and performers",
    },
    featureList: copy.features.cards.map((card) => card.title),
    // Free today; the paid tiers are published so price questions get a
    // machine-readable answer instead of a guess.
    offers: PLAN_OFFERS,
  }

  const faq = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: copy.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  return {
    "@context": "https://schema.org",
    "@graph": [organization, application, faq],
  }
}

/**
 * Structured data for /pricing. Publishing the price points in markup is what
 * lets an answer engine reply "US$9.99" to "how much does EnergyCurve cost"
 * instead of guessing or skipping the question.
 */
export function buildPricingStructuredData({
  locale = "en",
}: StructuredDataOptions = {}) {
  const copy = getSiteCopy(locale)

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${SITE_URL}/pricing#product`,
        name: "EnergyCurve",
        description: copy.pricing.subtitle,
        url: `${SITE_URL}/pricing`,
        brand: {
          "@type": "Brand",
          name: "EnergyCurve",
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "0",
          highPrice: "19.99",
          offerCount: PLAN_OFFERS.length,
          offers: PLAN_OFFERS,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/pricing#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "EnergyCurve",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: copy.pricing.navLabel,
            item: `${SITE_URL}/pricing`,
          },
        ],
      },
    ],
  }
}
