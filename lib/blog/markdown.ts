/**
 * A markdown parser for exactly the markdown our articles use, and nothing else.
 *
 * Two dependencies were the alternative — a frontmatter parser and a markdown
 * engine — for five in-repo articles written by us. This is the third option: a
 * restricted parser that handles the constructs the articles actually contain
 * (`##`–`####` headings, bullet and numbered lists, tables, fenced blocks,
 * `**bold**`, `*italic*`, links) and **refuses** anything else rather than
 * guessing.
 *
 * Refusing is the load-bearing part. A general engine silently does something
 * reasonable with a construct it half-supports, and the failure surfaces as a
 * subtly broken published page nobody re-reads. Here, an article that uses a
 * blockquote or an image fails the test suite before it can ship, and the
 * decision then is explicit: extend this file, or rewrite the paragraph.
 *
 * It has earned that twice. The first run against the real articles threw on a
 * ``` block my own inventory of "what these files use" had missed. Then the
 * rendered page showed every hard-wrapped bullet split into a list item plus a
 * stray paragraph — invisible to the tests and to the type checker, obvious in a
 * screenshot.
 *
 * ## Why this returns a tree and not HTML
 *
 * It used to return an HTML string, which the article component handed to
 * `dangerouslySetInnerHTML`. That worked, and it forced this file to own HTML
 * escaping — so every future edit here carried the question "can a stray
 * character in an article break out of its element". Returning nodes deletes the
 * question: React escapes text, the component renders elements, and there is no
 * string of HTML anywhere to get wrong. Same parser, one fewer thing to be
 * careful about forever.
 */

export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "link"; text: string; href: string }

export type BlogBlock =
  | { kind: "heading"; level: 2 | 3 | 4; inline: InlineNode[] }
  | { kind: "paragraph"; inline: InlineNode[] }
  | { kind: "list"; ordered: boolean; items: InlineNode[][] }
  | { kind: "code"; lines: string[] }
  | { kind: "table"; header: InlineNode[][]; rows: InlineNode[][][] }

export class UnsupportedMarkdownError extends Error {
  constructor(what: string, lineNumber: number) {
    super(
      `Unsupported markdown at line ${lineNumber}: ${what.slice(0, 60)}. ` +
        `lib/blog/markdown.ts parses a deliberately restricted subset — ` +
        `extend it on purpose, or rewrite the line.`
    )
    this.name = "UnsupportedMarkdownError"
  }
}

/**
 * Our own absolute links become relative.
 *
 * An article that links to `https://energycurve.app/pricing` should keep working
 * on a preview deployment and after any future domain move. Borrowed from the
 * parallel implementation in PR #154, which got this right and mine didn't.
 */
function normalizeHref(href: string): string {
  const own = href.match(/^https?:\/\/energycurve\.app(\/.*)?$/)

  return own ? own[1] || "/" : href
}

/**
 * Inline formatting, tokenised left to right.
 *
 * One pass with a single alternation rather than chained replaces, so `**bold**`
 * can't be eaten as two `*` and turned into emphasis around an empty string —
 * which is what happens when italic is applied first.
 */
export function parseInline(text: string, lineNumber = 0): InlineNode[] {
  const nodes: InlineNode[] = []
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0

  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) {
      nodes.push({ kind: "text", text: text.slice(last, match.index) })
    }

    if (match[1] !== undefined) {
      const href = normalizeHref(match[2])

      // Refused rather than silently downgraded to plain text: losing a link
      // quietly is the kind of thing nobody re-reads a published page to catch.
      if (!/^(https?:\/\/|\/)/.test(href)) {
        throw new UnsupportedMarkdownError(`link to ${match[2]}`, lineNumber)
      }

      nodes.push({ kind: "link", text: match[1], href })
    } else if (match[3] !== undefined) {
      nodes.push({ kind: "strong", text: match[3] })
    } else {
      nodes.push({ kind: "em", text: match[4] })
    }

    last = pattern.lastIndex
  }

  if (last < text.length) {
    nodes.push({ kind: "text", text: text.slice(last) })
  }

  return nodes
}

function parseTable(rows: string[][], lineNumber: number): BlogBlock {
  // The |---|---| separator carries no content.
  const content = rows.filter(
    (cells) => !cells.every((cell) => /^:?-+:?$/.test(cell))
  )

  if (content.length < 2) {
    throw new UnsupportedMarkdownError(
      "table needs a header row and at least one body row",
      lineNumber
    )
  }

  return {
    kind: "table",
    header: content[0].map((cell) => parseInline(cell, lineNumber)),
    rows: content
      .slice(1)
      .map((row) => row.map((cell) => parseInline(cell, lineNumber))),
  }
}

/**
 * Markdown to blocks.
 *
 * Throws `UnsupportedMarkdownError` on anything outside the subset — see the note
 * at the top of this file for why that is the desired behaviour and not a gap.
 */
export function parseMarkdown(markdown: string): BlogBlock[] {
  const lines = markdown.split("\n")
  const blocks: BlogBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()
    const lineNumber = index + 1

    if (trimmed === "") {
      index += 1
      continue
    }

    // Checked before anything else so a construct we don't support can't be
    // mistaken for a paragraph and rendered as prose.
    if (/^(>|!\[|#(?!#)|#{5,})/.test(trimmed)) {
      throw new UnsupportedMarkdownError(trimmed, lineNumber)
    }

    // Fences are consumed whole: the content between them is not markdown and
    // must not be parsed as any.
    if (trimmed.startsWith("```")) {
      const code: string[] = []
      index += 1

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index])
        index += 1
      }

      if (index >= lines.length) {
        throw new UnsupportedMarkdownError("unterminated code fence", lineNumber)
      }

      blocks.push({ kind: "code", lines: code })
      index += 1
      continue
    }

    if (trimmed.startsWith("|")) {
      const rows: string[][] = []

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(
          lines[index]
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim())
        )
        index += 1
      }

      blocks.push(parseTable(rows, lineNumber))
      continue
    }

    const heading = trimmed.match(/^(#{2,4}) /)

    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length as 2 | 3 | 4,
        inline: parseInline(trimmed.slice(heading[1].length + 1), lineNumber),
      })
      index += 1
      continue
    }

    const listStart = trimmed.match(/^(-|\d+\.) /)

    if (listStart) {
      const ordered = listStart[1] !== "-"
      const items: string[] = []

      // Consumed until a blank line. Source lines are hard-wrapped at ~80
      // characters, so most items span two or three of them, and an indented
      // continuation belongs to the item above rather than being a block of its
      // own — treating each line as an item split every wrapped bullet into a
      // list item plus a stray paragraph.
      while (index < lines.length && lines[index].trim() !== "") {
        const raw = lines[index]
        const itemLine = raw.trim()
        const indented = /^\s/.test(raw)
        const marker = itemLine.match(/^([-*]|\d+\.) /)

        // Tested on the RAW line, not the trimmed one: an indented marker is a
        // nested list, and trimming first makes it indistinguishable from a
        // sibling item — which is how a nested list silently becomes a flat one.
        // It needs its own list inside an item, and folding it into the parent
        // would lose the structure the author wrote.
        if (indented && marker) {
          throw new UnsupportedMarkdownError(raw, index + 1)
        }

        if (marker) {
          items.push(itemLine.slice(marker[0].length))
        } else if (items.length > 0) {
          items[items.length - 1] += ` ${itemLine}`
        }

        index += 1
      }

      blocks.push({
        kind: "list",
        ordered,
        items: items.map((item) => parseInline(item, lineNumber)),
      })
      continue
    }

    // A paragraph runs to the next blank line; its source line breaks become
    // spaces, because a hard-wrapped sentence is one sentence.
    const paragraph: string[] = []

    while (index < lines.length && lines[index].trim() !== "") {
      const next = lines[index].trim()

      // Something that starts a different block ends the paragraph, so a table
      // or list immediately after prose isn't swallowed into it.
      if (
        paragraph.length > 0 &&
        /^(\||```|#{2,4} |-|\d+\. )/.test(next)
      ) {
        break
      }

      paragraph.push(next)
      index += 1
    }

    blocks.push({
      kind: "paragraph",
      inline: parseInline(paragraph.join(" "), lineNumber),
    })
  }

  return blocks
}
