import { describe, expect, it } from "vitest"

import {
  createPlaylistSchema,
  createTrackInputSchema,
  createTracklistImportSchema,
  updatePlaylistDetailsSchema,
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

describe("updatePlaylistDetailsSchema — slot", () => {
  const schema = updatePlaylistDetailsSchema("en")

  const base = { playlistId: crypto.randomUUID(), name: "Warm-up", description: "" }

  it("turns two clock strings into minutes from midnight", () => {
    const result = schema.parse({ ...base, slotStart: "01:00", slotEnd: "03:00" })

    expect(result.slotStart).toBe(60)
    expect(result.slotEnd).toBe(180)
  })

  it("reads two empty inputs as no slot", () => {
    // The default state of the form, and the way a DJ clears a slot they no
    // longer want — neither can be an error.
    const result = schema.parse({ ...base, slotStart: "", slotEnd: "" })

    expect(result.slotStart).toBeNull()
    expect(result.slotEnd).toBeNull()
  })

  it("accepts a slot that crosses midnight", () => {
    const result = schema.parse({ ...base, slotStart: "23:00", slotEnd: "01:00" })

    expect(result.slotStart).toBe(1380)
    expect(result.slotEnd).toBe(60)
  })

  it("rejects half a slot, on the field the user would fix", () => {
    const result = schema.safeParse({ ...base, slotStart: "01:00", slotEnd: "" })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["slotEnd"])
  })

  it("rejects a zero-length slot", () => {
    const result = schema.safeParse({ ...base, slotStart: "01:00", slotEnd: "01:00" })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["slotEnd"])
  })

  it("treats an unparseable time as no time rather than failing the whole save", () => {
    // <input type="time"> can't produce this, but a hand-built POST can, and a
    // rename shouldn't die because of a junk clock value.
    const result = schema.parse({ ...base, slotStart: "25:99", slotEnd: "" })

    expect(result.slotStart).toBeNull()
  })
})
