import { describe, expect, it } from "vitest"

import { CURVE_SHAPES } from "@/lib/product/strategy"
import {
  createPlaylistSchema,
  createTrackInputSchema,
  createTracklistImportSchema,
  updatePlaylistDetailsSchema,
  PLAYLIST_VENUE_MAX_LENGTH,
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

describe("updatePlaylistDetailsSchema — target shape", () => {
  const schema = updatePlaylistDetailsSchema("en")
  const base = { playlistId: crypto.randomUUID(), name: "Warm-up", description: "" }

  it("accepts every shape the engine knows", () => {
    for (const shape of CURVE_SHAPES) {
      expect(schema.parse({ ...base, targetShape: shape }).targetShape).toBe(shape)
    }
  })

  it("reads empty as the derived target", () => {
    expect(schema.parse({ ...base, targetShape: "" }).targetShape).toBeNull()
  })

  it("drops an unrecognised shape instead of failing the save", () => {
    // A junk value can only come from a hand-built POST, and it must not stop the
    // user renaming their set.
    expect(schema.parse({ ...base, targetShape: "peak_tim" }).targetShape).toBeNull()
  })

  it("leaves the stored value alone when the form didn't carry the field", () => {
    // A browser holding the previous JS bundle submits without these inputs. The
    // fields must come back undefined so the service skips them, rather than null
    // — which would clear a shape and a slot the user never touched.
    const result = schema.parse(base)

    expect(result.targetShape).toBeUndefined()
    expect(result.slotStart).toBeUndefined()
    expect(result.slotEnd).toBeUndefined()
  })
})

describe("updatePlaylistDetailsSchema — curve templates", () => {
  const schema = updatePlaylistDetailsSchema("en")
  const base = { playlistId: crypto.randomUUID(), name: "Warm-up", description: "" }
  const templateId = "9f8b7c6d-1234-4a5b-8c9d-0e1f2a3b4c5d"

  it("splits one select value into a shape or a template, never both", () => {
    // The form has a single control; the two destinations are resolved here so
    // a set can't end up aiming at a built-in and a saved shape at once.
    const template = schema.parse({
      ...base,
      targetShape: `template:${templateId}`,
      targetTemplateId: `template:${templateId}`,
    })

    expect(template.targetShape).toBeNull()
    expect(template.targetTemplateId).toBe(templateId)

    const builtIn = schema.parse({
      ...base,
      targetShape: "after_hours",
      targetTemplateId: "after_hours",
    })

    expect(builtIn.targetShape).toBe("after_hours")
    expect(builtIn.targetTemplateId).toBeNull()
  })

  it("clears both when the derived target is chosen", () => {
    const result = schema.parse({
      ...base,
      targetShape: "",
      targetTemplateId: "",
    })

    expect(result.targetShape).toBeNull()
    expect(result.targetTemplateId).toBeNull()
  })
})

describe("venue on the details form", () => {
  const base = { name: "Set", description: "" }

  it("stores a trimmed venue", () => {
    const result = updatePlaylistDetailsSchema("en").safeParse({
      ...base,
      venue: "  Club X  ",
    })

    expect(result.success).toBe(true)
    expect(result.data?.venue).toBe("Club X")
  })

  it("turns an empty venue into null, not an empty string", () => {
    // The residency check treats an unknown venue as "takes no part". An empty
    // string would read as a venue named nothing, and would match other blanks.
    for (const value of ["", "   "]) {
      const result = updatePlaylistDetailsSchema("en").safeParse({
        ...base,
        venue: value,
      })
      expect(result.data?.venue).toBeNull()
    }
  })

  it("leaves the stored venue alone when the field is absent", () => {
    // Same contract as the slot fields: a user on a stale JS bundle submits a form
    // without this input, and a required field would silently wipe a venue they
    // never touched.
    const result = updatePlaylistDetailsSchema("en").safeParse(base)

    expect(result.success).toBe(true)
    expect(result.data).not.toHaveProperty("venue")
  })

  it("truncates rather than rejecting an over-long venue", () => {
    const result = updatePlaylistDetailsSchema("en").safeParse({
      ...base,
      venue: "C".repeat(200),
    })

    expect(result.success).toBe(true)
    expect(result.data?.venue?.length).toBe(PLAYLIST_VENUE_MAX_LENGTH)
  })
})
