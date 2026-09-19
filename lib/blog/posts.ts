import "server-only"

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { parseMarkdown, type BlogBlock } from "@/lib/blog/markdown"
import { localizedPath } from "@/lib/content/locale-routing"
import type { SiteLocale } from "@/lib/content/site-copy"

const CONTENT_ROOT = join(process.cwd(), "content", "blog")

export interface BlogPost {
  slug: string
  locale: SiteLocale
  title: string
  description: string
  /** ISO date. Null means draft — see `listPosts`. */
  publishedAt: string | null
  /**
   * ISO date of the last substantive edit, or null when the article hasn't been
   * revised since it went up.
   *
   * Optional in the frontmatter and absent from all five articles today, which is
   * the honest state: none has been revised. It exists because `lastmod` and
   * `dateModified` are claims about this article, and the alternative to a real
   * per-article date is the build timestamp — which would tell a crawler that
   * every article changed every time anything in the repo was deployed. Read it
   * through `postUpdatedAt`, never directly, so the fallback is the same
   * everywhere.
   */
  updatedAt: string | null
  /** The query this was written against, from the AEO baseline. Not rendered. */
  targetQuery: string | null
  /**
   * Who wrote it. Falls back to the site's default author when absent, which is
   * the honest state for every article today: they are all Robertino's.
   *
   * A field rather than a constant because the moment a guest post lands, the
   * `BlogPosting.author` has to name the guest — and the alternative is a
   * special case in the structured-data builder that nobody remembers to add.
   */
  author: { name: string; url: string }
  /**
   * The slug of the same article in the other language, when one exists.
   *
   * This is the one field with a rule attached, and the rule is the point:
   * `hreflang` between a pair is emitted **only when this resolves** to an
   * article that is actually published in the other language. A declared
   * translation that 404s is worse than no declaration at all — a crawler that
   * follows it learns the site lies about its own structure, and the penalty
   * lands on the page that made the claim.
   *
   * So writing `translationOf` is a claim, and `resolveTranslation` is what
   * checks it before anything is emitted. Setting it on one side only, or
   * before the other article is published, produces exactly nothing rather than
   * a broken link — see `postAlternates`.
   */
  translationOf: string | null
  /**
   * Topic tags, in the article's own language.
   *
   * Drives the related-articles picker and the index filter. Free text rather
   * than a closed enum: the corpus is five articles and a fixed vocabulary
   * invented at five articles is a vocabulary invented before anyone knows what
   * the topics are. Compared case-insensitively so "Orden" and "orden" are one
   * tag.
   */
  tags: string[]
  /**
   * A hand-made social card, overriding the one generated per article.
   *
   * Empty for every article today — SEO-E18 draws each card from the title and
   * standfirst, which is better than a shared image and cheaper than commissioning
   * thirty. The field exists so that an article that *deserves* artwork can have
   * it without a code change.
   */
  image: string | null
  /**
   * The body as blocks, frontmatter stripped.
   *
   * Blocks rather than an HTML string so the article component renders elements
   * and React does the escaping — see the note at the top of lib/blog/markdown.ts.
   */
  blocks: BlogBlock[]
}

/** The author every article has unless its frontmatter names another. */
export const DEFAULT_AUTHOR = {
  name: "ROBERTINOC",
  url: "https://energycurve.app",
} as const

/**
 * Frontmatter, parsed strictly.
 *
 * Flat `key: value` pairs only, which is all these files use. Not a YAML parser and
 * not trying to be: a partial YAML parser that silently mishandles a nested value is
 * worse than one that only accepts what it understands. An unknown key is fine and
 * ignored; a malformed line throws, because a title that silently became null would
 * publish a page with no title.
 */
function parseFrontmatter(raw: string, file: string): {
  fields: Record<string, string | null>
  body: string
} {
  if (!raw.startsWith("---\n")) {
    throw new Error(`${file}: no frontmatter block`)
  }

  const end = raw.indexOf("\n---", 4)

  if (end === -1) {
    throw new Error(`${file}: unterminated frontmatter block`)
  }

  const fields: Record<string, string | null> = {}

  for (const line of raw.slice(4, end).split("\n")) {
    if (line.trim() === "") {
      continue
    }

    const match = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.*)$/)

    if (!match) {
      throw new Error(`${file}: malformed frontmatter line: ${line}`)
    }

    const value = match[2].trim().replace(/^"(.*)"$/, "$1")
    fields[match[1]] = value === "null" || value === "" ? null : value
  }

  // +4 skips "\n---", +1 more the newline that follows it.
  return { fields, body: raw.slice(end + 4).replace(/^\n/, "") }
}

/**
 * A comma-separated list, parsed as strictly as everything else here.
 *
 * `tags: orden, energía` is the whole syntax. The flat `key: value` frontmatter
 * has no arrays and is not gaining any — a YAML list would mean a YAML parser,
 * and the note above says why that trade is refused.
 *
 * An empty entry throws rather than being dropped. `tags: orden,, energía` is a
 * typo, and silently reading it as two tags is how a filter ends up missing an
 * article nobody can explain.
 */
function parseList(value: string, field: string, file: string): string[] {
  const items = value.split(",").map((item) => item.trim())

  for (const item of items) {
    if (item === "") {
      throw new Error(`${file}: empty entry in ${field}: ${value}`)
    }
  }

  return items
}

/**
 * A URL this site is willing to emit.
 *
 * Same stance as the markdown link parser: site-relative, or absolute on a
 * scheme we trust. An article's frontmatter reaches `og:image` and
 * `BlogPosting.author.url`, so `javascript:` in a frontmatter field is the same
 * injection as `javascript:` in a link, arriving through a quieter door.
 */
function parseUrl(value: string, field: string, file: string): string {
  if (value.startsWith("/")) {
    return value
  }

  if (/^https?:\/\//.test(value)) {
    return value
  }

  throw new Error(`${file}: ${field} must be site-relative or http(s): ${value}`)
}

/**
 * One article, from its text.
 *
 * Split from `readPost` so the strictness above can be tested without writing
 * files: every throw in here is a rule, and a rule with no test is a rule until
 * someone loosens it to make a build pass.
 */
export function parsePost(
  raw: string,
  locale: SiteLocale,
  fileName: string
): BlogPost {
  const { fields, body } = parseFrontmatter(raw, fileName)

  for (const required of ["title", "description", "slug"] as const) {
    if (!fields[required]) {
      throw new Error(`${fileName}: missing ${required}`)
    }
  }

  // `authorUrl` without `author` is a half-filled record: it would attribute the
  // article to the default author under somebody else's URL.
  if (fields.authorUrl && !fields.author) {
    throw new Error(`${fileName}: authorUrl without author`)
  }

  return {
    slug: fields.slug!,
    locale,
    title: fields.title!,
    description: fields.description!,
    publishedAt: fields.publishedAt ?? null,
    updatedAt: fields.updatedAt ?? null,
    targetQuery: fields.targetQuery ?? null,
    author: fields.author
      ? {
          name: fields.author,
          url: fields.authorUrl
            ? parseUrl(fields.authorUrl, "authorUrl", fileName)
            : DEFAULT_AUTHOR.url,
        }
      : DEFAULT_AUTHOR,
    translationOf: fields.translationOf ?? null,
    tags: fields.tags ? parseList(fields.tags, "tags", fileName) : [],
    image: fields.image ? parseUrl(fields.image, "image", fileName) : null,
    blocks: parseMarkdown(body),
  }
}

function readPost(locale: SiteLocale, fileName: string): BlogPost {
  const file = join(CONTENT_ROOT, locale, fileName)

  return parsePost(readFileSync(file, "utf8"), locale, fileName)
}

/** Locales that have a content directory. Absent is not an error, it's empty. */
function localeDirs(): SiteLocale[] {
  try {
    return readdirSync(CONTENT_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name): name is SiteLocale => name === "en" || name === "es")
  } catch {
    return []
  }
}

/**
 * Published posts for one locale, newest first.
 *
 * Drafts — `publishedAt: null` — are excluded, which makes the date the act of
 * publishing: an article can sit finished in the repo without being live, and
 * shipping it is a one-field edit rather than a move between directories. A date in
 * the future is held back until that day, so the same field also schedules.
 *
 * `now` is injected so the scheduling boundary is testable without waiting.
 */
export function listPosts(
  locale: SiteLocale,
  now: Date = new Date()
): BlogPost[] {
  if (!localeDirs().includes(locale)) {
    return []
  }

  const today = now.toISOString().slice(0, 10)

  return readdirSync(join(CONTENT_ROOT, locale))
    .filter((name) => name.endsWith(".md"))
    .map((name) => readPost(locale, name))
    // A future date is scheduling, not a draft: set one and the article appears on
    // the day, which is what makes staggering five finished pieces a one-field edit
    // instead of a reminder to come back and flip them by hand.
    .filter((post) => post.publishedAt !== null && post.publishedAt <= today)
    .sort((a, b) => (a.publishedAt! < b.publishedAt! ? 1 : -1))
}

/**
 * The date this article last changed: its revision date if it has one, otherwise
 * the day it was published.
 *
 * Safe on any published post — `listPosts` has already excluded the ones whose
 * `publishedAt` is null, which is what makes the non-null assertion true rather
 * than hopeful.
 */
export function postUpdatedAt(post: BlogPost): string {
  return post.updatedAt ?? post.publishedAt!
}

/** One published post, or null. Drafts read as absent, same as the index. */
export function getPost(locale: SiteLocale, slug: string): BlogPost | null {
  return listPosts(locale).find((post) => post.slug === slug) ?? null
}

/**
 * Every published post across locales, for the sitemap.
 *
 * Returns the locale with each entry because an article that exists only in
 * Spanish must not be advertised with an English alternate — claiming a
 * translation that 404s is worse for a crawler than having none.
 */
export function allPublishedPosts(): BlogPost[] {
  return localeDirs().flatMap((locale) => listPosts(locale))
}

/** The other language. Two locales, so this is a flip. */
function otherLocale(locale: SiteLocale): SiteLocale {
  return locale === "en" ? "es" : "en"
}

/**
 * The article `post` says it translates, if that article actually exists.
 *
 * Pure, and takes the candidate list rather than reading disk, because the rule
 * it enforces is the one worth testing and the filesystem is not what makes it
 * interesting. Three things must hold before a pair is real:
 *
 * 1. `post.translationOf` names a slug,
 * 2. an article with that slug is **published** in the other language, and
 * 3. that article names `post` back.
 *
 * The third is not pedantry. A one-sided claim is how a pair half-lands: the
 * Spanish article ships with `translationOf`, the English one is still a draft
 * or was renamed, and `/es/blog/x` starts telling crawlers that `/blog/y` is its
 * English version while `/blog/y` says nothing. Requiring both sides means the
 * cluster appears when it is true and vanishes the moment it stops being.
 */
export function resolveTranslation(
  post: BlogPost,
  candidates: BlogPost[]
): BlogPost | null {
  if (!post.translationOf) {
    return null
  }

  const match = candidates.find(
    (candidate) =>
      candidate.locale !== post.locale && candidate.slug === post.translationOf
  )

  if (!match || match.translationOf !== post.slug) {
    return null
  }

  return match
}

/**
 * The `alternates.languages` map for one article — the translated pair when
 * there is one, and this article alone when there is not.
 *
 * A self-referencing `hreflang` on a lone article is deliberate and predates
 * this: it is the documented way to say "this page is in es, and that is the
 * whole set", where emitting nothing only says nothing was declared.
 */
export function alternatesFor(
  post: BlogPost,
  candidates: BlogPost[]
): Record<string, string> {
  // `localizedPath`, not a bare `/blog/${slug}`. The Spanish articles live under
  // `/es/blog/…`, and a raw path here quietly published `hreflang="es"` pointing
  // at the English tree — a declared alternate that 404s, which is the exact
  // failure `resolveTranslation` exists to prevent, reintroduced one line below
  // it. Found by curl against the build, not by the unit test, because the test
  // asserted what the code did.
  const href = (one: BlogPost) => localizedPath(`/blog/${one.slug}`, one.locale)
  const self = href(post)
  const twin = resolveTranslation(post, candidates)

  if (!twin) {
    return { [post.locale]: self }
  }

  return {
    [post.locale]: self,
    [twin.locale]: href(twin),
    // English is the site's default everywhere else; keep it so here.
    "x-default": post.locale === "en" ? self : href(twin),
  }
}

/** `alternatesFor` against what is actually published in the other language. */
export function postAlternates(post: BlogPost): Record<string, string> {
  return alternatesFor(post, listPosts(otherLocale(post.locale)))
}

/** Tags compare case-insensitively, so "Orden" and "orden" are one tag. */
export function normalizeTag(tag: string): string {
  return tag.trim().toLocaleLowerCase()
}

/**
 * The three articles to offer at the end of `post`.
 *
 * Ranked by how many tags they share, newest first inside a tie, and **topped
 * up with recent articles when tags run out**. The top-up is the part worth
 * stating: an article with no tags, or with tags nobody else uses, would
 * otherwise end with an empty "Keep reading" block — which is a worse page than
 * one offering three merely-recent articles, and it is exactly what a new
 * article looks like on the day it ships.
 */
export function relatedPosts(
  post: BlogPost,
  pool: BlogPost[],
  limit = 3
): BlogPost[] {
  const mine = new Set(post.tags.map(normalizeTag))

  const others = pool.filter(
    (other) => other.slug !== post.slug && other.locale === post.locale
  )

  const scored = others.map((other) => ({
    post: other,
    shared: other.tags.filter((tag) => mine.has(normalizeTag(tag))).length,
  }))

  // `pool` arrives newest-first from `listPosts`, and `sort` is stable, so
  // equal-scoring articles keep that order without a date comparison here.
  return scored
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map((entry) => entry.post)
}

/** Every tag used by a locale's published articles, most used first. */
export function tagsInUse(posts: BlogPost[]): string[] {
  const counts = new Map<string, { label: string; count: number }>()

  for (const post of posts) {
    for (const tag of post.tags) {
      const key = normalizeTag(tag)
      const seen = counts.get(key)
      counts.set(key, { label: seen?.label ?? tag, count: (seen?.count ?? 0) + 1 })
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((entry) => entry.label)
}
