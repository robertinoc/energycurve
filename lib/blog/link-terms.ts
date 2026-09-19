/**
 * Links the first appearance of each glossary term inside an already-parsed
 * article.
 *
 * The five articles are `.md` files and none of them is edited by this. That is
 * the constraint, not an implementation detail: the articles are written prose
 * with their own history, and sprinkling forty link markers through them would
 * be a rewrite pretending to be a cross-reference. So the linking happens after
 * parsing, on the `InlineNode[]` the parser already produced — a `text` node
 * containing a term becomes text, term, text.
 *
 * What it deliberately does not touch:
 *
 * - **Headings, tables and code.** A heading that is half link reads as a
 *   mistake, and a table cell has no room for one.
 * - **Anything already inside a link, `strong` or `em`.** Only `text` nodes are
 *   scanned, so a term inside an existing link cannot be nested inside another.
 * - **The second appearance onwards.** One link per term per article. A word
 *   linked every time it occurs turns a paragraph blue, which is the complaint
 *   that kills this kind of feature.
 */

import { GLOSSARY_TERMS, type GlossaryTerm } from "@/lib/content/glossary/terms"
import { glossaryTermPath } from "@/lib/content/glossary/paths"
import type { BlogBlock, InlineNode } from "@/lib/blog/markdown"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * Phrases to look for, longest first.
 *
 * Order is load-bearing: "rueda Camelot" has to be tried before "Camelot", or
 * the shorter one wins and the link starts in the middle of the phrase.
 */
function phrases(locale: SiteLocale): { term: GlossaryTerm; phrase: string }[] {
  return GLOSSARY_TERMS.flatMap((term) =>
    (term.match?.[locale] ?? [term.title[locale]]).map((phrase) => ({
      term,
      phrase,
    }))
  ).sort((a, b) => b.phrase.length - a.phrase.length)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Whole words only, where "word" includes accented letters.
 *
 * Without the lookarounds, "drop" matches inside "dropped" and "key" inside
 * "keyboard". `\b` is not enough on its own here because the phrases contain
 * spaces and hyphens.
 */
function matcher(phrase: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`,
    "iu"
  )
}

function linkInNodes(
  nodes: InlineNode[],
  term: GlossaryTerm,
  phrase: string,
  locale: SiteLocale
): { nodes: InlineNode[]; linked: boolean } {
  const pattern = matcher(phrase)

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.kind !== "text") continue

    const match = pattern.exec(node.text)
    if (!match) continue

    const before = node.text.slice(0, match.index)
    const after = node.text.slice(match.index + match[0].length)

    const replacement: InlineNode[] = [
      ...(before ? [{ kind: "text" as const, text: before }] : []),
      {
        kind: "term" as const,
        // The text as the article wrote it — capitalisation included. Replacing
        // it with the entry's title would edit the sentence.
        text: match[0],
        id: term.id,
        href: glossaryTermPath(term, locale),
        short: term.short[locale],
      },
      ...(after ? [{ kind: "text" as const, text: after }] : []),
    ]

    return {
      nodes: [...nodes.slice(0, index), ...replacement, ...nodes.slice(index + 1)],
      linked: true,
    }
  }

  return { nodes, linked: false }
}

export function linkGlossaryTerms(
  blocks: BlogBlock[],
  locale: SiteLocale
): BlogBlock[] {
  let current = blocks
  const used = new Set<string>()

  for (const { term, phrase } of phrases(locale)) {
    if (used.has(term.id)) continue

    let linked = false

    current = current.map((block) => {
      if (linked) return block

      if (block.kind === "paragraph") {
        const result = linkInNodes(block.inline, term, phrase, locale)
        if (!result.linked) return block
        linked = true
        return { ...block, inline: result.nodes }
      }

      if (block.kind === "list") {
        const items = block.items.map((item) => {
          if (linked) return item
          const result = linkInNodes(item, term, phrase, locale)
          if (!result.linked) return item
          linked = true
          return result.nodes
        })

        return linked ? { ...block, items } : block
      }

      // headings, tables and code fences are left alone — see the note above.
      return block
    })

    if (linked) used.add(term.id)
  }

  return current
}
