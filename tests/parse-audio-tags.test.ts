import { describe, expect, it } from "vitest"

import {
  audioTagsToImportedTrack,
  isAudioFileName,
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
