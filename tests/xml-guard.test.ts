import { describe, expect, it } from "vitest"

import { parseRekordbox } from "@/lib/playlists/parse-rekordbox"
import { parseTraktor } from "@/lib/playlists/parse-traktor"
import { inspectXmlDocument, XML_MAX_DEPTH } from "@/lib/playlists/xml-guard"

/**
 * Rekordbox XML and Traktor NML are parsed **server-side, inside a server
 * action**, on files up to 12 MB, from anyone with an account.
 *
 * In September 2026 an advisory landed against `fast-xml-parser`: repeated
 * DOCTYPE declarations reset the entity expansion limit — the exact mechanism
 * that was supposed to make the billion-laughs family a solved problem. We took
 * the fix. This guard is the belt to that braces, because a library's internal
 * limit is one CVE away from being the thing that failed.
 */

const REKORDBOX_HEADER = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <COLLECTION Entries="1">
    <TRACK TrackID="1" Name="A" Artist="B" AverageBpm="128.00" Tonality="8A" TotalTime="300"/>
  </COLLECTION>
  <PLAYLISTS><NODE Type="0" Name="ROOT" Count="0"/></PLAYLISTS>
</DJ_PLAYLISTS>`

describe("what the guard refuses", () => {
  it("refuses a DOCTYPE, which is how the entity attacks arrive", () => {
    const billionLaughs = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<DJ_PLAYLISTS><COLLECTION><TRACK Name="&lol3;"/></COLLECTION></DJ_PLAYLISTS>`

    expect(inspectXmlDocument(billionLaughs)).toEqual({
      ok: false,
      reason: "doctype",
    })
  })

  it("refuses the repeated-DOCTYPE shape the 2026 advisory describes", () => {
    const repeated = `<?xml version="1.0"?>
<!DOCTYPE a [<!ENTITY x "aaaa">]>
<!DOCTYPE a [<!ENTITY x "aaaa">]>
<DJ_PLAYLISTS/>`

    expect(inspectXmlDocument(repeated).ok).toBe(false)
  })

  it("refuses a bare entity declaration with no DOCTYPE around it", () => {
    expect(
      inspectXmlDocument('<!ENTITY x "y"><DJ_PLAYLISTS/>').reason
    ).toBe("entity")
  })

  it("refuses a processing instruction that is not the XML declaration", () => {
    expect(
      inspectXmlDocument('<?xml version="1.0"?><?php echo 1; ?><DJ_PLAYLISTS/>').reason
    ).toBe("processing_instruction")
  })

  it("refuses nesting no playlist has", () => {
    const deep =
      "<DJ_PLAYLISTS>" +
      "<NODE>".repeat(XML_MAX_DEPTH + 5) +
      "</NODE>".repeat(XML_MAX_DEPTH + 5) +
      "</DJ_PLAYLISTS>"

    expect(inspectXmlDocument(deep).reason).toBe("too_deep")
  })
})

describe("what the guard must not refuse", () => {
  it("accepts a real Rekordbox export", () => {
    expect(inspectXmlDocument(REKORDBOX_HEADER)).toEqual({ ok: true })
  })

  it("accepts an angle bracket inside an attribute value", () => {
    // A real failure mode for a naive scanner: file paths and track titles
    // contain all sorts of characters, and rejecting an honest library is a
    // worse outcome than the attack this guards against.
    const awkward = `<?xml version="1.0"?>
<NML><COLLECTION>
  <ENTRY TITLE="A &gt; B &lt; C"><LOCATION FILE="weird &lt;name&gt;.aiff"/></ENTRY>
</COLLECTION></NML>`

    expect(inspectXmlDocument(awkward)).toEqual({ ok: true })
  })

  it("accepts comments and CDATA without counting them as structure", () => {
    const commented = `<?xml version="1.0"?>
<!-- exported by rekordbox 6.7.7 -->
<DJ_PLAYLISTS><COLLECTION><![CDATA[<<<<<<<<<<]]></COLLECTION></DJ_PLAYLISTS>`

    expect(inspectXmlDocument(commented)).toEqual({ ok: true })
  })

  it("accepts a folder tree deeper than any DJ builds but under the limit", () => {
    const nested =
      "<DJ_PLAYLISTS>" +
      "<NODE>".repeat(XML_MAX_DEPTH - 3) +
      "</NODE>".repeat(XML_MAX_DEPTH - 3) +
      "</DJ_PLAYLISTS>"

    expect(inspectXmlDocument(nested)).toEqual({ ok: true })
  })

  it("does not count self-closing tags as nesting", () => {
    const flat = "<DJ_PLAYLISTS>" + '<TRACK Name="x"/>'.repeat(500) + "</DJ_PLAYLISTS>"

    expect(inspectXmlDocument(flat)).toEqual({ ok: true })
  })
})

describe("the parsers refuse before they parse", () => {
  it("parseRekordbox throws on a DOCTYPE instead of handing it to the library", () => {
    expect(() =>
      parseRekordbox('<!DOCTYPE x><DJ_PLAYLISTS><COLLECTION/></DJ_PLAYLISTS>')
    ).toThrow(/refuse to parse/i)
  })

  it("parseTraktor throws on a DOCTYPE too", () => {
    expect(() => parseTraktor('<!DOCTYPE x><NML><COLLECTION/></NML>')).toThrow(
      /refuse to parse/i
    )
  })

  it("parseRekordbox still reads an honest export", () => {
    const result = parseRekordbox(REKORDBOX_HEADER)

    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0].name).toBe("A")
  })
})
