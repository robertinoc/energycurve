/**
 * A cheap structural check to run before handing a document to an XML parser.
 *
 * Why it exists: Rekordbox XML and Traktor NML imports are parsed **server-side,
 * inside a server action**, on files up to 12 MB. In September 2026 an advisory
 * landed against `fast-xml-parser` — "repeated DOCTYPE declarations reset entity
 * expansion limits" — which is exactly the class of attack the library's own
 * limits were supposed to stop. We took the fix (5.11.1), and this is the belt
 * to that braces: a library's internal limit is one CVE away from being the
 * thing that failed.
 *
 * Deliberately a string scan, not a parse. The point is to refuse a hostile
 * document **before** the expensive, attackable step, so anything that needs to
 * build a tree first would defeat the purpose.
 *
 * Both real formats are flat: a collection of entries with attributes. Neither
 * has any legitimate use for a DOCTYPE, an entity declaration, or fifty levels
 * of nesting, so refusing those costs a real user nothing.
 */

export interface XmlGuardResult {
  ok: boolean
  /** Machine-readable so the caller can pick its own message and locale. */
  reason?: "doctype" | "entity" | "processing_instruction" | "too_deep"
}

/**
 * Past this, nesting is not a playlist. Rekordbox's deepest legitimate shape is
 * DJ_PLAYLISTS → PLAYLISTS → NODE → NODE → TRACK, and Traktor's is shallower;
 * 40 leaves room for folder trees far deeper than any DJ builds.
 */
const MAX_DEPTH = 40

export function inspectXmlDocument(source: string): XmlGuardResult {
  // A DOCTYPE is the carrier for both the billion-laughs family and the
  // advisory above. No exporter writes one.
  if (/<!DOCTYPE/i.test(source)) {
    return { ok: false, reason: "doctype" }
  }

  // Entity declarations outside a DOCTYPE, belt and braces.
  if (/<!ENTITY/i.test(source)) {
    return { ok: false, reason: "entity" }
  }

  // `<?xml …?>` is fine and expected; any other processing instruction is not.
  const instructions = source.match(/<\?[\w-]+/g) ?? []
  if (instructions.some((match) => !/^<\?xml$/i.test(match))) {
    return { ok: false, reason: "processing_instruction" }
  }

  if (maxDepthOf(source) > MAX_DEPTH) {
    return { ok: false, reason: "too_deep" }
  }

  return { ok: true }
}

/**
 * Depth by counting tags, without building anything.
 *
 * Self-closing tags and the XML declaration do not change depth. Attribute
 * values can contain `<` and `>`, so the scan tracks whether it is inside a
 * quoted value — without that, a path like `C:/Music/<weird>.aiff` in a
 * LOCATION attribute would read as nesting and reject an honest file.
 */
function maxDepthOf(source: string): number {
  let depth = 0
  let deepest = 0
  let index = 0

  while (index < source.length) {
    const open = source.indexOf("<", index)
    if (open === -1) break

    const next = source[open + 1]

    // Comments and CDATA hold no structure worth counting; skip to their end.
    if (source.startsWith("<!--", open)) {
      const end = source.indexOf("-->", open)
      index = end === -1 ? source.length : end + 3
      continue
    }
    if (source.startsWith("<![CDATA[", open)) {
      const end = source.indexOf("]]>", open)
      index = end === -1 ? source.length : end + 3
      continue
    }

    // Walk to the tag's end, honouring quotes so a '>' inside an attribute
    // value does not end it early.
    let cursor = open + 1
    let quote: string | null = null

    while (cursor < source.length) {
      const char = source[cursor]

      if (quote) {
        if (char === quote) quote = null
      } else if (char === '"' || char === "'") {
        quote = char
      } else if (char === ">") {
        break
      }

      cursor += 1
    }

    const isClosing = next === "/"
    const isDeclaration = next === "?" || next === "!"
    const selfCloses = source[cursor - 1] === "/"

    if (!isDeclaration) {
      if (isClosing) {
        depth = Math.max(0, depth - 1)
      } else if (!selfCloses) {
        depth += 1
        if (depth > deepest) deepest = depth
      }
    }

    index = cursor + 1

    // Bail as soon as the answer is known: a hostile document should cost us a
    // partial scan, not a full one.
    if (deepest > MAX_DEPTH) return deepest
  }

  return deepest
}

export { MAX_DEPTH as XML_MAX_DEPTH }
