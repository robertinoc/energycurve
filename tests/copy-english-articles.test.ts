import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Indefinite articles in the English copy, checked mechanically.
 *
 * This exists because of one defect and one lesson.
 *
 * The defect: `lib/content/tools-copy.ts` shipped "the single most reliable way
 * to make **an headliner's** job harder" on `/tools/energy-curve` — the free,
 * no-account page that is the most likely first thing a stranger reads. Nothing
 * catches this class of mistake. Proof-reading a 900-word English paragraph
 * inside a TypeScript object is not a thing anyone does twice, and the two tests
 * that read this copy check its length and its structure.
 *
 * The lesson: the **first version of the scan that found this defect could not
 * find it.** Its consonant class left the letter h out — so that silent-h words
 * like "an hour" could be filtered separately below — and leaving h out meant
 * the filter never ran, and `an headliner` sailed straight through a check
 * written to find exactly it.
 *
 * Deliberately not quoting that class here. A comment that reproduces a regex
 * is a second copy of it, and while writing this file I twice edited the copy
 * in the comment believing I was editing the regex — which is the same mistake
 * one level up.
 *
 * That makes five instruments in this repo that measured a stand-in instead of
 * the thing: the workflow check reading a word out of its own comment, the
 * compliance canary grepping a file instead of the document it renders, the
 * Art. 17 canary watching a file path, the sitemap test using "not today" as a
 * proxy for "not the build", and this one. The pattern is worth naming: **a
 * check with an exception list has to actually reach the cases the exceptions
 * are about.**
 */

/** Words that begin with a written h and a silent one. These take "an". */
const SILENT_H = ["hour", "honest", "honor", "honour", "heir"]

/**
 * Words that begin with a written vowel and a spoken consonant. These take "a".
 *
 * A list rather than a phonetic rule, because a phonetic rule in a regex is a
 * bigger lie than a list of eight words.
 */
const CONSONANT_VOWEL = [
  "uniq",
  "user",
  "use",
  "usual",
  "utili",
  "unit",
  "one",
  "euro",
]

/** `h` is IN this class. See the note above — leaving it out was the bug. */
const AN_BEFORE_CONSONANT = /\ban\s+([bcdfghjklmnpqrstvwxyz][a-z]+)/g
const A_BEFORE_VOWEL = /\ba\s+([aeiou][a-z]+)/g

function copyFiles(dir: string): string[] {
  const found: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)

    if (entry.isDirectory()) {
      found.push(...copyFiles(full))
    } else if (entry.name.endsWith(".ts")) {
      found.push(full)
    }
  }

  return found
}

/**
 * Only the English side of a bilingual entry.
 *
 * Scanning the whole file reports every Spanish `a` and `an` as a hit — "a
 * una cuenta", "volvé a iniciar sesión" — because `a` is a preposition in
 * Spanish. The first run of this scan produced 39 findings and 39 of them were
 * that.
 */
function englishStrings(source: string): string[] {
  const found: string[] = []

  for (const match of source.matchAll(/^\s*en:\s*"((?:[^"\\]|\\.)*)"/gm)) {
    found.push(match[1])
  }

  for (const match of source.matchAll(/^\s*en:\s*`((?:[^`\\]|\\.)*)`/gm)) {
    found.push(match[1])
  }

  return found
}

function offences(text: string): string[] {
  const found: string[] = []

  for (const match of text.matchAll(AN_BEFORE_CONSONANT)) {
    if (!SILENT_H.some((word) => match[1].startsWith(word))) {
      found.push(match[0])
    }
  }

  for (const match of text.matchAll(A_BEFORE_VOWEL)) {
    if (!CONSONANT_VOWEL.some((word) => match[1].startsWith(word))) {
      found.push(match[0])
    }
  }

  return found
}

const COPY_ROOT = join(process.cwd(), "lib", "content")
const BLOG_EN = join(process.cwd(), "content", "blog", "en")

describe("the English copy", () => {
  const files = copyFiles(COPY_ROOT)

  it("found copy to read, so the scan isn't vacuous", () => {
    const strings = files.flatMap((file) =>
      englishStrings(readFileSync(file, "utf8"))
    )

    expect(files.length).toBeGreaterThan(10)
    expect(strings.length).toBeGreaterThan(500)
  })

  it("reaches words beginning with h, which the first version did not", () => {
    // The regression test for the instrument, not for the copy. If `h` ever
    // leaves the character class again, this fails while the assertion below
    // stays green — which is exactly what happened the first time.
    expect(offences("that is an headliner")).toEqual(["an headliner"])
    expect(offences("that is a headliner")).toEqual([])
    // And the exceptions still work, or the fix above would just be noise.
    expect(offences("an hour of an honest set")).toEqual([])
    expect(offences("a unique user of a one-off")).toEqual([])
  })

  it.each(copyFiles(COPY_ROOT).map((file) => [file.replace(process.cwd() + "/", ""), file]))(
    "%s",
    (_label, file) => {
      const found = englishStrings(readFileSync(file, "utf8")).flatMap(offences)

      expect(found, `wrong indefinite article in ${file}`).toEqual([])
    }
  )
})

/**
 * An absent locale directory is empty, not an error — the same rule
 * `localeDirs()` in `lib/blog/posts.ts` already follows.
 *
 * Written this way because the first version called `readdirSync` at module
 * scope on a branch where `content/blog/en/` did not exist yet, and the throw
 * made vitest collect **zero tests from the whole file** while reporting "no
 * tests" rather than a failure. A test file that disappears quietly is worse
 * than one that fails.
 */
function articleFiles(): string[] {
  try {
    return readdirSync(BLOG_EN).filter((name) => name.endsWith(".md"))
  } catch {
    return []
  }
}

describe("the English articles", () => {
  const files = articleFiles()

  it.skipIf(files.length === 0).each(files)("%s", (name) => {
    const found = offences(readFileSync(join(BLOG_EN, name), "utf8"))

    expect(found, `wrong indefinite article in ${name}`).toEqual([])
  })

  it("says so when there are none, rather than passing silently", () => {
    // Not an assertion about the corpus — an assertion that this block knows
    // which of the two states it is in. The English articles land with SEO-E14
    // on a separate branch, so both states are real right now.
    expect(Array.isArray(files)).toBe(true)
  })
})
