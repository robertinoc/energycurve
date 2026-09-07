import { describe, expect, it } from "vitest"

import {
  audioTagsToImportedTrack,
  isAudioFileName,
  isSystemJunkFile,
  splitFilenameToArtistTitle,
  type AudioTagSource,
} from "@/lib/playlists/parse-audio-tags"

function tags(overrides: Partial<AudioTagSource["common"]> = {}, duration?: number): AudioTagSource {
  return {
    common: { ...overrides },
    format: { duration },
  }
}

describe("isAudioFileName", () => {
  it("accepts the audio allowlist, case-insensitively", () => {
    expect(isAudioFileName("track.mp3")).toBe(true)
    expect(isAudioFileName("track.MP3")).toBe(true)
    expect(isAudioFileName("track.m4a")).toBe(true)
    expect(isAudioFileName("track.FLAC")).toBe(true)
    expect(isAudioFileName("track.aiff")).toBe(true)
  })

  it("rejects non-audio files", () => {
    expect(isAudioFileName("cover.jpg")).toBe(false)
    expect(isAudioFileName("playlist.cue")).toBe(false)
    expect(isAudioFileName("notes.txt")).toBe(false)
    expect(isAudioFileName("noextension")).toBe(false)
  })
})

describe("splitFilenameToArtistTitle", () => {
  it("splits 'Artist - Title.mp3'", () => {
    expect(splitFilenameToArtistTitle("Mira Phase - Peak Freq.mp3")).toEqual({
      artist: "Mira Phase",
      name: "Peak Freq",
    })
  })

  it("strips leading track numbering", () => {
    expect(splitFilenameToArtistTitle("01. Mira Phase - Peak Freq.mp3")).toEqual({
      artist: "Mira Phase",
      name: "Peak Freq",
    })
    expect(splitFilenameToArtistTitle("07 - Mira Phase - Peak Freq.flac")).toEqual({
      artist: "Mira Phase",
      name: "Peak Freq",
    })
  })

  it("keeps the whole stem as the title when there is no dash", () => {
    expect(splitFilenameToArtistTitle("PeakFreq_ExtendedMix.wav")).toEqual({
      artist: "",
      name: "PeakFreq_ExtendedMix",
    })
  })

  it("uses only the basename of a path", () => {
    expect(
      splitFilenameToArtistTitle("Promos/Mira Phase - Peak Freq.mp3")
    ).toEqual({ artist: "Mira Phase", name: "Peak Freq" })
  })
})

describe("audioTagsToImportedTrack", () => {
  it("maps a fully MIK-tagged file", () => {
    const track = audioTagsToImportedTrack(
      "peak.mp3",
      "Promos/peak.mp3",
      tags(
        {
          title: "Peak Freq",
          artist: "Mira Phase",
          bpm: 130,
          key: "9A",
          genre: ["Hard Techno"],
          comment: [{ text: "9A - Energy 7" }],
        },
        317.4
      )
    )

    expect(track).toEqual({
      artist: "Mira Phase",
      name: "Peak Freq",
      bpm: 130,
      key: "9A",
      genre: "Hard Techno",
      energy: 7,
      energySource: "comment",
      sourceUri: "Promos/peak.mp3",
      comment: "9A - Energy 7",
      durationSeconds: 317,
    })
  })

  it("handles the older string[] comment shape", () => {
    const track = audioTagsToImportedTrack(
      "x.mp3",
      null,
      tags({ title: "X", artist: "Y", comment: ["Energy 5"] })
    )
    expect(track.energy).toBe(5)
    expect(track.comment).toBe("Energy 5")
  })

  it("falls back to artists[0] when artist is absent", () => {
    const track = audioTagsToImportedTrack(
      "x.mp3",
      null,
      tags({ title: "X", artists: ["Solo Artist"] })
    )
    expect(track.artist).toBe("Solo Artist")
  })

  it("derives artist/title from the filename when tags are null (unreadable file)", () => {
    const track = audioTagsToImportedTrack(
      "02. Nova Relay - Intro Bloom.m4a",
      null,
      null
    )

    expect(track).toMatchObject({
      artist: "Nova Relay",
      name: "Intro Bloom",
      bpm: null,
      key: null,
      genre: null,
      energy: null,
      comment: null,
      durationSeconds: null,
      sourceUri: "02. Nova Relay - Intro Bloom.m4a",
    })
  })

  it("prefers the relative path as sourceUri, falling back to the filename", () => {
    const withPath = audioTagsToImportedTrack("a.mp3", "Sets/a.mp3", tags({}))
    const withoutPath = audioTagsToImportedTrack("a.mp3", null, tags({}))
    expect(withPath.sourceUri).toBe("Sets/a.mp3")
    expect(withoutPath.sourceUri).toBe("a.mp3")
  })

  it("parses a string BPM tag defensively", () => {
    const track = audioTagsToImportedTrack(
      "a.mp3",
      null,
      tags({ title: "A", bpm: "128,5" })
    )
    expect(track.bpm).toBe(128.5)
  })
})

describe("system junk files", () => {
  it("recognises the files an OS leaves in a folder", () => {
    for (const name of [
      ".DS_Store",
      ".ds_store",
      "Thumbs.db",
      "desktop.ini",
      ".localized",
      "._track.mp3",
      ".hidden",
    ]) {
      expect(isSystemJunkFile(name), name).toBe(true)
    }
  })

  it("looks at the basename, not the path", () => {
    // Folder picks arrive with webkitRelativePath-style names.
    expect(isSystemJunkFile("My Set/.DS_Store")).toBe(true)
    expect(isSystemJunkFile("My Set/track.mp3")).toBe(false)
  })

  it("leaves real files alone, audio or not", () => {
    // A stray PDF the DJ actually put there is worth reporting; junk isn't. So
    // this must stay false for anything a person could plausibly have chosen.
    for (const name of [
      "01 - Track.mp3",
      "cover.jpg",
      "setlist.pdf",
      "notes.txt",
      "track.with.dots.flac",
    ]) {
      expect(isSystemJunkFile(name), name).toBe(false)
    }
  })

  it("is a separate question from being audio", () => {
    // The two filters compose: junk is dropped silently, non-audio is reported.
    expect(isSystemJunkFile("cover.jpg")).toBe(false)
    expect(isAudioFileName("cover.jpg")).toBe(false)
    expect(isSystemJunkFile("._real.mp3")).toBe(true)
    expect(isAudioFileName("._real.mp3")).toBe(true)
  })
})

/**
 * Not everyone tags with Mixed In Key. The alpha user who reported this uses
 * Lexicon DJ, which can write the energy to any of several fields — and asked,
 * reasonably, which one we read. The answer used to be "the comment, in one
 * exact shape". These cover the rest of the answer.
 */
describe("audioTagsToImportedTrack — energy beyond Mixed In Key", () => {
  function energyOf(
    common: Partial<AudioTagSource["common"]>,
    native?: AudioTagSource["native"]
  ) {
    const source = tags(common, 300)
    const track = audioTagsToImportedTrack("t.mp3", null, {
      ...source,
      native,
    })
    return { energy: track.energy, from: track.energySource }
  }

  it("reads a dedicated ID3 TXXX:ENERGY frame", () => {
    expect(
      energyOf({}, { "ID3v2.4": [{ id: "TXXX:ENERGY", value: "8" }] })
    ).toEqual({ energy: 8, from: "energy_frame" })
  })

  it("reads a TXXX frame that names itself in its description", () => {
    expect(
      energyOf({}, {
        "ID3v2.3": [
          { id: "TXXX", value: { description: "EnergyLevel", text: "6" } },
        ],
      })
    ).toEqual({ energy: 6, from: "energy_frame" })
  })

  it("reads a Vorbis ENERGY comment and an iTunes atom", () => {
    expect(energyOf({}, { vorbis: [{ id: "ENERGY", value: "4" }] })).toEqual({
      energy: 4,
      from: "energy_frame",
    })
    expect(
      energyOf({}, {
        iTunes: [
          { id: "----:com.apple.iTunes:ENERGY", value: "Energy 9" },
        ],
      })
    ).toEqual({ energy: 9, from: "energy_frame" })
  })

  it("reads the grouping, lyrics and composer fields", () => {
    expect(energyOf({ grouping: "Energy 5" })).toEqual({
      energy: 5,
      from: "grouping",
    })
    expect(energyOf({ lyrics: [{ text: "Energy 3" }] })).toEqual({
      energy: 3,
      from: "lyrics",
    })
    expect(energyOf({ composer: ["Energy 2"] })).toEqual({
      energy: 2,
      from: "composer",
    })
  })

  it("takes a bare number from lyrics or composer but not from the grouping", () => {
    expect(energyOf({ lyrics: [{ text: "7" }] })).toEqual({
      energy: 7,
      from: "lyrics",
    })
    // A grouping of "7" is plausibly a group called 7.
    expect(energyOf({ grouping: "7" })).toEqual({ energy: null, from: null })
  })

  it("lets the dedicated frame win over a comment", () => {
    expect(
      energyOf(
        { comment: [{ text: "Energy 2" }] },
        { "ID3v2.4": [{ id: "TXXX:ENERGY", value: "9" }] }
      )
    ).toEqual({ energy: 9, from: "energy_frame" })
  })

  it("ignores a frame that merely mentions energy in its value", () => {
    expect(
      energyOf({}, { "ID3v2.4": [{ id: "TIT2", value: "Energy 5" }] })
    ).toEqual({ energy: null, from: null })
  })

  it("reads the value-first forms the user asked about", () => {
    for (const written of ["01 Energy", "1 Energy", "1.0 Energy"]) {
      expect(energyOf({ comment: [{ text: written }] })).toEqual({
        energy: 1,
        from: "comment",
      })
    }
  })
})
