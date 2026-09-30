import { XMLParser } from "fast-xml-parser"
import { describe, expect, it } from "vitest"

import {
  ConversionError,
  convertM3u8ToNml,
  convertNmlToM3u8,
  convertPlaylistFile,
  directionForFilename,
  parseM3u8,
  pathToTraktorParts,
  traktorKeyToPath,
} from "@/lib/tools/playlist-converter"

/**
 * The TraktorBox suite, ported alongside the converter.
 *
 * `tests/test_traktorbox.py` had 63 tests in two halves: the converter's own
 * behaviour, and the Flask endpoint that wrapped it. The first half is here
 * one for one. The second half is here as tests of `convertPlaylistFile`, which
 * is what replaced the endpoint — the same decisions (which extension goes
 * which way, what a multi-playlist NML becomes, what the download is called)
 * now made in the browser instead of on a server.
 */

// --- Fixtures, verbatim from the Python suite --------------------------------

const MINIMAL_NML_SINGLE_PLAYLIST = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
  <MUSICFOLDERS></MUSICFOLDERS>
  <COLLECTION ENTRIES="2">
    <ENTRY TITLE="Deep Blue" ARTIST="Ocean Drive">
      <LOCATION DIR="/:Music/:Sets/:" FILE="deep_blue.mp3" VOLUME="MUSIC HD" VOLUMEID="MUSIC HD"></LOCATION>
      <MODIFICATION_INFO AUTHOR_TYPE="user"></MODIFICATION_INFO>
      <INFO PLAYTIME="312" IMPORT_DATE="2024/1/1" FLAGS="12" FILESIZE="5000"></INFO>
    </ENTRY>
    <ENTRY TITLE="Solar Wind" ARTIST="Star Atlas">
      <LOCATION DIR="/:Music/:Sets/:" FILE="solar_wind.mp3" VOLUME="MUSIC HD" VOLUMEID="MUSIC HD"></LOCATION>
      <MODIFICATION_INFO AUTHOR_TYPE="user"></MODIFICATION_INFO>
      <INFO PLAYTIME="428" IMPORT_DATE="2024/1/1" FLAGS="12" FILESIZE="7000"></INFO>
    </ENTRY>
  </COLLECTION>
  <SETS ENTRIES="0"></SETS>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="1">
        <NODE TYPE="PLAYLIST" NAME="My Set">
          <PLAYLIST ENTRIES="2" TYPE="LIST" UUID="aabbccdd11223344aabbccdd11223344">
            <ENTRY>
              <PRIMARYKEY TYPE="TRACK" KEY="MUSIC HD/:Music/:Sets/:deep_blue.mp3"></PRIMARYKEY>
            </ENTRY>
            <ENTRY>
              <PRIMARYKEY TYPE="TRACK" KEY="MUSIC HD/:Music/:Sets/:solar_wind.mp3"></PRIMARYKEY>
            </ENTRY>
          </PLAYLIST>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
  <INDEXING></INDEXING>
</NML>
`

const EMPTY_COLLECTION_NML = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
  <MUSICFOLDERS></MUSICFOLDERS>
  <COLLECTION ENTRIES="0"></COLLECTION>
  <SETS ENTRIES="0"></SETS>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="0"></SUBNODES>
    </NODE>
  </PLAYLISTS>
  <INDEXING></INDEXING>
</NML>
`

const MULTI_PLAYLIST_NML = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
  <MUSICFOLDERS></MUSICFOLDERS>
  <COLLECTION ENTRIES="3">
    <ENTRY TITLE="Track Alpha" ARTIST="DJ One">
      <LOCATION DIR="/:Club/:" FILE="alpha.mp3" VOLUME="USB" VOLUMEID="USB"></LOCATION>
      <MODIFICATION_INFO AUTHOR_TYPE="user"></MODIFICATION_INFO>
      <INFO PLAYTIME="200" IMPORT_DATE="2024/1/1" FLAGS="12" FILESIZE="3200"></INFO>
    </ENTRY>
    <ENTRY TITLE="Track Beta" ARTIST="DJ Two">
      <LOCATION DIR="/:Club/:" FILE="beta.mp3" VOLUME="USB" VOLUMEID="USB"></LOCATION>
      <MODIFICATION_INFO AUTHOR_TYPE="user"></MODIFICATION_INFO>
      <INFO PLAYTIME="240" IMPORT_DATE="2024/1/1" FLAGS="12" FILESIZE="3840"></INFO>
    </ENTRY>
    <ENTRY TITLE="Track Gamma" ARTIST="DJ Three">
      <LOCATION DIR="/:Club/:" FILE="gamma.mp3" VOLUME="USB" VOLUMEID="USB"></LOCATION>
      <MODIFICATION_INFO AUTHOR_TYPE="user"></MODIFICATION_INFO>
      <INFO PLAYTIME="180" IMPORT_DATE="2024/1/1" FLAGS="12" FILESIZE="2880"></INFO>
    </ENTRY>
  </COLLECTION>
  <SETS ENTRIES="0"></SETS>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="2">
        <NODE TYPE="PLAYLIST" NAME="Friday Night">
          <PLAYLIST ENTRIES="2" TYPE="LIST" UUID="aaaabbbbccccdddd1111222233334444">
            <ENTRY>
              <PRIMARYKEY TYPE="TRACK" KEY="USB/:Club/:alpha.mp3"></PRIMARYKEY>
            </ENTRY>
            <ENTRY>
              <PRIMARYKEY TYPE="TRACK" KEY="USB/:Club/:beta.mp3"></PRIMARYKEY>
            </ENTRY>
          </PLAYLIST>
        </NODE>
        <NODE TYPE="PLAYLIST" NAME="Saturday Night">
          <PLAYLIST ENTRIES="2" TYPE="LIST" UUID="11112222333344445555666677778888">
            <ENTRY>
              <PRIMARYKEY TYPE="TRACK" KEY="USB/:Club/:beta.mp3"></PRIMARYKEY>
            </ENTRY>
            <ENTRY>
              <PRIMARYKEY TYPE="TRACK" KEY="USB/:Club/:gamma.mp3"></PRIMARYKEY>
            </ENTRY>
          </PLAYLIST>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
  <INDEXING></INDEXING>
</NML>
`

const VALID_M3U8 = `#EXTM3U

#EXTINF:312,Ocean Drive - Deep Blue
/Volumes/MUSIC HD/Music/Sets/deep_blue.mp3
#EXTINF:428,Star Atlas - Solar Wind
/Volumes/MUSIC HD/Music/Sets/solar_wind.mp3
`

const BARE_PATHS_M3U8 = `#EXTM3U

/Volumes/MUSIC HD/Music/Sets/deep_blue.mp3
/Volumes/MUSIC HD/Music/Sets/solar_wind.mp3
`

// --- Helpers ------------------------------------------------------------------

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name) => name === "ENTRY" || name === "NODE",
})

interface ParsedEntry {
  "@_TITLE": string
  "@_ARTIST": string
  LOCATION: { "@_DIR": string; "@_FILE": string; "@_VOLUME": string }
  INFO: { "@_PLAYTIME": string }
}

interface ParsedNml {
  NML: {
    COLLECTION: { ENTRY?: ParsedEntry[] }
    PLAYLISTS: {
      NODE: Array<{
        SUBNODES: {
          NODE: Array<{
            "@_TYPE": string
            "@_NAME": string
            PLAYLIST: {
              "@_ENTRIES": string
              ENTRY?: Array<{ PRIMARYKEY: { "@_TYPE": string; "@_KEY": string } }>
            }
          }>
        }
      }>
    }
  }
}

/** The output NML, parsed back — `ET.fromstring` in the original. */
function parseNml(nml: string): ParsedNml {
  return xml.parse(nml) as ParsedNml
}

function collectionEntries(nml: string) {
  return parseNml(nml).NML.COLLECTION.ENTRY ?? []
}

function playlistNode(nml: string) {
  return parseNml(nml).NML.PLAYLISTS.NODE[0].SUBNODES.NODE[0]
}

function primaryKeys(nml: string) {
  return (playlistNode(nml).PLAYLIST.ENTRY ?? []).map((entry) => entry.PRIMARYKEY)
}

/** The file paths in an M3U8: every non-empty line that is not a comment. */
function pathLines(m3u8: string) {
  return m3u8
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
}

function extinfDurations(m3u8: string) {
  return m3u8
    .split("\n")
    .filter((line) => line.startsWith("#EXTINF:"))
    .map((line) => {
      const rest = line.slice("#EXTINF:".length)
      const comma = rest.indexOf(",")
      expect(comma, `no comma in ${line}`).not.toBe(-1)

      return Number.parseInt(rest.slice(0, comma), 10)
    })
}

// --- NML → M3U8 ---------------------------------------------------------------

describe("convertNmlToM3u8 on a valid file", () => {
  const playlists = convertNmlToM3u8(MINIMAL_NML_SINGLE_PLAYLIST)

  it("returns at least one playlist", () => {
    expect(playlists.length).toBeGreaterThan(0)
  })

  it("names every playlist", () => {
    for (const playlist of playlists) {
      expect(typeof playlist.name).toBe("string")
      expect(playlist.name).not.toBe("")
    }
  })

  it("starts every M3U8 with #EXTM3U", () => {
    for (const playlist of playlists) {
      expect(playlist.m3u8Content.startsWith("#EXTM3U")).toBe(true)
    }
  })

  it("writes every path under /Volumes/", () => {
    for (const playlist of playlists) {
      for (const line of pathLines(playlist.m3u8Content)) {
        expect(line.startsWith("/Volumes/"), line).toBe(true)
      }
    }
  })

  it("writes a numeric duration on every EXTINF line", () => {
    for (const playlist of playlists) {
      for (const duration of extinfDurations(playlist.m3u8Content)) {
        expect(Number.isNaN(duration)).toBe(false)
        expect(duration).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe("convertNmlToM3u8 against the minimal fixture", () => {
  const playlists = convertNmlToM3u8(MINIMAL_NML_SINGLE_PLAYLIST)
  const content = playlists[0].m3u8Content

  it("finds exactly one playlist", () => {
    expect(playlists).toHaveLength(1)
  })

  it("keeps the playlist's name", () => {
    expect(playlists[0].name).toBe("My Set")
  })

  it("counts two tracks", () => {
    expect(pathLines(content)).toHaveLength(2)
    expect(playlists[0].trackCount).toBe(2)
  })

  it("resolves both paths through /Volumes/<volume>/", () => {
    expect(content).toContain("/Volumes/MUSIC HD/Music/Sets/deep_blue.mp3")
    expect(content).toContain("/Volumes/MUSIC HD/Music/Sets/solar_wind.mp3")
  })

  it("carries the playtimes into EXTINF, in playlist order", () => {
    expect(extinfDurations(content)).toEqual([312, 428])
  })

  it("writes artist and title as 'Artist - Title'", () => {
    expect(content).toContain("Ocean Drive - Deep Blue")
    expect(content).toContain("Star Atlas - Solar Wind")
  })

  it("follows the playlist's order, not the collection's", () => {
    // Same tracks, referenced the other way round: the M3U8 must flip too.
    const reversed = MINIMAL_NML_SINGLE_PLAYLIST.replace(
      /<PLAYLIST ENTRIES="2"[\s\S]*?<\/PLAYLIST>/,
      `<PLAYLIST ENTRIES="2" TYPE="LIST" UUID="x">
            <ENTRY><PRIMARYKEY TYPE="TRACK" KEY="MUSIC HD/:Music/:Sets/:solar_wind.mp3"></PRIMARYKEY></ENTRY>
            <ENTRY><PRIMARYKEY TYPE="TRACK" KEY="MUSIC HD/:Music/:Sets/:deep_blue.mp3"></PRIMARYKEY></ENTRY>
          </PLAYLIST>`
    )

    expect(pathLines(convertNmlToM3u8(reversed)[0].m3u8Content)).toEqual([
      "/Volumes/MUSIC HD/Music/Sets/solar_wind.mp3",
      "/Volumes/MUSIC HD/Music/Sets/deep_blue.mp3",
    ])
  })
})

describe("convertNmlToM3u8 on an empty collection", () => {
  it("returns no playlists", () => {
    expect(convertNmlToM3u8(EMPTY_COLLECTION_NML)).toEqual([])
  })
})

describe("convertNmlToM3u8 on several playlists", () => {
  const playlists = convertNmlToM3u8(MULTI_PLAYLIST_NML)

  it("returns two playlists", () => {
    expect(playlists).toHaveLength(2)
  })

  it("keeps both names", () => {
    expect(playlists.map((playlist) => playlist.name)).toEqual([
      "Friday Night",
      "Saturday Night",
    ])
  })

  it("gives Friday Night two tracks", () => {
    const friday = playlists.find((playlist) => playlist.name === "Friday Night")!
    expect(pathLines(friday.m3u8Content)).toHaveLength(2)
  })

  it("gives Saturday Night two tracks", () => {
    const saturday = playlists.find(
      (playlist) => playlist.name === "Saturday Night"
    )!
    expect(pathLines(saturday.m3u8Content)).toHaveLength(2)
  })

  it("starts each with #EXTM3U", () => {
    for (const playlist of playlists) {
      expect(playlist.m3u8Content.startsWith("#EXTM3U")).toBe(true)
    }
  })

  it("finds playlists nested inside folders", () => {
    // Traktor lets a DJ file playlists under folders; the converter has to
    // walk through them rather than read only the top level.
    const nested = MULTI_PLAYLIST_NML.replace(
      '<NODE TYPE="PLAYLIST" NAME="Saturday Night">',
      '<NODE TYPE="FOLDER" NAME="Weekends"><SUBNODES COUNT="1"><NODE TYPE="PLAYLIST" NAME="Saturday Night">'
    ).replace(
      "</NODE>\n      </SUBNODES>\n    </NODE>\n  </PLAYLISTS>",
      "</NODE></SUBNODES></NODE>\n      </SUBNODES>\n    </NODE>\n  </PLAYLISTS>"
    )

    expect(convertNmlToM3u8(nested).map((playlist) => playlist.name)).toEqual([
      "Friday Night",
      "Saturday Night",
    ])
  })
})

describe("convertNmlToM3u8 edge cases the original handled", () => {
  it("skips a playlist entry whose key matches no collection track", () => {
    const orphan = MINIMAL_NML_SINGLE_PLAYLIST.replace(
      'KEY="MUSIC HD/:Music/:Sets/:solar_wind.mp3"',
      'KEY="MUSIC HD/:Music/:Gone/:missing.mp3"'
    )
    const [playlist] = convertNmlToM3u8(orphan)

    expect(playlist.trackCount).toBe(1)
    expect(pathLines(playlist.m3u8Content)).toEqual([
      "/Volumes/MUSIC HD/Music/Sets/deep_blue.mp3",
    ])
  })

  it("drops a playlist that resolves no tracks at all", () => {
    const orphaned = MINIMAL_NML_SINGLE_PLAYLIST.replace(
      /KEY="MUSIC HD\/:Music\/:Sets\/:[a-z_]+\.mp3"/g,
      'KEY="NOWHERE/:x.mp3"'
    )

    expect(convertNmlToM3u8(orphaned)).toEqual([])
  })

  it("falls back to the filename when an entry has no TITLE", () => {
    const untitled = MINIMAL_NML_SINGLE_PLAYLIST.replace(
      '<ENTRY TITLE="Deep Blue" ARTIST="Ocean Drive">',
      '<ENTRY ARTIST="Ocean Drive">'
    )

    expect(convertNmlToM3u8(untitled)[0].m3u8Content).toContain(
      "Ocean Drive - deep_blue.mp3"
    )
  })

  it("writes the title alone when there is no artist", () => {
    const anonymous = MINIMAL_NML_SINGLE_PLAYLIST.replace(
      ' ARTIST="Ocean Drive"',
      ""
    )

    expect(convertNmlToM3u8(anonymous)[0].m3u8Content).toContain(
      "#EXTINF:312,Deep Blue\n"
    )
  })

  it("reads a playtime of 0 when INFO is absent", () => {
    const noInfo = MINIMAL_NML_SINGLE_PLAYLIST.replace(
      /<INFO PLAYTIME="312"[^>]*><\/INFO>/,
      ""
    )

    expect(extinfDurations(convertNmlToM3u8(noInfo)[0].m3u8Content)).toEqual([
      0, 428,
    ])
  })

  it("keeps a numeric-looking filename as text", () => {
    // FILE="01.mp3" must not become 1 — the parser is told not to coerce.
    const numeric = MINIMAL_NML_SINGLE_PLAYLIST.replace(
      /deep_blue\.mp3/g,
      "01.mp3"
    )

    expect(convertNmlToM3u8(numeric)[0].m3u8Content).toContain(
      "/Volumes/MUSIC HD/Music/Sets/01.mp3"
    )
  })

  it("decodes XML entities in titles and paths", () => {
    const entities = MINIMAL_NML_SINGLE_PLAYLIST.replace(
      'TITLE="Deep Blue"',
      'TITLE="Deep &amp; Blue"'
    )

    expect(convertNmlToM3u8(entities)[0].m3u8Content).toContain(
      "Ocean Drive - Deep & Blue"
    )
  })

  it("refuses a document with a DOCTYPE before parsing it", () => {
    const hostile = `<!DOCTYPE NML [<!ENTITY x "y">]>${MINIMAL_NML_SINGLE_PLAYLIST}`

    expect(() => convertNmlToM3u8(hostile)).toThrow(ConversionError)
    expect(() => convertNmlToM3u8(hostile)).toThrow(/Refused/)
  })

  it("reports a file that is not NML as unreadable", () => {
    try {
      convertNmlToM3u8("<DJ_PLAYLISTS></DJ_PLAYLISTS>")
      expect.unreachable()
    } catch (caught) {
      expect(caught).toBeInstanceOf(ConversionError)
      expect((caught as ConversionError).code).toBe("unreadable")
    }
  })
})

describe("traktorKeyToPath", () => {
  it("maps a Traktor key to a /Volumes path", () => {
    expect(traktorKeyToPath("ROBERT HD2/:_MUSICA/:Folder/:file.mp3")).toBe(
      "/Volumes/ROBERT HD2/_MUSICA/Folder/file.mp3"
    )
  })

  it("returns a key without Traktor separators untouched", () => {
    expect(traktorKeyToPath("just-a-file.mp3")).toBe("just-a-file.mp3")
  })
})

// --- M3U8 → NML ---------------------------------------------------------------

describe("convertM3u8ToNml on a valid M3U8", () => {
  const nml = convertM3u8ToNml(VALID_M3U8, "Test Playlist")
  const root = parseNml(nml)

  it("produces well-formed XML with NML at the root", () => {
    expect(root.NML).toBeDefined()
    expect(nml.startsWith('<?xml version="1.0" encoding="UTF-8"')).toBe(true)
  })

  it("has a COLLECTION and a PLAYLISTS element", () => {
    expect(root.NML.COLLECTION).toBeDefined()
    expect(root.NML.PLAYLISTS).toBeDefined()
  })

  it("puts both tracks in the collection", () => {
    expect(collectionEntries(nml)).toHaveLength(2)
  })

  it("writes DIR in Traktor's /: notation", () => {
    for (const entry of collectionEntries(nml)) {
      expect(entry.LOCATION["@_DIR"].startsWith("/:"), entry.LOCATION["@_DIR"]).toBe(true)
      expect(entry.LOCATION["@_DIR"].endsWith("/:"), entry.LOCATION["@_DIR"]).toBe(true)
    }
  })

  it("reads the volume from the /Volumes/<name>/ prefix", () => {
    for (const entry of collectionEntries(nml)) {
      expect(entry.LOCATION["@_VOLUME"]).toBe("MUSIC HD")
    }
  })

  it("keeps only the filename in FILE", () => {
    const files = collectionEntries(nml).map((entry) => entry.LOCATION["@_FILE"])
    expect(files).toContain("deep_blue.mp3")
    expect(files).toContain("solar_wind.mp3")
  })

  it("names the playlist node", () => {
    const node = playlistNode(nml)
    expect(node["@_TYPE"]).toBe("PLAYLIST")
    expect(node["@_NAME"]).toBe("Test Playlist")
  })

  it("counts the playlist's entries", () => {
    expect(playlistNode(nml).PLAYLIST["@_ENTRIES"]).toBe("2")
  })

  it("preserves the EXTINF playtimes in INFO", () => {
    const playtimes = collectionEntries(nml).map((entry) =>
      Number.parseInt(entry.INFO["@_PLAYTIME"], 10)
    )
    expect(playtimes).toContain(312)
    expect(playtimes).toContain(428)
  })

  it("references tracks by a primary key that starts with the volume", () => {
    const keys = primaryKeys(nml)
    expect(keys).toHaveLength(2)
    for (const key of keys) {
      expect(key["@_TYPE"]).toBe("TRACK")
      expect(key["@_KEY"].startsWith("MUSIC HD"), key["@_KEY"]).toBe(true)
    }
  })

  it("keeps artist and title apart", () => {
    const [first] = collectionEntries(nml)
    expect(first["@_ARTIST"]).toBe("Ocean Drive")
    expect(first["@_TITLE"]).toBe("Deep Blue")
  })
})

describe("convertM3u8ToNml on bare paths with no EXTINF", () => {
  const nml = convertM3u8ToNml(BARE_PATHS_M3U8, "Bare Playlist")

  it("still writes two collection entries", () => {
    expect(collectionEntries(nml)).toHaveLength(2)
  })

  it("defaults the playtime to zero", () => {
    for (const entry of collectionEntries(nml)) {
      expect(entry.INFO["@_PLAYTIME"]).toBe("0")
    }
  })

  it("titles each track by its filename stem", () => {
    const titles = collectionEntries(nml).map((entry) => entry["@_TITLE"])
    expect(titles).toContain("deep_blue")
    expect(titles).toContain("solar_wind")
  })

  it("keeps the filenames in LOCATION", () => {
    const files = collectionEntries(nml).map((entry) => entry.LOCATION["@_FILE"])
    expect(files).toContain("deep_blue.mp3")
    expect(files).toContain("solar_wind.mp3")
  })
})

describe("convertM3u8ToNml details", () => {
  it("is deterministic given a day and a UUID", () => {
    const options = { today: new Date(2026, 8, 30), uuid: "0".repeat(32) }
    const first = convertM3u8ToNml(VALID_M3U8, "Set", options)
    const second = convertM3u8ToNml(VALID_M3U8, "Set", options)

    expect(first).toBe(second)
    // Traktor's date has no zero padding: 2026/9/30, not 2026/09/30.
    expect(first).toContain('IMPORT_DATE="2026/9/30"')
    expect(first).toContain(`UUID="${"0".repeat(32)}"`)
  })

  it("generates a 32-hex-character UUID when none is given", () => {
    const uuid = playlistNode(convertM3u8ToNml(VALID_M3U8)).PLAYLIST as unknown as {
      "@_UUID": string
    }
    expect(uuid["@_UUID"]).toMatch(/^[0-9a-f]{32}$/)
  })

  it("defaults the playlist name to 'Playlist'", () => {
    expect(playlistNode(convertM3u8ToNml(VALID_M3U8))["@_NAME"]).toBe("Playlist")
  })

  it("escapes attribute values so the XML stays well-formed", () => {
    const awkward = `#EXTM3U
#EXTINF:200,Tom & Jerry - "Quoted" <Title>
/Volumes/USB/Rock & Roll/track.mp3
`
    const nml = convertM3u8ToNml(awkward, 'A "Set" & More')
    const [entry] = collectionEntries(nml)

    expect(entry["@_ARTIST"]).toBe("Tom & Jerry")
    expect(entry["@_TITLE"]).toBe('"Quoted" <Title>')
    expect(entry.LOCATION["@_DIR"]).toBe("/:Rock & Roll/:")
    expect(playlistNode(nml)["@_NAME"]).toBe('A "Set" & More')
  })
})

describe("parseM3u8", () => {
  it("truncates a fractional duration and tolerates a non-numeric one", () => {
    const tracks = parseM3u8(`#EXTM3U
#EXTINF:312.9,A - B
/Volumes/X/a.mp3
#EXTINF:abc,C - D
/Volumes/X/c.mp3
`)
    expect(tracks.map((track) => track.playtime)).toEqual([312, 0])
  })

  it("splits artist from title on the first ' - ' only", () => {
    const [track] = parseM3u8(`#EXTINF:1,Artist - Title - Remix\n/Volumes/X/a.mp3`)
    expect(track.artist).toBe("Artist")
    expect(track.title).toBe("Title - Remix")
  })

  it("treats a display with no dash as a title with no artist", () => {
    const [track] = parseM3u8(`#EXTINF:1,Untitled\n/Volumes/X/a.mp3`)
    expect(track).toMatchObject({ artist: "", title: "Untitled" })
  })

  it("ignores other comment lines and an EXTINF with no comma", () => {
    const tracks = parseM3u8(`#EXTM3U
#PLAYLIST:Ignored
#EXTINF:120
/Volumes/X/a.mp3
`)
    // No comma means no metadata was set, so the path falls back to its stem.
    expect(tracks).toEqual([
      { title: "a", artist: "", playtime: 0, path: "/Volumes/X/a.mp3" },
    ])
  })

  it("accepts Windows line endings", () => {
    expect(parseM3u8(VALID_M3U8.replace(/\n/g, "\r\n"))).toHaveLength(2)
  })
})

describe("pathToTraktorParts", () => {
  it("splits an external volume path", () => {
    expect(pathToTraktorParts("/Volumes/ROBERT HD2/_MUSICA/Sets/file.mp3")).toEqual({
      volume: "ROBERT HD2",
      dir: "/:_MUSICA/:Sets/:",
      file: "file.mp3",
      primaryKey: "ROBERT HD2/:_MUSICA/:Sets/:file.mp3",
    })
  })

  it("names the boot disk for a path outside /Volumes", () => {
    expect(pathToTraktorParts("/Users/dj/Music/track.mp3")).toEqual({
      volume: "Macintosh HD",
      dir: "/:Users/:dj/:Music/:",
      file: "track.mp3",
      primaryKey: "Macintosh HD/:Users/:dj/:Music/:track.mp3",
    })
  })

  it("leaves a relative path with an empty volume and a root DIR", () => {
    expect(pathToTraktorParts("track.mp3")).toEqual({
      volume: "",
      dir: "/:",
      file: "track.mp3",
      primaryKey: "/:track.mp3",
    })
  })

  it("handles a file directly under a volume", () => {
    expect(pathToTraktorParts("/Volumes/USB/track.mp3")).toEqual({
      volume: "USB",
      dir: "/:",
      file: "track.mp3",
      primaryKey: "USB/:track.mp3",
    })
  })

  it("reads a Windows drive path the way Traktor for Windows writes it", () => {
    expect(pathToTraktorParts("D:\\Music\\Sets\\track.mp3")).toEqual({
      volume: "D:",
      dir: "/:Music/:Sets/:",
      file: "track.mp3",
      primaryKey: "D:/:Music/:Sets/:track.mp3",
    })
  })
})

// --- Round trip -----------------------------------------------------------------

describe("NML → M3U8 → NML", () => {
  const [playlist] = convertNmlToM3u8(MINIMAL_NML_SINGLE_PLAYLIST)
  const nml = convertM3u8ToNml(playlist.m3u8Content, "My Set")

  it("keeps both entries", () => {
    expect(collectionEntries(nml)).toHaveLength(2)
  })

  it("keeps the volume", () => {
    for (const entry of collectionEntries(nml)) {
      expect(entry.LOCATION["@_VOLUME"]).toBe("MUSIC HD")
    }
  })

  it("keeps the filenames", () => {
    const files = collectionEntries(nml).map((entry) => entry.LOCATION["@_FILE"])
    expect(files).toEqual(["deep_blue.mp3", "solar_wind.mp3"])
  })

  it("keeps DIR in Traktor's notation", () => {
    for (const entry of collectionEntries(nml)) {
      expect(entry.LOCATION["@_DIR"]).toBe("/:Music/:Sets/:")
    }
  })

  it("reproduces the original primary keys exactly", () => {
    expect(primaryKeys(nml).map((key) => key["@_KEY"])).toEqual([
      "MUSIC HD/:Music/:Sets/:deep_blue.mp3",
      "MUSIC HD/:Music/:Sets/:solar_wind.mp3",
    ])
  })

  it("survives the trip back to M3U8 unchanged", () => {
    const [again] = convertNmlToM3u8(nml)
    expect(again.m3u8Content).toBe(playlist.m3u8Content)
  })
})

// --- The file, either way (what the Flask endpoint used to decide) --------------

describe("directionForFilename", () => {
  it("sends .nml to M3U8 and .m3u8 or .m3u to NML, in any case", () => {
    expect(directionForFilename("set.nml")).toBe("nml_to_m3u8")
    expect(directionForFilename("SET.NML")).toBe("nml_to_m3u8")
    expect(directionForFilename("set.m3u8")).toBe("m3u8_to_nml")
    expect(directionForFilename("set.m3u")).toBe("m3u8_to_nml")
  })

  it("has no direction for anything else", () => {
    expect(directionForFilename("playlist.txt")).toBeNull()
    expect(directionForFilename("track.mp3")).toBeNull()
    expect(directionForFilename("collection.xml")).toBeNull()
  })
})

describe("convertPlaylistFile", () => {
  function failure(filename: string, contents: string) {
    try {
      convertPlaylistFile(filename, contents)
    } catch (caught) {
      return caught as ConversionError
    }
    return expect.unreachable("expected a ConversionError")
  }

  it("rejects an extension it does not convert", () => {
    expect(failure("playlist.txt", "dummy content").code).toBe(
      "unsupported_extension"
    )
  })

  it("rejects an audio file", () => {
    expect(failure("track.mp3", "ID3\u0000").code).toBe("unsupported_extension")
  })

  it("turns a single-playlist NML into one .m3u8 named after the playlist", () => {
    const result = convertPlaylistFile("set.nml", MINIMAL_NML_SINGLE_PLAYLIST)

    expect(result.direction).toBe("nml_to_m3u8")
    expect(result.files).toHaveLength(1)
    expect(result.files[0].filename).toBe("My Set.m3u8")
    expect(result.files[0].mimeType).toBe("audio/x-mpegurl")
    expect(result.files[0].contents.startsWith("#EXTM3U")).toBe(true)
    expect(result.files[0].trackCount).toBe(2)
  })

  it("reports an NML with no playlists", () => {
    expect(failure("empty.nml", EMPTY_COLLECTION_NML).code).toBe("no_playlists")
  })

  it("turns a multi-playlist NML into one .m3u8 per playlist", () => {
    // The original zipped these. One download each is the browser's answer.
    const result = convertPlaylistFile("multi.nml", MULTI_PLAYLIST_NML)

    expect(result.files.map((file) => file.filename)).toEqual([
      "Friday Night.m3u8",
      "Saturday Night.m3u8",
    ])
    for (const file of result.files) {
      expect(file.contents.startsWith("#EXTM3U")).toBe(true)
    }
  })

  it("keeps slashes out of the download name", () => {
    const slashed = MINIMAL_NML_SINGLE_PLAYLIST.replace(
      'NAME="My Set"',
      'NAME="Sets/2026\\Sept"'
    )

    expect(convertPlaylistFile("set.nml", slashed).files[0].filename).toBe(
      "Sets-2026-Sept.m3u8"
    )
  })

  it("turns an M3U8 into an .nml named after the file's stem", () => {
    const result = convertPlaylistFile("my_playlist.m3u8", VALID_M3U8)

    expect(result.direction).toBe("m3u8_to_nml")
    expect(result.files).toHaveLength(1)
    expect(result.files[0].filename).toBe("my_playlist.nml")
    expect(result.files[0].mimeType).toBe("application/xml")
    expect(result.files[0].trackCount).toBe(2)
  })

  it("writes valid NML with a collection and playlists", () => {
    const { files } = convertPlaylistFile("my_playlist.m3u8", VALID_M3U8)
    const root = parseNml(files[0].contents)

    expect(root.NML.COLLECTION).toBeDefined()
    expect(root.NML.PLAYLISTS).toBeDefined()
    expect(playlistNode(files[0].contents)["@_NAME"]).toBe("my_playlist")
  })

  it("accepts .m3u as well as .m3u8", () => {
    const result = convertPlaylistFile("my_playlist.m3u", VALID_M3U8)
    expect(result.files[0].filename).toBe("my_playlist.nml")
  })

  it("reports an M3U8 with no tracks rather than writing an empty NML", () => {
    expect(failure("empty.m3u8", "#EXTM3U\n\n").code).toBe("no_tracks")
  })

  it("reports a malformed NML as unreadable", () => {
    expect(failure("broken.nml", "<NML><COLLECTION>").code).toBe("unreadable")
  })
})
