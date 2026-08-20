/**
 * A markdown renderer for exactly the markdown our articles use, and nothing else.
 *
 * Two dependencies were the alternative — a frontmatter parser and a markdown
 * engine — for five in-repo articles written by us. This is the third option: a
 * restricted renderer that handles the constructs the articles actually contain
 * (`##` headings, bullet and numbered lists, one table, fenced blocks, `**bold**`,
 * `*italic*`, links) and **refuses** anything else rather than guessing.
 *
 * The fence support is the mechanism working: the first run against the real
 * articles threw on a ``` block my own inventory of "what these files use" had
 * missed. The choice the error forces is extend-or-rewrite, and extending was
 * right — the block is a pasted tracklist, and rewriting the article to suit the
 * renderer would be letting the tool dictate the prose.
 *
 * Refusing is the load-bearing part. A general engine silently does something
 * reasonable with a construct it half-supports, and the failure surfaces as a
 * subtly broken published page nobody re-reads. Here, an article that uses a
 * blockquote or a code fence fails the test suite before it can ship, and the
 * decision then is explicit: extend this file, or rewrite the paragraph.
 *
 * The input is trusted — it is markdown from our own repository, not user input —
 * but HTML is escaped anyway, so a stray `<` in prose can't break a page or
 * smuggle a tag in through a future article.
 */

/** Constructs this renderer understands. Anything else is a hard error. */
const SUPPORTED = new Set([
  "heading",
  "paragraph",
  "ul",
  "ol",
  "table",
  "code",
])

export class UnsupportedMarkdownError extends Error {
  constructor(line: string, lineNumber: number) {
    super(
      `Unsupported markdown at line ${lineNumber}: ${line.slice(0, 60)}. ` +
        `lib/blog/markdown.ts renders a deliberately restricted subset — ` +
        `extend it on purpose, or rewrite the line.`
    )
    this.name = "UnsupportedMarkdownError"
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Inline formatting, applied after escaping so the markers can't be forged by the
 * source text.
 *
 * Bold before italic, because `**` would otherwise be eaten as two `*` and turn a
 * bold run into nested emphasis around an empty string.
 */
export function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) =>
      // Only http(s) and site-relative links. A `javascript:` URL in an article
      // would be our own doing rather than an attack, but the check costs nothing
      // and the alternative is trusting every future author.
      {
        // Refused rather than half-rendered, same as any other construct outside
        // the subset: dropping the link and keeping the words would leave the
        // stray characters of whatever didn't match, and silently losing a link is
        // the kind of thing nobody re-reads a published page to catch.
        if (!/^(https?:\/\/|\/)/.test(href)) {
          throw new UnsupportedMarkdownError(`link to ${href}`, 0)
        }

        return `<a href="${href}">${label}</a>`
      }
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
}

interface Block {
  kind: string
  lines: string[]
}

/** Groups lines into blocks, so each renderer sees a complete construct. */
function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  const lines = markdown.split("\n")

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    if (line.trim() === "") {
      continue
    }

    // Fences are consumed whole here rather than classified line by line: the
    // content between them is not markdown and must not be parsed as any.
    if (line.startsWith("```")) {
      const body: string[] = []
      i += 1

      while (i < lines.length && !lines[i].startsWith("```")) {
        body.push(lines[i])
        i += 1
      }

      if (i >= lines.length) {
        throw new UnsupportedMarkdownError("unterminated code fence", i)
      }

      blocks.push({ kind: "code", lines: body })
      continue
    }

    // An indented line right after a list is a wrapped list item, not a new block.
    // Source lines are hard-wrapped at ~80 characters, so most items span two or
    // three of them — treating each as its own element split every wrapped bullet
    // into a `<li>` plus a stray paragraph, which is only visible by looking at
    // the rendered page.
    const previous = blocks[blocks.length - 1]

    if (
      /^\s+\S/.test(line) &&
      previous &&
      (previous.kind === "ul" || previous.kind === "ol")
    ) {
      const trimmed = line.trim()

      // A nested list is outside the subset: it needs its own <ul> inside an <li>,
      // and quietly flattening it into the parent item would lose the structure.
      if (/^([-*]|\d+\.) /.test(trimmed)) {
        throw new UnsupportedMarkdownError(line, i + 1)
      }

      previous.lines[previous.lines.length - 1] += ` ${trimmed}`
      continue
    }

    const kind = /^#{2,4} /.test(line)
      ? "heading"
      : /^- /.test(line)
        ? "ul"
        : /^\d+\. /.test(line)
          ? "ol"
          : line.startsWith("|")
            ? "table"
            : /^(> |#{1} |#{5,} )/.test(line)
              ? "unsupported"
              : "paragraph"

    if (kind === "unsupported" || !SUPPORTED.has(kind)) {
      throw new UnsupportedMarkdownError(line, i + 1)
    }

    // Headings are always their own block; the rest absorb following lines of the
    // same kind, so a wrapped paragraph or a multi-row list stays one element.
    if (kind !== "heading" && previous?.kind === kind) {
      previous.lines.push(line)
    } else {
      blocks.push({ kind, lines: [line] })
    }
  }

  return blocks
}

function renderTable(lines: string[]): string {
  const rows = lines
    // The `|---|---|` separator carries no content.
    .filter((line) => !/^\|[\s:|-]+\|$/.test(line))
    .map((line) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => renderInline(cell.trim()))
    )

  const [header, ...body] = rows

  if (!header) {
    return ""
  }

  const head = header.map((cell) => `<th>${cell}</th>`).join("")
  const rest = body
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")

  return `<table><thead><tr>${head}</tr></thead><tbody>${rest}</tbody></table>`
}

/**
 * Markdown to HTML.
 *
 * Throws `UnsupportedMarkdownError` on anything outside the subset — see the note
 * at the top of this file for why that is the desired behaviour and not a gap.
 */
export function renderMarkdown(markdown: string): string {
  return toBlocks(markdown)
    .map((block) => {
      switch (block.kind) {
        case "heading": {
          const line = block.lines[0]
          const level = line.match(/^#+/)![0].length
          return `<h${level}>${renderInline(line.replace(/^#+ /, ""))}</h${level}>`
        }
        case "ul":
          return `<ul>${block.lines
            .map((line) => `<li>${renderInline(line.slice(2))}</li>`)
            .join("")}</ul>`
        case "ol":
          return `<ol>${block.lines
            .map((line) => `<li>${renderInline(line.replace(/^\d+\. /, ""))}</li>`)
            .join("")}</ol>`
        case "table":
          return renderTable(block.lines)
        case "code":
          // Escaped, never inline-formatted: a pasted tracklist with an asterisk
          // in a title must come out as the DJ typed it.
          return `<pre><code>${escapeHtml(block.lines.join("\n"))}</code></pre>`
        default:
          // Wrapped source lines are one paragraph; the newline becomes a space.
          return `<p>${renderInline(block.lines.join(" "))}</p>`
      }
    })
    .join("\n")
}
