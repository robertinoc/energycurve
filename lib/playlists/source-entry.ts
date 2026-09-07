/**
 * Verbatim capture of the library entry a track was imported from.
 *
 * Why a byte-slice scanner and not the XML parser we already have: the point of
 * this module is to hand the DJ's own bytes back to their DJ software. Parsing
 * and re-serialising can only preserve the fields we thought to model, which is
 * exactly the bug — a real Traktor 3.5.1 <ENTRY> carries around twenty-five
 * fields and our writer modelled eleven, so <CUE_V2> (hotcues), <LOOPINFO>,
 * AUDIO_ID, INFO@FLAGS, <LOUDNESS>, <ALBUM>, LOCATION@VOLUMEID, PLAYCOUNT and
 * LAST_PLAYED were all silently dropped on the way out. A slice preserves the
 * fields we don't know about too, including the ones a future Traktor adds.
 *
 * Entries are paired to parsed tracks **by document order**, not by matching a
 * key. Both this scanner and fast-xml-parser walk the collection in the order it
 * appears, so entry *i* here is entry *i* there. Matching by location key would
 * mean re-implementing XML entity decoding to compare against the parser's
 * already-decoded attribute values, and getting that subtly wrong would attach
 * one track's hotcues to another — the one failure worse than the bug.
 */

export type SourcePayloadFormat = "traktor_nml" | "rekordbox_xml"

export function isSourcePayloadFormat(
  value: string | null | undefined
): value is SourcePayloadFormat {
  return value === "traktor_nml" || value === "rekordbox_xml"
}

/**
 * The source file's root and header elements, kept so a re-export declares what
 * came in rather than what we hardcoded. Our NML writer always announced
 * `VERSION="19"`; a file from a newer Traktor was handed back claiming to be an
 * older one.
 */
export interface SourceHeader {
  format: SourcePayloadFormat
  /** Attributes of the document root element, verbatim (e.g. `VERSION="19"`). */
  rootAttrs: string
  /** Everything between the root start tag and the collection, verbatim. */
  prefix: string
}

/** A header this large is not a header; something is wrong with the file. */
const MAX_PREFIX_BYTES = 8 * 1024

/**
 * Index of the character after a start tag's ">", scanning past any ">" that
 * sits inside an attribute value. XML permits a raw ">" in an attribute, and a
 * naive indexOf would cut the tag in half.
 */
function endOfStartTag(xml: string, tagStart: number): number {
  let quote: string | null = null

  for (let i = tagStart; i < xml.length; i++) {
    const c = xml[i]

    if (quote) {
      if (c === quote) {
        quote = null
      }
      continue
    }

    if (c === '"' || c === "'") {
      quote = c
      continue
    }

    if (c === ">") {
      return i + 1
    }
  }

  return -1
}

/** True when the start tag ending at `end` closed itself ("…/>"). */
function isSelfClosing(xml: string, end: number): boolean {
  return xml[end - 2] === "/"
}

interface ElementSpan {
  /** Index of "<". */
  start: number
  /** Index after the element's final ">". */
  end: number
  /** Index after the start tag's ">". */
  contentStart: number
}

/**
 * Locates the element `<name …>` starting at or after `from`, returning the span
 * of the whole element. Relies on the fact that none of the elements this module
 * looks for (COLLECTION, ENTRY, TRACK inside a collection) ever nests inside
 * itself, so the first matching close tag is the right one.
 */
function findElement(
  xml: string,
  name: string,
  from: number,
  limit: number = xml.length
): ElementSpan | null {
  const open = `<${name}`

  let cursor = from

  while (cursor < limit) {
    const start = xml.indexOf(open, cursor)

    if (start === -1 || start >= limit) {
      return null
    }

    // "<ENTRY" must not match "<ENTRYPOINT": the next character has to end the
    // element name.
    const after = xml[start + open.length]

    if (after !== undefined && !/[\s/>]/.test(after)) {
      cursor = start + open.length
      continue
    }

    const contentStart = endOfStartTag(xml, start)

    if (contentStart === -1) {
      return null
    }

    if (isSelfClosing(xml, contentStart)) {
      return { start, end: contentStart, contentStart }
    }

    const close = xml.indexOf(`</${name}`, contentStart)

    if (close === -1) {
      return null
    }

    const end = endOfStartTag(xml, close)

    return { start, end: end === -1 ? xml.length : end, contentStart }
  }

  return null
}

/**
 * The raw child elements named `name` directly inside the document's
 * `<COLLECTION>`, in document order.
 *
 * Scoped to the collection on purpose: a Traktor playlist node is also built
 * from `<ENTRY>` elements (each wrapping a `<PRIMARYKEY>`), and those are
 * references, not entries. Scanning the whole document would interleave the two.
 */
export function extractCollectionElements(
  xml: string,
  name: "ENTRY" | "TRACK"
): string[] {
  const collection = findElement(xml, "COLLECTION", 0)

  if (!collection || collection.end === collection.contentStart) {
    return []
  }

  const out: string[] = []
  let cursor = collection.contentStart

  for (;;) {
    const element = findElement(xml, name, cursor, collection.end)

    if (!element) {
      break
    }

    out.push(xml.slice(element.start, element.end))
    cursor = element.end
  }

  return out
}

/**
 * Captures the root attributes and the header elements that precede the
 * collection. Returns null when the file doesn't have the expected root, in
 * which case the exporter falls back to its own header.
 */
export function extractSourceHeader(
  xml: string,
  format: SourcePayloadFormat
): SourceHeader | null {
  const rootName = format === "traktor_nml" ? "NML" : "DJ_PLAYLISTS"
  const root = findElement(xml, rootName, 0)

  if (!root) {
    return null
  }

  const startTag = xml.slice(root.start, root.contentStart)
  const rootAttrs = startTag
    .replace(new RegExp(`^<${rootName}`), "")
    .replace(/\/?>$/, "")
    .trim()

  const collection = findElement(xml, "COLLECTION", root.contentStart, root.end)
  const prefix = collection
    ? xml.slice(root.contentStart, collection.start).trim()
    : ""

  return {
    format,
    rootAttrs,
    prefix: prefix.length <= MAX_PREFIX_BYTES ? prefix : "",
  }
}

/** Narrows an unknown (jsonb from the database) to a SourceHeader. */
export function parseSourceHeader(value: unknown): SourceHeader | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>

  if (
    !isSourcePayloadFormat(
      typeof record.format === "string" ? record.format : undefined
    ) ||
    typeof record.rootAttrs !== "string" ||
    typeof record.prefix !== "string"
  ) {
    return null
  }

  return {
    format: record.format as SourcePayloadFormat,
    rootAttrs: record.rootAttrs,
    prefix: record.prefix,
  }
}

/**
 * Pairs a parsed collection with its raw slices by document order, returning a
 * lookup by index. An empty map when the counts disagree: a mismatch means one
 * of the two walks saw something the other didn't, and attaching a payload to
 * the wrong track is worse than attaching none.
 */
export function payloadsByIndex(
  parsedCount: number,
  raw: string[]
): (index: number) => string | null {
  if (raw.length !== parsedCount) {
    return () => null
  }

  return (index) => raw[index] ?? null
}

/**
 * Rewrites one attribute on an element's start tag, adding it when absent.
 * Used only for the opt-in "write energy into the comment tag" path — the
 * default is to hand the entry back exactly as it arrived.
 */
export function setAttribute(
  element: string,
  tagName: string,
  attribute: string,
  value: string
): string {
  const span = findElement(element, tagName, 0)

  if (!span) {
    return element
  }

  const startTag = element.slice(span.start, span.contentStart)
  const existing = new RegExp(`(\\s${attribute}=")[^"]*(")`)

  const rewritten = existing.test(startTag)
    ? startTag.replace(existing, `$1${escapeXmlAttribute(value)}$2`)
    : startTag.replace(
        /(\/?>)$/,
        ` ${attribute}="${escapeXmlAttribute(value)}"$1`
      )

  return (
    element.slice(0, span.start) + rewritten + element.slice(span.contentStart)
  )
}

/** True when the element contains a child element with this name. */
export function hasChildElement(element: string, tagName: string): boolean {
  return findElement(element, tagName, 1) !== null
}

export function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Reads one attribute off a child element's start tag, or null. */
export function getAttribute(
  element: string,
  tagName: string,
  attribute: string
): string | null {
  const span = findElement(element, tagName, 0)

  if (!span) {
    return null
  }

  const match = element
    .slice(span.start, span.contentStart)
    .match(new RegExp(`\\s${attribute}="([^"]*)"`))

  return match ? match[1] : null
}

/** Reads one attribute off the element's own start tag, or null. */
export function getOwnAttribute(
  element: string,
  attribute: string
): string | null {
  const end = endOfStartTag(element, 0)

  if (end === -1) {
    return null
  }

  const match = element
    .slice(0, end)
    .match(new RegExp(`\\s${attribute}="([^"]*)"`))

  return match ? match[1] : null
}

/** Rewrites one attribute on the element's own start tag, adding it if absent. */
export function setOwnAttribute(
  element: string,
  attribute: string,
  value: string
): string {
  const end = endOfStartTag(element, 0)

  if (end === -1) {
    return element
  }

  const startTag = element.slice(0, end)
  const existing = new RegExp(`(\\s${attribute}=")[^"]*(")`)

  const rewritten = existing.test(startTag)
    ? startTag.replace(existing, `$1${escapeXmlAttribute(value)}$2`)
    : startTag.replace(/(\/?>)$/, ` ${attribute}="${escapeXmlAttribute(value)}"$1`)

  return rewritten + element.slice(end)
}
