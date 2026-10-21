/**
 * Where a person came from the first time, reduced to what can be counted.
 *
 * Before lote 20 the only answer to "where do our users come from" was the
 * PostHog person property `$initial_utm_source`, read back into the backstage —
 * and only for visitors who accepted analytics *and* whose PostHog person got
 * merged with their profile. For the ~140 users registered by then it is empty.
 * This module is the other half: a first touch the product keeps itself, on the
 * profile, so the backstage can count signups by source without asking PostHog.
 *
 * ## What a first touch is
 *
 * The first page load of a public page in this browser **since analytics was
 * accepted**, with where it came from: the UTM parameters if the link carried
 * them, otherwise the referring site, otherwise "direct". It is captured in the
 * browser (`first-touch-store.ts`), kept in `localStorage` until the person has
 * an account, and sent to the server once (`/api/attribution/first-touch`),
 * which writes it on the profile if the profile is new and has none yet.
 *
 * ## Consent
 *
 * Nothing is stored in the browser, or sent, unless the analytics answer is
 * "granted". "unset" (never answered) and "denied" — including Do Not Track,
 * which `readConsent` already reports as denied — store nothing, and that
 * person is "unknown" in the backstage. There is no fallback: not a cookie, not
 * a server-side guess from the request, not the referrer of the signup request.
 * Unknown is a category the backstage shows, not a gap to fill.
 *
 * ## What is kept, and what is thrown away
 *
 * Kept, each one checked against a format here and again on the server:
 * - `source` — one word from {@link KNOWN_SOURCES}, or `other`, or `direct`.
 * - `medium` — one word from {@link MEDIUMS}.
 * - `campaign` — lowercase words joined by hyphens, at most 64 characters.
 * - `referrer` — the referring **host name only**, without `www.`.
 * - `landing` — the path of a **public** page, without query string or hash.
 *   A collaboration invite (`/c/<token>`) is kept as `/c/[invite]`: the token
 *   is a credential and never leaves the browser.
 * - `at` — when the touch happened.
 *
 * Discarded, always: the referrer's path and query string, the landing page's
 * query string and hash, `utm_term`, `utm_content`, click ids (`gclid`,
 * `fbclid`, …), and any value that does not fit its format. A value that does
 * not fit is dropped, not repaired — an `utm_campaign` with an `@` in it is
 * somebody's address pasted into a link, and "repairing" it would store it.
 * An unrecognised `utm_source` becomes `other` and its text is not kept.
 */

/**
 * The medium of a touch. Closed: the backstage groups by it and the UTM
 * convention (`docs/seo/utm-convention.md`) may only use these.
 */
export const MEDIUMS = [
  "none",
  "organic",
  "ai",
  "social",
  "directory",
  "crosspromo",
  "referral",
  "other",
] as const

export type Medium = (typeof MEDIUMS)[number]

/**
 * Every source the product recognises, with the medium it implies when a link
 * does not say one. Closed for the same reason as {@link MEDIUMS}; adding one
 * is a code change, reviewed, and `tests/utm-convention.test.ts` fails if the
 * convention document and this list disagree.
 */
export const KNOWN_SOURCES = {
  google: "organic",
  bing: "organic",
  duckduckgo: "organic",
  yahoo: "organic",
  ecosia: "organic",
  brave: "organic",
  chatgpt: "ai",
  perplexity: "ai",
  claude: "ai",
  gemini: "ai",
  copilot: "ai",
  instagram: "social",
  facebook: "social",
  x: "social",
  linkedin: "social",
  youtube: "social",
  tiktok: "social",
  reddit: "social",
  threads: "social",
  producthunt: "directory",
  alternativeto: "directory",
  crunchbase: "directory",
  stagelink: "crosspromo",
} as const satisfies Record<string, Medium>

export type KnownSource = keyof typeof KNOWN_SOURCES

/** `direct` and `other` are sources too, but nobody should put them in a link. */
export const SOURCES = [...Object.keys(KNOWN_SOURCES), "direct", "other"] as const

/**
 * How people actually write a source in a link. Lowercased before lookup, so
 * `Instagram`, `instagram` and `IG` all land on `instagram`.
 */
const SOURCE_ALIASES: Record<string, KnownSource> = {
  ig: "instagram",
  insta: "instagram",
  fb: "facebook",
  meta: "facebook",
  twitter: "x",
  "x.com": "x",
  li: "linkedin",
  yt: "youtube",
  gpt: "chatgpt",
  openai: "chatgpt",
  // AI assistants tag the links they cite on their own, with their domain:
  // ChatGPT appends `utm_source=chatgpt.com` to every citation.
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  "perplexity.ai": "perplexity",
  "claude.ai": "claude",
  "gemini.google.com": "gemini",
  "copilot.microsoft.com": "copilot",
  ph: "producthunt",
  "product-hunt": "producthunt",
  "product hunt": "producthunt",
  "stagelink.art": "stagelink",
  "stage-link": "stagelink",
}

const MEDIUM_ALIASES: Record<string, Medium> = {
  social_media: "social",
  "social-media": "social",
  socialmedia: "social",
  sm: "social",
  seo: "organic",
  search: "organic",
  listing: "directory",
  directorio: "directory",
  cross: "crosspromo",
  "cross-promo": "crosspromo",
  crosssell: "crosspromo",
  "cross-sell": "crosspromo",
  link: "referral",
  llm: "ai",
}

/**
 * Referring hosts the product recognises, first match wins. Order matters:
 * `gemini.google.com` is an AI assistant, not a Google search, so it has to be
 * read before the Google rule.
 */
const REFERRER_RULES: Array<[RegExp, KnownSource]> = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/, "chatgpt"],
  [/(^|\.)perplexity\.ai$/, "perplexity"],
  [/(^|\.)claude\.ai$/, "claude"],
  [/^gemini\.google\.com$/, "gemini"],
  [/^copilot\.microsoft\.com$/, "copilot"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)yahoo\.com$/, "yahoo"],
  [/(^|\.)ecosia\.org$/, "ecosia"],
  [/^search\.brave\.com$/, "brave"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)facebook\.com$|^fb\.me$/, "facebook"],
  [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, "x"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "linkedin"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)producthunt\.com$/, "producthunt"],
  [/(^|\.)alternativeto\.net$/, "alternativeto"],
  [/(^|\.)crunchbase\.com$/, "crunchbase"],
  [/(^|\.)stagelink\.art$/, "stagelink"],
]

/**
 * Hosts a person passes through while signing in. A page load with one of
 * these as referrer is somebody coming back from Google or WorkOS, not
 * somebody arriving — counting it would make "accounts.google.com" a top
 * source of every Google signup.
 */
const AUTH_REFERRERS = [
  /^accounts\.google\.com$/,
  /(^|\.)workos\.com$/,
  /(^|\.)authkit\.app$/,
]

/** This site, in every host it is served on. */
const OWN_HOSTS = [/(^|\.)energycurve\.app$/, /^localhost$/, /^127\.0\.0\.1$/]

/**
 * First path segment of every page under `app/(en)`, sorted into the two
 * kinds. `tests/first-touch.test.ts` reads the directory and fails when a page
 * exists that is in neither list, so a new route cannot quietly become a
 * landing page — or quietly leak a token into one.
 */
export const PUBLIC_SECTIONS_EN = [
  "",
  "blog",
  "compare",
  "cookie-policy",
  "energy-tags",
  "glossary",
  "guide",
  "harmonic-mixing-cheat-sheet",
  "import-formats",
  "install",
  "login",
  "pricing",
  "privacy",
  "signup",
  "subprocessors",
  "terms",
  "tools",
] as const

export const PRIVATE_SECTIONS_EN = [
  "account-suspended",
  "backstage",
  "c",
  "dashboard",
  "forgot-password",
  "reset-password",
  "verify-email",
] as const

/** The same, for the pages under `app/(es)/es`. All of them are public. */
export const PUBLIC_SECTIONS_ES = [
  "",
  "blog",
  "comparar",
  "cookie-policy",
  "energy-tags",
  "glosario",
  "guia",
  "herramientas",
  "import-formats",
  "install",
  "pricing",
  "privacy",
  "subprocessors",
  "tabla-de-mezcla-armonica",
  "terms",
] as const

/** How long a touch waits in the browser for its person to sign up. */
export const FIRST_TOUCH_LOOKBACK_DAYS = 180

const CAMPAIGN_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/
const CAMPAIGN_MAX = 64
const HOST_FORMAT = /^[a-z0-9-]+(\.[a-z0-9-]+)+$|^localhost$/
const HOST_MAX = 100
const SEGMENT_FORMAT = /^[a-z0-9-]{1,80}$/
const LANDING_MAX = 160
const LANDING_MAX_SEGMENTS = 4
/** What a collaboration invite becomes. Its token never leaves the browser. */
export const INVITE_LANDING = "/c/[invite]"

export interface FirstTouch {
  source: string
  medium: Medium
  campaign: string | null
  referrer: string | null
  landing: string | null
  /** ISO 8601. */
  at: string
}

function isMedium(value: string): value is Medium {
  return (MEDIUMS as readonly string[]).includes(value)
}

function isKnownSource(value: string): value is KnownSource {
  return Object.prototype.hasOwnProperty.call(KNOWN_SOURCES, value)
}

/**
 * A `utm_source` as written in a link → a canonical source. Unrecognised text
 * becomes `other`; the text itself is not returned, so it cannot be stored.
 */
export function normalizeSource(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase()

  if (!value) {
    return null
  }

  if (isKnownSource(value)) {
    return value
  }

  return SOURCE_ALIASES[value] ?? "other"
}

/** A `utm_medium` → one of {@link MEDIUMS}, or null when there is none. */
export function normalizeMedium(raw: string | null | undefined): Medium | null {
  const value = raw?.trim().toLowerCase()

  if (!value) {
    return null
  }

  if (isMedium(value)) {
    return value
  }

  return MEDIUM_ALIASES[value] ?? "other"
}

/**
 * A `utm_campaign`, or null when it does not fit the format.
 *
 * Only two things are forgiven: case, and spaces or underscores where hyphens
 * go. Everything else that does not fit is dropped — see the module comment
 * for why it is not repaired.
 */
export function normalizeCampaign(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase().replace(/[\s_]+/g, "-")

  if (!value || value.length > CAMPAIGN_MAX || !CAMPAIGN_FORMAT.test(value)) {
    return null
  }

  // Seven digits in a row is a phone number or an account id, not a campaign
  // name. The convention's dates are written with hyphens, so they pass.
  if (/\d{7,}/.test(value)) {
    return null
  }

  return value
}

/** The host of a referrer URL, without `www.`, or null. Never the path. */
export function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) {
    return null
  }

  let host: string

  try {
    host = new URL(referrer).hostname.toLowerCase()
  } catch {
    return null
  }

  host = host.replace(/^www\./, "")

  return host.length <= HOST_MAX && HOST_FORMAT.test(host) ? host : null
}

function matches(host: string, rules: RegExp[]): boolean {
  return rules.some((rule) => rule.test(host))
}

/** The source a referring host implies, or `other` for a site we don't name. */
export function sourceFromReferrer(host: string): KnownSource | "other" {
  for (const [rule, source] of REFERRER_RULES) {
    if (rule.test(host)) {
      return source
    }
  }

  return "other"
}

/**
 * The path worth keeping for a page, or null when it is not a public page.
 *
 * Fails closed: a section that is in neither list is treated as private, and a
 * public path with anything unusual in it (uppercase, an encoded character, a
 * fifth segment) is dropped rather than trimmed into something it was not.
 */
export function landingPath(pathname: string | null | undefined): string | null {
  if (!pathname || !pathname.startsWith("/")) {
    return null
  }

  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  const segments = trimmed.split("/").slice(1)
  const [first = "", ...rest] = segments

  if (first === "c" && rest.length === 1 && rest[0]) {
    return INVITE_LANDING
  }

  if (trimmed.length > LANDING_MAX || segments.length > LANDING_MAX_SEGMENTS) {
    return null
  }

  if (trimmed === "/") {
    return "/"
  }

  if (!segments.every((segment) => SEGMENT_FORMAT.test(segment))) {
    return null
  }

  if (first === "es") {
    const section = rest[0] ?? ""

    return (PUBLIC_SECTIONS_ES as readonly string[]).includes(section) ? trimmed : null
  }

  return (PUBLIC_SECTIONS_EN as readonly string[]).includes(first) ? trimmed : null
}

/**
 * The touch a page load represents, or null when the load is not an arrival.
 *
 * Not an arrival: a page that is not public (a dashboard reload, the landing
 * after a sign-in redirect), a load whose referrer is this site (somebody
 * already here, reloading), and a load whose referrer is a sign-in provider.
 */
export function touchFromVisit({
  href,
  referrer,
  at,
}: {
  href: string
  referrer: string | null | undefined
  at: Date
}): FirstTouch | null {
  let url: URL

  try {
    url = new URL(href)
  } catch {
    return null
  }

  const landing = landingPath(url.pathname)

  if (!landing) {
    return null
  }

  const host = referrerHost(referrer)
  const ownHost = url.hostname.toLowerCase().replace(/^www\./, "")

  if (host && (host === ownHost || matches(host, OWN_HOSTS) || matches(host, AUTH_REFERRERS))) {
    return null
  }

  const params = url.searchParams
  const tagged = normalizeSource(params.get("utm_source"))
  const taggedMedium = normalizeMedium(params.get("utm_medium"))
  const campaign = normalizeCampaign(params.get("utm_campaign"))

  if (tagged) {
    return {
      source: tagged,
      medium:
        taggedMedium ??
        (isKnownSource(tagged) ? KNOWN_SOURCES[tagged] : "other"),
      campaign,
      referrer: host,
      landing,
      at: at.toISOString(),
    }
  }

  if (host) {
    const source = sourceFromReferrer(host)

    return {
      source,
      medium: source === "other" ? "referral" : KNOWN_SOURCES[source],
      campaign,
      referrer: host,
      landing,
      at: at.toISOString(),
    }
  }

  return {
    source: "direct",
    medium: "none",
    campaign,
    referrer: null,
    landing,
    at: at.toISOString(),
  }
}

/**
 * The server's check of what a browser sent. Everything is re-validated: the
 * request is the person's own, but it is still a request, and nothing that
 * fails a format reaches the database. Returns null when the touch is unusable
 * as a whole (no valid source, medium or date).
 */
export function sanitizeFirstTouch(raw: unknown, now: Date = new Date()): FirstTouch | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const input = raw as Record<string, unknown>
  const text = (value: unknown) => (typeof value === "string" ? value : null)

  const source = text(input.source)
  const medium = text(input.medium)

  if (!source || !(SOURCES as readonly string[]).includes(source)) {
    return null
  }

  if (!medium || !isMedium(medium)) {
    return null
  }

  const at = new Date(text(input.at) ?? "")
  const earliest = now.getTime() - (FIRST_TOUCH_LOOKBACK_DAYS + 1) * 24 * 60 * 60 * 1000
  // Five minutes of slack for a browser clock that runs ahead.
  const latest = now.getTime() + 5 * 60 * 1000

  if (Number.isNaN(at.getTime()) || at.getTime() < earliest || at.getTime() > latest) {
    return null
  }

  const referrerValue = text(input.referrer)
  const referrer =
    referrerValue && referrerValue.length <= HOST_MAX && HOST_FORMAT.test(referrerValue)
      ? referrerValue
      : null
  const landingValue = text(input.landing)
  const landing =
    landingValue === INVITE_LANDING ? INVITE_LANDING : landingPath(landingValue)

  return {
    source,
    medium,
    campaign: normalizeCampaign(text(input.campaign)),
    referrer,
    landing,
    at: at.toISOString(),
  }
}
