import { describe, expect, it } from "vitest"

import {
  AUDIO_IMPORT_MAX_TRACKS,
  createAudioImportSchema,
} from "@/lib/playlists/schemas"

const schema = createAudioImportSchema("en")

function track(overrides: Record<string, unknown> = {}) {
  return {
    artist: "Mira Phase",
    name: "Peak Freq",
    bpm: 130,
    key: "9A",
    genre: "Hard Techno",
    energy: 7,
    comment: "9A - Energy 7",
    durationSeconds: 317,
    sourceUri: "Promos/peak.mp3",
    ...overrides,
  }
}

describe("createAudioImportSchema", () => {
  it("passes a clean payload through unchanged", () => {
    const result = schema.safeParse({
      name: "Warehouse Set",
      context: "main",
      genre: "",
      tracks: [track()],
    })

    expect(result.success).toBe(true)
    expect(result.data?.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      bpm: 130,
      key: "9A",
      energy: 7,
      durationSeconds: 317,
      sourceUri: "Promos/peak.mp3",
    })
  })

  it("coerces out-of-range numbers to null instead of rejecting", () => {
    const result = schema.safeParse({
      name: "",
      context: "main",
      genre: "",
      tracks: [
        track({ bpm: 999, energy: 11, durationSeconds: -5 }),
        track({ bpm: "not a number", energy: null }),
      ],
    })

    expect(result.success).toBe(true)
    expect(result.data?.tracks[0]).toMatchObject({
      bpm: null,
      energy: null,
      durationSeconds: null,
    })
    expect(result.data?.tracks[1]).toMatchObject({ bpm: null, energy: null })
  })

  it("sanitizes and truncates hostile strings instead of rejecting", () => {
    const result = schema.safeParse({
      name: "<script>alert(1)</script>",
      context: "main",
      genre: "",
      tracks: [
        track({
          artist: "A".repeat(500),
          name: "<b>X</b>",
          key: "waaaay-too-long-for-a-key",
          comment: "line1\u0000line2",
        }),
      ],
    })

    expect(result.success).toBe(true)
    expect(result.data?.name).not.toContain("<")
    expect(result.data?.tracks[0].artist).toHaveLength(200)
    expect(result.data?.tracks[0].name).toBe("bX/b")
    expect(result.data?.tracks[0].key).toBeNull() // over 12 chars → null
    // Control character replaced with a space, whitespace collapsed.
    expect(result.data?.tracks[0].comment).toBe("line1 line2")
  })

  it("rejects an empty tracks array", () => {
    const result = schema.safeParse({
      name: "",
      context: "main",
      genre: "",
      tracks: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects more tracks than the cap", () => {
    const result = schema.safeParse({
      name: "",
      context: "main",
      genre: "",
      tracks: Array.from({ length: AUDIO_IMPORT_MAX_TRACKS + 1 }, () => track()),
    })
    expect(result.success).toBe(false)
  })

  it("keeps < > in sourceUri paths but strips control characters", () => {
    const result = schema.safeParse({
      name: "",
      context: "main",
      genre: "custom:some-id",
      tracks: [track({ sourceUri: "Sets/<live>take.mp3" })],
    })

    expect(result.success).toBe(true)
    expect(result.data?.tracks[0].sourceUri).toBe("Sets/<live>take.mp3")
  })
})
