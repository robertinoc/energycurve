import { describe, expect, it } from "vitest"

import {
  extractCollectionElements,
  extractSourceHeader,
  getAttribute,
  getOwnAttribute,
  hasChildElement,
  isSourcePayloadFormat,
  parseSourceHeader,
  payloadsByIndex,
  setAttribute,
  setOwnAttribute,
} from "@/lib/playlists/source-entry"

import { REAL_SHAPE_NML } from "./fixtures-traktor-nml"

describe("extractCollectionElements", () => {
  it("returns only the collection's entries, not the playlist's references", () => {
    const entries = extractCollectionElements(REAL_SHAPE_NML, "ENTRY")

    // The playlist node is built from <ENTRY> elements too — four in the file,
    // two of which are references. Scanning the document would interleave them.
    expect(entries).toHaveLength(2)
    expect(entries[0]).toContain('TITLE="Peak Freq"')
    expect(entries[1]).toContain('TITLE="Intro Bloom"')
    expect(entries.join("")).not.toContain("PRIMARYKEY")
  })

  it("keeps every field the old writer dropped", () => {
    const [first] = extractCollectionElements(REAL_SHAPE_NML, "ENTRY")

    for (const field of [
      "<CUE_V2",
      "<LOOPINFO",
      "<LOUDNESS",
      "<ALBUM",
      "<MODIFICATION_INFO",
      'AUDIO_ID="',
      'VOLUMEID="',
      'FLAGS="',
      'PLAYCOUNT="',
      'LAST_PLAYED="',
      'LABEL="',
      'COVERARTID="',
      'BPM_QUALITY="',
      'IMPORT_DATE="',
    ]) {
      expect(first, field).toContain(field)
    }

    // Both hotcues, not just the first.
    expect(first.match(/<CUE_V2/g)).toHaveLength(2)
  })

  it("handles a self-closing entry and an empty collection", () => {
    const selfClosing = `<NML VERSION="19"><COLLECTION ENTRIES="1"><ENTRY TITLE="A" ARTIST="B"/></COLLECTION></NML>`
    expect(extractCollectionElements(selfClosing, "ENTRY")).toEqual([
      '<ENTRY TITLE="A" ARTIST="B"/>',
    ])

    expect(
      extractCollectionElements(
        `<NML VERSION="19"><COLLECTION ENTRIES="0"/></NML>`,
        "ENTRY"
      )
    ).toEqual([])
  })

  it("does not cut a start tag on a '>' inside an attribute value", () => {
    // XML permits a raw ">" in an attribute value, and an indexOf(">") would
    // slice the entry in half — losing everything after it, silently.
    const xml = `<NML VERSION="19"><COLLECTION ENTRIES="1"><ENTRY TITLE="A > B" ARTIST="X"><INFO COMMENT="keep"></INFO></ENTRY></COLLECTION></NML>`
    const [entry] = extractCollectionElements(xml, "ENTRY")

    expect(entry).toContain('COMMENT="keep"')
    expect(entry).toMatch(/<\/ENTRY>$/)
  })

  it("does not match an element whose name merely starts with the tag", () => {
    const xml = `<NML VERSION="19"><COLLECTION ENTRIES="1"><ENTRYPOINT X="1"></ENTRYPOINT><ENTRY TITLE="A"></ENTRY></COLLECTION></NML>`
    const entries = extractCollectionElements(xml, "ENTRY")

    expect(entries).toHaveLength(1)
    expect(entries[0]).toContain('TITLE="A"')
  })

  it("reads Rekordbox collection tracks and skips playlist references", () => {
    const xml = `<DJ_PLAYLISTS Version="1.0.0"><PRODUCT Name="rekordbox"/><COLLECTION Entries="1"><TRACK TrackID="7" Name="A" Rating="204"><POSITION_MARK Name="in" Start="12.5" Num="0"/></TRACK></COLLECTION><PLAYLISTS><NODE Type="1" Name="Set"><TRACK Key="7"/></NODE></PLAYLISTS></DJ_PLAYLISTS>`
    const tracks = extractCollectionElements(xml, "TRACK")

    expect(tracks).toHaveLength(1)
    expect(tracks[0]).toContain("<POSITION_MARK")
    expect(tracks[0]).toContain('Rating="204"')
  })
})

describe("extractSourceHeader", () => {
  it("captures the root attributes and the header elements verbatim", () => {
    const header = extractSourceHeader(REAL_SHAPE_NML, "traktor_nml")

    expect(header).not.toBeNull()
    expect(header!.rootAttrs).toBe('VERSION="19"')
    expect(header!.prefix).toContain("<HEAD COMPANY=")
    expect(header!.prefix).toContain("<MUSICFOLDERS>")
  })

  it("keeps a version that isn't the one we used to hardcode", () => {
    const header = extractSourceHeader(
      `<NML VERSION="20"><HEAD PROGRAM="Traktor"/><COLLECTION ENTRIES="0"/></NML>`,
      "traktor_nml"
    )

    expect(header!.rootAttrs).toBe('VERSION="20"')
  })

  it("returns null when the root isn't the expected one", () => {
    expect(extractSourceHeader("<PLAYLIST/>", "traktor_nml")).toBeNull()
  })
})

describe("parseSourceHeader", () => {
  it("round-trips a captured header through jsonb", () => {
    const header = extractSourceHeader(REAL_SHAPE_NML, "traktor_nml")
    expect(parseSourceHeader(JSON.parse(JSON.stringify(header)))).toEqual(header)
  })

  it("rejects anything that isn't one", () => {
    expect(parseSourceHeader(null)).toBeNull()
    expect(parseSourceHeader("VERSION=19")).toBeNull()
    expect(parseSourceHeader({ format: "mp3", rootAttrs: "", prefix: "" })).toBeNull()
    expect(parseSourceHeader({ format: "traktor_nml" })).toBeNull()
  })
})

describe("payloadsByIndex", () => {
  it("pairs by position", () => {
    const at = payloadsByIndex(2, ["<a/>", "<b/>"])
    expect(at(0)).toBe("<a/>")
    expect(at(1)).toBe("<b/>")
    expect(at(2)).toBeNull()
  })

  it("preserves nothing when the two walks disagree", () => {
    // Attaching one track's hotcues to another is worse than attaching none,
    // so a count mismatch turns preservation off rather than guessing.
    const at = payloadsByIndex(3, ["<a/>", "<b/>"])
    expect(at(0)).toBeNull()
    expect(at(1)).toBeNull()
  })
})

describe("attribute helpers", () => {
  const [entry] = extractCollectionElements(REAL_SHAPE_NML, "ENTRY")

  it("reads a child element's attribute", () => {
    expect(getAttribute(entry, "INFO", "COMMENT")).toBe("peak hour")
    expect(getAttribute(entry, "INFO", "NOPE")).toBeNull()
    expect(getAttribute(entry, "MISSING", "COMMENT")).toBeNull()
  })

  it("reads the element's own attribute", () => {
    expect(getOwnAttribute(entry, "TITLE")).toBe("Peak Freq")
    // Must not reach into a child: LOCATION also carries a VOLUME.
    expect(getOwnAttribute(entry, "VOLUME")).toBeNull()
  })

  it("rewrites one attribute and leaves the rest of the entry alone", () => {
    const patched = setAttribute(entry, "INFO", "COMMENT", "peak hour Energy 9")

    expect(getAttribute(patched, "INFO", "COMMENT")).toBe("peak hour Energy 9")
    expect(patched).toContain("<CUE_V2")
    expect(patched).toContain('AUDIO_ID="AIQBQyERRBAAEhAA"')
    expect(patched).toContain('FLAGS="30"')
    // Everything except the comment is byte-identical.
    expect(patched.replace(' COMMENT="peak hour Energy 9"', ' COMMENT="peak hour"')).toBe(entry)
  })

  it("adds an attribute that wasn't there, and escapes it", () => {
    const [, second] = extractCollectionElements(REAL_SHAPE_NML, "ENTRY")
    const patched = setAttribute(second, "INFO", "COMMENT", 'a & b "c" <d>')

    expect(patched).toContain('COMMENT="a &amp; b &quot;c&quot; &lt;d&gt;"')
    expect(patched).toContain('GENRE="Deep House"')
  })

  it("sets an attribute on the element's own start tag", () => {
    const track = '<TRACK Name="A" Rating="204"><POSITION_MARK Num="0"/></TRACK>'

    expect(setOwnAttribute(track, "TrackID", "7")).toBe(
      '<TRACK Name="A" Rating="204" TrackID="7"><POSITION_MARK Num="0"/></TRACK>'
    )
    expect(setOwnAttribute(track, "Rating", "51")).toBe(
      '<TRACK Name="A" Rating="51"><POSITION_MARK Num="0"/></TRACK>'
    )
  })

  it("detects child elements", () => {
    expect(hasChildElement(entry, "INFO")).toBe(true)
    expect(hasChildElement(entry, "STEMS")).toBe(false)
  })
})

describe("isSourcePayloadFormat", () => {
  it("accepts the two dialects and nothing else", () => {
    expect(isSourcePayloadFormat("traktor_nml")).toBe(true)
    expect(isSourcePayloadFormat("rekordbox_xml")).toBe(true)
    expect(isSourcePayloadFormat("m3u8")).toBe(false)
    expect(isSourcePayloadFormat(null)).toBe(false)
    expect(isSourcePayloadFormat(undefined)).toBe(false)
  })
})
