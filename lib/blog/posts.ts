import "server-only"

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { renderMarkdown } from "@/lib/blog/markdown"
import type { SiteLocale } from "@/lib/content/site-copy"

const CONTENT_ROOT = join(process.cwd(), "content", "blog")

export interface BlogPost {
  slug: string
  locale: SiteLocale
  title: string
  description: string
  /** ISO date. Null means draft — see `listPosts`. */
  publishedAt: string | null
  /** The query this was written against, from the AEO baseline. Not rendered. */
  targetQuery: string | null
  /** Rendered HTML body, frontmatter stripped. */
  html: string
}

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

function readPost(locale: SiteLocale, fileName: string): BlogPost {
  const file = join(CONTENT_ROOT, locale, fileName)
  const { fields, body } = parseFrontmatter(readFileSync(file, "utf8"), fileName)

  for (const required of ["title", "description", "slug"] as const) {
    if (!fields[required]) {
      throw new Error(`${fileName}: missing ${required}`)
    }
  }

  return {
    slug: fields.slug!,
    locale,
    title: fields.title!,
    description: fields.description!,
    publishedAt: fields.publishedAt ?? null,
    targetQuery: fields.targetQuery ?? null,
    html: renderMarkdown(body),
  }
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
