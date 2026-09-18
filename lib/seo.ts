import type { Metadata } from "next"

import {
  indexableLocales,
  isIndexable,
  localizedPath,
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

/** The other language's Open Graph locale — `og:locale:alternate`. */
function alternateOpenGraphLocale(locale: SiteLocale): string {
  return OG_LOCALES[locale === "en" ? "es" : "en"]
}

/**
 * The social card, stated explicitly rather than inherited.
 *
 * `app/opengraph-image/route.tsx` is a file-based convention, and Next only merged it
 * into the metadata of the page sitting in the same segment — the English
 * landing page. Every other page, `/pricing` and the whole `/es` subtree
 * included, declares an `openGraph` object of its own, and that object won an
 * image it never set: it shipped with none. So `/es` carried six `og:` tags
 * where `/` carried eleven, and a shared Spanish link previewed as a bare title.
 *
 * Naming it here puts the same card on every localized page. The dimensions are
 * the ones `app/opengraph-image/route.tsx` declares; a scraper that has to fetch the
 * PNG to learn its size often just skips the image.
 *
 * The `alt` follows the page's language. The drawing doesn't — the card is one
 * PNG with English words in it, and splitting it in two is a separate change
 * with a design decision in it. But `og:image:alt` is text we emit, it is what a
 * screen reader announces on a shared link and what an image search reads, and
 * shipping an English sentence on a Spanish page would have been a new instance
 * of exactly the bug this branch exists to fix.
 */
const SOCIAL_IMAGE_ALT: Record<SiteLocale, string> = {
  en: "EnergyCurve — analyze your DJ set's energy curve and fix the order before you play",
  es: "EnergyCurve — analizá la curva de energía de tu set y corregí el orden antes de tocar",
}

/**
 * Pages that draw their own card instead of the site's.
 *
 * The free tool is the one, and the reason is the promise: a link to a page that
 * says "no sign-up" previewing as a pitch for the thing you sign up for is a
 * mismatch a reader notices before they click.
 */
const CARD_OVERRIDES: Partial<
  Record<LocalizedPath, { path: string; alt: Record<SiteLocale, string> }>
> = {
  "/tools/energy-curve": {
    path: "/opengraph-image/energy-curve",
    alt: {
      en: "EnergyCurve — see your DJ set's energy curve free, with no sign-up",
      es: "EnergyCurve — mirá la curva de energía de tu set gratis y sin cuenta",
    },
  },
  "/tools/camelot-wheel": {
    path: "/opengraph-image/camelot-wheel",
    alt: {
      en: "EnergyCurve — an interactive Camelot wheel showing which keys mix",
      es: "EnergyCurve — una rueda Camelot interactiva que muestra qué tonalidades mezclan",
    },
  },
  "/tools/key-bpm-compatibility": {
    path: "/opengraph-image/key-bpm",
    alt: {
      en: "EnergyCurve — check whether two tracks mix, by key and by BPM",
      es: "EnergyCurve — chequeá si dos temas mezclan, por tonalidad y por BPM",
    },
  },
}

function socialImage(locale: SiteLocale, path?: LocalizedPath) {
  const override = path ? CARD_OVERRIDES[path] : undefined

  return {
    url: `${SITE_URL}${override?.path ?? "/opengraph-image"}`,
    width: 1200,
    height: 630,
    type: "image/png",
    alt: override?.alt[locale] ?? SOCIAL_IMAGE_ALT[locale],
  }
}

/**
 * The defaults every page inherits from its root layout: the title template, the
 * fallback description, and the site-wide directives.
 *
 * Takes a locale because the app has two root layouts, one per language — see
 * components/layout/site-html.tsx. The title and description here are only
 * fallbacks (every marketing page sets its own through `marketingMetadata`), but
 * a fallback in the wrong language is still the wrong language.
 */
export function buildRootMetadata(locale: SiteLocale): Metadata {
  const { title, description } = pageMetadata("/", locale)

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: "%s | EnergyCurve",
    },
    description,
    keywords: SEO_KEYWORDS,
    applicationName: "EnergyCurve",
    category: "music",
    // The company on the receipt, stated in the metadata too.
    publisher: OPERATING_COMPANY.name,
    creator: OPERATING_COMPANY.name,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    // Set GOOGLE_SITE_VERIFICATION in the environment to claim the domain in
    // Search Console; the tag is omitted entirely when the variable is unset.
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
    icons: {
      icon: [
        {
          url: "/brand-kit/app-icon.png",
          type: "image/png",
        },
      ],
      shortcut: ["/brand-kit/app-icon.png"],
      apple: ["/apple-touch-icon.png"],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "EnergyCurve",
    },
  }
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
 * Only indexable languages are listed, which today means `/es/blog` no longer
 * offers an English alternate: `/blog` is `noindex`, and naming a page you have
 * asked a crawler to ignore as the English version of this one is a claim and a
 * retraction in the same head.
 *
 * `x-default` is what a crawler serves when it can't match a visitor's language
 * to any version. It points at English where English is indexable, and at the
 * only surviving language where it isn't — for the blog index that is Spanish,
 * which is also the only place the articles exist.
 */
export function buildAlternates(path: LocalizedPath, locale: SiteLocale) {
  const canonical = localizedPath(path, locale)

  // A page we've asked not to index doesn't belong in an `hreflang` cluster in
  // either direction: it can't be the answer for a language, and naming its
  // neighbours would invite a crawler to treat the group as one indexable set.
  if (!isIndexable(path, locale)) {
    return { canonical }
  }

  const offered = indexableLocales(path)

  return {
    canonical,
    languages: Object.fromEntries([
      ...offered.map((code) => [code, localizedPath(path, code)]),
      ["x-default", localizedPath(path, offered.includes("en") ? "en" : offered[0])],
    ]),
  }
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
/**
 * The publisher entity, in one place.
 *
 * Lifted out of the landing graph when the blog articles needed a `publisher`:
 * a `BlogPosting` that referenced `#organization` by `@id` alone would be
 * pointing at a node defined on a different page, and a consumer reading only
 * the article gets a dangling reference. So each page that needs it embeds the
 * whole thing, under the same `@id` — which is exactly what an `@id` is for.
 * Two copies of a definition that can't disagree, because there is one source.
 */
export function buildOrganization(locale: SiteLocale = "en") {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "EnergyCurve",
    url: SITE_URL,
    logo: `${SITE_URL}/brand-kit/logo-horizontal.png`,
    email: "hello@energycurve.app",
    description: getSiteCopy(locale).footer.description,
    parentOrganization: {
      "@type": "Organization",
      name: OPERATING_COMPANY.name,
      url: OPERATING_COMPANY.url,
    },
  }
}

/** The social card URL, for consumers outside this module. */
export const SOCIAL_IMAGE_URL = `${SITE_URL}/opengraph-image`

/**
 * The social card as an Open Graph image entry, for pages that build their own
 * `openGraph` block rather than going through `marketingMetadata` — today, the
 * blog articles. Without it a shared article previews as a bare title, and the
 * `image` its JSON-LD claims is one no scraper ever sees.
 */
export function socialImages(locale: SiteLocale) {
  return [socialImage(locale)]
}

export function buildLandingStructuredData({
  locale = "en",
}: StructuredDataOptions = {}) {
  const copy = getSiteCopy(locale)
  const organization = buildOrganization(locale)

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
    /**
     * Spread, not `robots: cond ? x : undefined`. Next treats a key that is
     * present and undefined as an override, so the ternary form silently
     * stripped `index, follow` and the whole `googleBot` block — max-snippet,
     * max-image-preview — from every page that wasn't noindex. Omitting the key
     * is what lets the root layout's value through.
     */
    ...(isIndexable(path, locale)
      ? {}
      : { robots: { index: false, follow: true } }),
    alternates: buildAlternates(path, locale),
    openGraph: {
      title: socialTitle,
      description,
      url: `${SITE_URL}${localizedPath(path, locale)}`,
      siteName: "EnergyCurve",
      type: "website",
      locale: openGraphLocale(locale),
      alternateLocale: alternateOpenGraphLocale(locale),
      images: [socialImage(locale, path)],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [socialImage(locale, path)],
    },
  }
}

/**
 * Serialises a structured-data graph for embedding in a `<script>` tag.
 *
 * `JSON.stringify` alone is not enough, and the reason is specific: it does not
 * escape `<`, so a string containing `</script>` closes the tag early and
 * everything after it is parsed as HTML. That is script injection through a
 * JSON blob, and it does not care that the blob is valid JSON.
 *
 * Today every graph here is built from `getSiteCopy()`, which is static copy in
 * this repo, so nothing hostile can reach it. This exists because that is a
 * property of the current call sites and not of the mechanism — the day someone
 * puts a blog post title, a playlist name or a user's display name into
 * structured data, the escaping has to already be in place. It will not occur to
 * them to add it, because the code around it will look like it already works.
 *
 * Escaping `<` as `\u003c` is valid JSON and valid JavaScript, so consumers and
 * crawlers read exactly the same value. Also escapes U+2028 and U+2029, which
 * are legal in JSON strings and illegal as raw line terminators in a script
 * body — an old parser trips on them.
 */
export function serializeStructuredData(graph: unknown): string {
  return JSON.stringify(graph)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}
