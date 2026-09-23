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
  /**
   * A glossary term, with the definition that goes in its tooltip.
   *
   * The parser never produces one: there is no markdown syntax for it, and
   * adding one would mean editing the articles. `lib/blog/link-terms.ts`
   * produces it afterwards, by splitting a `text` node. It lives in this union
   * so the renderer's switch stays exhaustive and the type checker knows the
   * node can arrive.
   */
  | { kind: "term"; text: string; id: string; href: string; short: string }

/**
 * One question and its answer.
 *
 * The question is plain text and the answer is inline nodes, which is not an
 * oversight. The answer is prose a reader reads and can carry a link — an FAQ
 * is one of the few places an internal link is genuinely useful rather than
 * decorative. The question becomes a `<summary>` and the `name` of a
 * schema.org `Question`, both of which take text; a link inside a summary is
 * awkward to operate with a keyboard and has nowhere to go in the markup.
 */
export interface FaqPair {
  question: string
  answer: InlineNode[]
}

export type BlogBlock =
  | { kind: "heading"; level: 2 | 3 | 4; inline: InlineNode[] }
  | { kind: "paragraph"; inline: InlineNode[] }
  | { kind: "list"; ordered: boolean; items: InlineNode[][] }
  | { kind: "code"; lines: string[] }
  | { kind: "table"; header: InlineNode[][]; rows: InlineNode[][][] }
  /**
   * Native `<details>` questions. The article's `FAQPage` is derived from these
   * and from nothing else, so a question that is not on the page cannot reach
   * the markup — the property the rest of the site already holds.
   */
  | { kind: "faq"; entries: FaqPair[] }

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

/**
 * Inline nodes as plain text.
 *
 * `acceptedAnswer.text` is a string, and the answer on the page may contain a
 * link or bold. Deriving the string from the same nodes the page renders is
 * what keeps the two from disagreeing — the alternative is a second copy of
 * the answer written for the markup, which is the exact arrangement every other
 * FAQ on this site was built to avoid.
 */
export function inlineToText(nodes: InlineNode[]): string {
  return nodes.map((node) => node.text).join("")
}

/**
 * A `faq` fence into question/answer pairs.
 *
 * The format is `Q:` and `A:` lines, alternating, with blank lines between
 * pairs and wrapped continuations indented or simply following on. It is
 * strict on purpose, in the spirit of the rest of this file: a stray line that
 * is neither a continuation nor a marker is refused rather than guessed at,
 * because an FAQ that silently drops a question also silently drops it from
 * the structured data, and nobody re-reads published markup.
 */
function parseFaq(lines: string[], lineNumber: number): BlogBlock {
  const entries: FaqPair[] = []
  let current: { question: string; answer: string[] } | null = null
  let reading: "question" | "answer" | null = null

  for (const [offset, raw] of lines.entries()) {
    const line = raw.trim()
    const at = lineNumber + offset + 1

    if (line === "") {
      reading = null
      continue
    }

    const question = line.match(/^Q:\s*(.*)$/)
    const answer = line.match(/^A:\s*(.*)$/)

    if (question) {
      if (current) {
        if (current.answer.length === 0) {
          throw new UnsupportedMarkdownError(
            `question with no answer: ${current.question}`,
            at
          )
        }
        entries.push({
          question: current.question,
          answer: parseInline(current.answer.join(" "), at),
        })
      }

      current = { question: question[1].trim(), answer: [] }
      reading = "question"
      continue
    }

    if (answer) {
      if (!current) {
        throw new UnsupportedMarkdownError("answer before any question", at)
      }

      current.answer.push(answer[1].trim())
      reading = "answer"
      continue
    }

    // A continuation of whichever half we are inside. Source lines are
    // hard-wrapped, same as the rest of this file's constructs.
    if (reading === "answer" && current) {
      current.answer.push(line)
      continue
    }

    if (reading === "question" && current) {
      current.question = `${current.question} ${line}`
      continue
    }

    throw new UnsupportedMarkdownError(`faq line without Q: or A: — ${line}`, at)
  }

  if (current) {
    if (current.answer.length === 0) {
      throw new UnsupportedMarkdownError(
        `question with no answer: ${current.question}`,
        lineNumber
      )
    }
    entries.push({
      question: current.question,
      answer: parseInline(current.answer.join(" "), lineNumber),
    })
  }

  if (entries.length === 0) {
    throw new UnsupportedMarkdownError("empty faq block", lineNumber)
  }

  return { kind: "faq", entries }
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

      // An info string picks the block. A fence already means "the content
      // between these is not markdown", which is what an FAQ needs — its lines
      // are a small format of their own, not prose — and reusing it means no
      // new delimiter to collide with anything an article might legitimately
      // write.
      const info = trimmed.slice(3).trim().toLowerCase()

      if (info === "faq") {
        blocks.push(parseFaq(code, lineNumber))
      } else {
        blocks.push({ kind: "code", lines: code })
      }

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
