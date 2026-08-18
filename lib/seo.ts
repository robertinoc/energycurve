import type { Metadata } from "next"

import {
  LOCALIZED_PATHS,
  localizedPath,
  PREFIXED_LOCALE,
  type LocalizedPath,
} from "@/lib/content/locale-routing"
import { pageMetadata } from "@/lib/content/page-metadata"
import { getSiteCopy, type SiteLocale } from "@/lib/content/site-copy"

/**
 * Single source of truth for the canonical origin and the structured data we
 * publish. Kept out of the page files so the landing, robots, and sitemap can't
 * drift from each other.
 */
export const SITE_URL = "https://energycurve.app"

/**
 * Open Graph locale codes.
 *
 * `es_LA` rather than `es_ES`: the Spanish copy is Rioplatense — voseo
 * throughout ("Creá tu cuenta", "Analizá tu set") — and labelling it as
 * peninsular Spanish would be wrong about the text we actually ship. Note this
 * is only Open Graph's dialect hint; `hreflang` below stays the bare `es` so the
 * page is offered to every Spanish speaker rather than one region.
 */
const OG_LOCALES: Record<SiteLocale, string> = {
  en: "en_US",
  es: "es_LA",
}

export function openGraphLocale(locale: SiteLocale): string {
  return OG_LOCALES[locale]
}

/**
 * The `alternates` block for one page in one language: a self-referencing
 * canonical plus the `hreflang` set.
 *
 * **The canonical is per-locale on purpose.** Pointing `/es/pricing` at
 * `/pricing` would tell Google the Spanish page is a duplicate that shouldn't be
 * indexed — which is exactly the outcome this whole change exists to undo. Each
 * language canonicalises to itself and the two are related through `languages`
 * instead.
 *
 * `x-default` points at English: it's what a crawler should serve when it can't
 * match a user's language to either version.
 */
export function buildAlternates(path: string, locale: SiteLocale) {
  return {
    canonical: localizedPath(path, locale),
    languages: {
      en: localizedPath(path, "en"),
      [PREFIXED_LOCALE]: localizedPath(path, PREFIXED_LOCALE),
      "x-default": localizedPath(path, "en"),
    },
  }
}

/** Absolute URLs for every language of every localized page — for the sitemap. */
export function localizedSitemapEntries(): {
  path: string
  urls: Record<SiteLocale, string>
}[] {
  return LOCALIZED_PATHS.map((path) => ({
    path,
    urls: {
      en: `${SITE_URL}${localizedPath(path, "en")}`,
      es: `${SITE_URL}${localizedPath(path, "es")}`,
    },
  }))
}

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
 * The published price points.
 *
 * All three are InStock as of the change that shipped checkout: `/pricing` now
 * opens a real Stripe Checkout session for PRO and PRO+, so telling search
 * engines they can't be bought yet would be the inaccurate half of the pair.
 * Availability and the buttons move together — a mismatch either way is a lie
 * about whether money changes hands.
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
    availability: "https://schema.org/InStock",
  },
  {
    "@type": "Offer",
    name: "PRO+",
    price: "19.99",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
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

/**
 * The full metadata block for one marketing page in one language.
 *
 * Every localized page needs the same five things — title, description, a
 * self-referencing canonical, the `hreflang` set, and Open Graph/Twitter cards in
 * the right language — and getting one of them wrong is invisible until it shows
 * up in a search result. Building them from one function means `/pricing` and
 * `/es/pricing` cannot drift apart in anything but their copy.
 */
export function marketingMetadata(
  path: LocalizedPath,
  locale: SiteLocale
): Metadata {
  const { title, description } = pageMetadata(path, locale)
  const isLanding = path === "/"
  // The landing page's title is already the full brand string; the rest are
  // fragments that the root layout's template wraps into "… | EnergyCurve".
  const socialTitle = isLanding ? title : `EnergyCurve — ${title}`

  return {
    /**
     * `absolute` on the landing page, so the root layout's "%s | EnergyCurve"
     * template doesn't append the brand to a title that already opens with it.
     *
     * English got away without this by accident: its landing title is byte-identical
     * to the layout's `title.default`, and Next resolves that case to the untemplated
     * default. The Spanish title isn't identical, so the same code produced
     * "EnergyCurve — Análisis … | EnergyCurve". Stating it outright is better than
     * depending on two strings staying equal.
     */
    title: isLanding ? { absolute: title } : title,
    description,
    alternates: buildAlternates(path, locale),
    openGraph: {
      title: socialTitle,
      description,
      url: `${SITE_URL}${localizedPath(path, locale)}`,
      siteName: "EnergyCurve",
      type: "website",
      locale: openGraphLocale(locale),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  }
}
