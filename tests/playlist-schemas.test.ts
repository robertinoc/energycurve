import { describe, expect, it } from "vitest"

import {
  createPlaylistSchema,
  createTrackInputSchema,
  createTracklistImportSchema,
} from "@/lib/playlists/schemas"

describe("createPlaylistSchema", () => {
  const schema = createPlaylistSchema("en")

  it("accepts a valid playlist and trims the name", () => {
    const result = schema.parse({
      name: "  Warehouse   opening set  ",
      genre: "house",
      context: "opening",
    })

    expect(result).toEqual({
      name: "Warehouse opening set",
      genre: "house",
      context: "opening",
    })
  })

  it("rejects an empty name after sanitization", () => {
    const result = schema.safeParse({
      name: "   <> ",
      genre: "house",
      context: "main",
    })

    expect(result.success).toBe(false)
  })

  it("rejects names above the max length", () => {
    const result = schema.safeParse({
      name: "x".repeat(121),
      genre: "techno",
      context: "main",
    })

    expect(result.success).toBe(false)
  })

  it("rejects unknown genres and contexts", () => {
    expect(
      schema.safeParse({ name: "Set", genre: "reggaeton", context: "main" })
        .success
    ).toBe(false)
    expect(
      schema.safeParse({ name: "Set", genre: "house", context: "afterhours" })
        .success
    ).toBe(false)
  })
})

describe("createTrackInputSchema", () => {
  const schema = createTrackInputSchema("en")

  it("accepts a full track and normalizes numbers", () => {
    const result = schema.parse({
      artist: " Bicep ",
      name: "  Glue ",
      bpm: "128,5",
      energyScore: "7.25",
    })

    expect(result).toEqual({
      artist: "Bicep",
      name: "Glue",
      bpm: 128.5,
      energyScore: 7.3,
      // Rich tag fields default to null when absent (V3: editable key/genre/comment).
      musicalKey: null,
      genre: null,
      comment: null,
    })
  })

  it("accepts the rich tag fields and nulls an over-long key", () => {
    const result = schema.parse({
      artist: "Bicep",
      name: "Glue",
      bpm: "128",
      energyScore: "",
      musicalKey: " 8A ",
      genre: "Melodic Techno",
      comment: "Energy 7",
    })

    expect(result).toMatchObject({
      musicalKey: "8A",
      genre: "Melodic Techno",
      comment: "Energy 7",
    })

    expect(
      schema.parse({
        artist: "A",
        name: "B",
        musicalKey: "definitely-not-a-key",
      }).musicalKey
    ).toBeNull()
  })

  it("treats empty optional fields as null", () => {
    const result = schema.parse({
      artist: "Bicep",
      name: "Glue",
      bpm: "",
      energyScore: "",
    })

    expect(result.bpm).toBeNull()
    expect(result.energyScore).toBeNull()
  })

  it("rejects BPM outside 60-220", () => {
    expect(
      schema.safeParse({ artist: "A", name: "B", bpm: "40", energyScore: "" })
        .success
    ).toBe(false)
    expect(
      schema.safeParse({ artist: "A", name: "B", bpm: "230", energyScore: "" })
        .success
    ).toBe(false)
  })

  it("rejects energy score outside 1-10", () => {
    expect(
      schema.safeParse({ artist: "A", name: "B", bpm: "", energyScore: "0.5" })
        .success
    ).toBe(false)
    expect(
      schema.safeParse({ artist: "A", name: "B", bpm: "", energyScore: "11" })
        .success
    ).toBe(false)
  })

  it("rejects non-numeric bpm input", () => {
    expect(
      schema.safeParse({
        artist: "A",
        name: "B",
        bpm: "fast",
        energyScore: "",
      }).success
    ).toBe(false)
  })

  it("requires artist and track name", () => {
    expect(
      schema.safeParse({ artist: "", name: "B", bpm: "", energyScore: "" })
        .success
    ).toBe(false)
    expect(
      schema.safeParse({ artist: "A", name: "  ", bpm: "", energyScore: "" })
        .success
    ).toBe(false)
  })
})

describe("createTracklistImportSchema", () => {
  const schema = createTracklistImportSchema("en")

  it("accepts text with a known format", () => {
    const result = schema.parse({
      text: "Bicep - Glue",
      format: "artist-track",
    })

    expect(result.format).toBe("artist-track")
  })

  it("rejects empty text and unknown formats", () => {
    expect(
      schema.safeParse({ text: "", format: "artist-track" }).success
    ).toBe(false)
    expect(
      schema.safeParse({ text: "x - y", format: "csv" }).success
    ).toBe(false)
  })
})
