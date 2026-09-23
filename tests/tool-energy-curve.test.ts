import { describe, expect, it } from "vitest"

import { TOOL_COPY } from "@/lib/content/tools-copy"

import {
  analyzeForTool,
  MIN_TOOL_TRACKS,
  TooFewTracksError,
  tracksFromPastedLines,
} from "@/lib/tools/energy-curve"
import { listPlaylists, parseImport } from "@/lib/playlists/parse-import"
import { parseTracklist } from "@/lib/playlists/parse-tracklist"
import {
  asCsv,
  asM3u8,
  asPastedText,
  asRekordboxXml,
  asTraktorNml,
  syntheticPlaylist,
} from "@/tests/fixtures/playlists"

/** The whole tool, from file contents to what the page renders. */
function analyzeFile(contents: string) {
  const parsed = parseImport(contents)

  return analyzeForTool({
    tracks: parsed.tracks,
    source: parsed.source,
    playlistName: parsed.playlistName,
  })
}

describe("the free tool analyses every format the app reads", () => {
  const tracks = syntheticPlaylist()

  it.each([
    ["Rekordbox XML", asRekordboxXml(tracks), "rekordbox"],
    ["Traktor NML", asTraktorNml(tracks), "traktor"],
    ["M3U8", asM3u8(tracks), "m3u8"],
    ["CSV", asCsv(tracks), "csv"],
  ])("%s", (_label, contents, source) => {
    const result = analyzeFile(contents)

    expect(result.source).toBe(source)
    expect(result.tracks).toHaveLength(tracks.length)
    expect(result.curve).toHaveLength(tracks.length)
    expect(result.targetCurve).toHaveLength(tracks.length)

    // The score is the headline number on the page; a NaN or an out-of-range
    // value would render as "NaN/10" rather than fail anything.
    expect(result.score).toBeGreaterThanOrEqual(1)
    expect(result.score).toBeLessThanOrEqual(10)

    for (const value of result.curve) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })

  it("reads a pasted tracklist, which has no file to parse", () => {
    const parsed = parseTracklist(asPastedText(tracks), "artist-track")
    const result = analyzeForTool({
      tracks: tracksFromPastedLines(parsed.tracks),
      source: "text",
    })

    expect(result.tracks).toHaveLength(tracks.length)
    expect(result.tracks[0].name).toBe(tracks[0].name)
    expect(result.tracks[0].artist).toBe(tracks[0].artist)
    // Nothing but names came in, so every energy is invented from position —
    // which the page has to say out loud rather than presenting as a reading.
    expect(result.coverage.verdict).toBe("invented")
    expect(result.estimatedIndices).toHaveLength(tracks.length)
  })
})

describe("problem counts", () => {
  it("reports the three kinds the page shows, as numbers", () => {
    const result = analyzeFile(asRekordboxXml(syntheticPlaylist()))

    for (const count of Object.values(result.problems)) {
      expect(Number.isInteger(count)).toBe(true)
      expect(count).toBeGreaterThanOrEqual(0)
    }
  })

  it("counts a clash only where both keys are known", () => {
    // Every key stripped: unknown is not a clash, and warning about a library
    // with no key tags is how a tool teaches people to ignore it.
    const keyless = syntheticPlaylist().map((track) => ({
      ...track,
      musicalKey: null,
    }))

    expect(analyzeFile(asRekordboxXml(keyless)).problems.harmonicClashes).toBe(0)
  })

  it("finds the jump in a set built with one in it", () => {
    const tracks = syntheticPlaylist()
    // Floor to ceiling between two adjacent tracks, which no genre tolerates.
    const jumpy = tracks.map((track, index) =>
      index === 1 ? { ...track, bpm: 100, energy: 1 } : index === 2 ? { ...track, bpm: 150, energy: 10 } : track
    )

    expect(
      analyzeFile(asRekordboxXml(jumpy)).problems.energyJumps
    ).toBeGreaterThan(0)
  })
})

describe("tracks with nothing in their tags", () => {
  it("still produces a curve, and says the energy was invented", () => {
    const bare = syntheticPlaylist().map((track) => ({
      ...track,
      bpm: null,
      musicalKey: null,
      energy: null,
    }))

    const result = analyzeFile(asRekordboxXml(bare))

    expect(result.curve).toHaveLength(bare.length)
    expect(result.coverage.verdict).toBe("invented")
    expect(result.coverage.inventedCount).toBe(bare.length)
  })

  it("marks exactly the invented points so the chart can draw them hollow", () => {
    const half = syntheticPlaylist().map((track, index) =>
      index % 2 === 0 ? { ...track, bpm: null, energy: null } : track
    )

    const result = analyzeFile(asRekordboxXml(half))

    expect(result.estimatedIndices.length).toBeGreaterThan(0)
    for (const index of result.estimatedIndices) {
      expect(result.tracks[index].energySource).toBe("estimated")
    }
  })
})

describe("guards", () => {
  it("refuses a set too short to have a curve", () => {
    const tracks = syntheticPlaylist({ length: MIN_TOOL_TRACKS - 1 })

    expect(() =>
      analyzeForTool({ tracks: parseImport(asRekordboxXml(tracks)).tracks, source: "rekordbox" })
    ).toThrow(TooFewTracksError)
  })

  it("falls back to a genre rather than refusing an untagged set", () => {
    const result = analyzeFile(asM3u8(syntheticPlaylist()))

    // M3U8 carries no genre tag at all. Detection may still infer one from the
    // BPM band; either way the page gets a genre and says which.
    expect(result.genre).toBeTruthy()
    expect(typeof result.genreDetected).toBe("boolean")
  })
})

describe("choosing a playlist inside a library export", () => {
  it("lists nothing to choose for a single-playlist format", () => {
    // An M3U8 *is* one playlist. Empty means "no choice to offer", which is
    // what the UI keys off to skip the picker.
    expect(listPlaylists(asM3u8(syntheticPlaylist()))).toEqual([])
  })

  it("lists every playlist in a Rekordbox export, not just the first", () => {
    const tracks = syntheticPlaylist({ length: 4 })
    const xml = asRekordboxXml(tracks)

    // A second playlist node, inside a folder, holding the set in reverse. The
    // parser used to stop at the first one and never mention this existed.
    const second = `      <NODE Name="Warm Up" Type="1" KeyType="0" Entries="2">
        <TRACK Key="4"/>
        <TRACK Key="3"/>
      </NODE>`
    const twoPlaylists = xml.replace(
      "    </NODE>\n  </PLAYLISTS>",
      `${second}\n    </NODE>\n  </PLAYLISTS>`
    )

    const choices = listPlaylists(twoPlaylists)

    expect(choices.map((choice) => choice.name)).toEqual([
      "Synthetic Set",
      "Warm Up",
    ])
    expect(choices[1].trackCount).toBe(2)

    // And the selection actually reaches the parser.
    const chosen = parseImport(twoPlaylists, { playlistIndex: 1 })
    expect(chosen.playlistName).toBe("Warm Up")
    expect(chosen.tracks).toHaveLength(2)

    // Default is unchanged: the first playlist, exactly as before.
    expect(parseImport(twoPlaylists).playlistName).toBe("Synthetic Set")
  })
})

describe("the note under the signup CTA", () => {
  /**
   * Audit F1-03. The note read "This set is kept in your browser" — present
   * tense — while nothing was written until the CTA was clicked. Measured:
   * `localStorage`, `sessionStorage`, cookies and IndexedDB all empty after a
   * successful analysis.
   *
   * The write happens in `goToSignup`, so the promise is real; only its tense
   * was wrong. The correct fix was the copy, because moving the write earlier
   * would store a DJ's tracklist without being asked, and the crate is
   * professional information.
   *
   * Pinned in both locales because the finding was raised against the Spanish
   * page and a canary that only reads English would leave it there.
   */
  it("promises rather than reports", () => {
    const note = TOOL_COPY.ui.lockedKept

    // Bound to the subject, not to the verb. A first version banned "is saved"
    // outright and failed on the replacement copy, which opens "Nothing is
    // saved until you click" — the negation of the very claim being removed.
    // A canary that cannot tell an assertion from its denial would have been
    // argued with and then deleted.
    expect(note.en).not.toMatch(/\bthis set is (kept|saved|stored)\b/i)
    expect(note.es).not.toMatch(/\beste set (queda|está) guardado\b/i)

    // And the positive half, which is what the fix actually is: the sentence
    // has to name the action that makes it true.
    expect(note.en).toMatch(/\b(until|when|then)\b/i)
    expect(note.es).toMatch(/\b(hasta|cuando|ahí)\b/i)
  })

  it("still says where the set would go", () => {
    // The reason the sentence exists: the alternative to "in your browser" is a
    // reader assuming it goes to a server, which is the opposite of true.
    const note = TOOL_COPY.ui.lockedKept

    expect(note.en).toMatch(/browser/i)
    expect(note.es).toMatch(/navegador/i)
  })

  it("keeps the voseo the rest of the Spanish site uses", () => {
    // Decision 29. Half-switching register is worse than either choice, and
    // this sentence sits next to copy that already voseás.
    expect(TOOL_COPY.ui.lockedKept.es).not.toMatch(
      /\btienes\b|\bhaces clic\b|\bpuedes\b/
    )
  })
})
