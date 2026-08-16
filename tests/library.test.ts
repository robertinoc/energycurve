import { describe, expect, it } from "vitest"

import { buildLibrary, filterLibrary } from "@/lib/playlists/library"
import { trackKey } from "@/lib/playlists/set-comparison"

const track = (
  artist: string,
  name: string,
  playlist: string,
  extra: { bpm?: number | null; musicalKey?: string | null } = {}
) => ({
  artist,
  name,
  bpm: extra.bpm ?? null,
  musicalKey: extra.musicalKey ?? null,
  playlistId: playlist,
  playlistName: `Set ${playlist}`,
})

describe("buildLibrary", () => {
  it("collapses the same record across sets into one entry", () => {
    // Four rows, one record. That difference is the whole point of the view.
    const library = buildLibrary(
      [
        track("Trikk", "Ondas", "a"),
        track("Trikk", "Ondas (Original Mix)", "b"),
        track("Trikk", "Ondas", "c"),
      ],
      new Set()
    )

    expect(library.recordCount).toBe(1)
    expect(library.entries[0].playlistCount).toBe(3)
    expect(library.entries[0].playlistNames).toHaveLength(3)
  })

  it("counts distinct sets, not rows", () => {
    // A set that lists the same record twice must not inflate its reach.
    const library = buildLibrary(
      [track("Trikk", "Ondas", "a"), track("Trikk", "Ondas", "a")],
      new Set()
    )

    expect(library.entries[0].playlistCount).toBe(1)
  })

  it("puts the most-used records first", () => {
    const library = buildLibrary(
      [
        track("Rare", "Once", "a"),
        track("Staple", "Always", "a"),
        track("Staple", "Always", "b"),
      ],
      new Set()
    )

    expect(library.entries[0].artist).toBe("Staple")
  })

  it("fills a missing BPM from another copy of the same record", () => {
    // One import carried tags and the other didn't; a known value beats a null
    // whichever row it arrived on.
    const library = buildLibrary(
      [
        track("Trikk", "Ondas", "a"),
        track("Trikk", "Ondas", "b", { bpm: 124, musicalKey: "8A" }),
      ],
      new Set()
    )

    expect(library.entries[0].bpm).toBe(124)
    expect(library.entries[0].musicalKey).toBe("8A")
  })

  it("marks a record as played when it appears in a played set", () => {
    const played = new Set([trackKey("Trikk", "Ondas")])
    const library = buildLibrary(
      [track("Trikk", "Ondas", "a"), track("Kiasmos", "Blurred", "a")],
      played
    )

    const ondas = library.entries.find((entry) => entry.name === "Ondas")!
    const blurred = library.entries.find((entry) => entry.name === "Blurred")!

    expect(ondas.everPlayed).toBe(true)
    expect(blurred.everPlayed).toBe(false)
    expect(library.neverPlayedCount).toBe(1)
  })

  it("matches played records through the same normalisation as everything else", () => {
    // Marked played as "Ondas", sitting in a playlist as "Ondas (Original Mix)".
    // If these didn't agree, the view would accuse a DJ of never playing a track
    // they played last week.
    const library = buildLibrary(
      [track("Trikk", "Ondas (Original Mix)", "a")],
      new Set([trackKey("Trikk", "Ondas")])
    )

    expect(library.entries[0].everPlayed).toBe(true)
  })

  it("counts repeats as records in more than one set", () => {
    const library = buildLibrary(
      [
        track("A", "One", "a"),
        track("A", "One", "b"),
        track("B", "Two", "a"),
      ],
      new Set()
    )

    expect(library.repeatedCount).toBe(1)
  })

  it("handles an empty library", () => {
    const library = buildLibrary([], new Set())

    expect(library.recordCount).toBe(0)
    expect(library.repeatedCount).toBe(0)
    expect(library.neverPlayedCount).toBe(0)
  })
})

describe("filterLibrary", () => {
  const library = buildLibrary(
    [
      track("A", "Staple", "a"),
      track("A", "Staple", "b"),
      track("B", "Untouched", "a"),
    ],
    new Set([trackKey("A", "Staple")])
  )

  it("returns everything by default", () => {
    expect(filterLibrary(library.entries, "all")).toHaveLength(2)
  })

  it("narrows to records that span more than one set", () => {
    const result = filterLibrary(library.entries, "repeated")

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Staple")
  })

  it("narrows to records never marked played", () => {
    const result = filterLibrary(library.entries, "never_played")

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Untouched")
  })

  it("does not mutate the entries it was given", () => {
    const before = [...library.entries]
    filterLibrary(library.entries, "all").reverse()

    expect(library.entries).toEqual(before)
  })
})
