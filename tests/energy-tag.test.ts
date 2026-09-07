import { describe, expect, it } from "vitest"

import {
  extractEnergyValue,
  isEnergyTagField,
  readEnergyTag,
} from "@/lib/playlists/energy-tag"

describe("extractEnergyValue", () => {
  // The three forms the alpha user named by hand. All three read as "no
  // energy" before this: the pattern only matched a number AFTER the word.
  it.each([
    ["01 Energy", 1],
    ["1 Energy", 1],
    ["1.0 Energy", 1],
    ["7 Energy", 7],
    ["10 energy", 10],
  ])("reads the value-first forms: %s", (input, expected) => {
    expect(extractEnergyValue(input)).toBe(expected)
  })

  it.each([
    ["Energy 7", 7],
    ["energy 7", 7],
    ["Energy: 7", 7],
    ["Energy=7", 7],
    ["Energy - 7", 7],
    ["Energy 7/10", 7],
    ["Energy 10", 10],
    ["Energy 7.0", 7],
    ["Energy 7.5", 8],
    ["EnergyLevel 7", 7],
    ["Energy Level 7", 7],
    ["8A - Energy 7", 7],
    ["Energy 7 - peak hour", 7],
    ["peak hour Energy 7", 7],
  ])("reads the word-first forms: %s", (input, expected) => {
    expect(extractEnergyValue(input)).toBe(expected)
  })

  it.each(["E7", "e7", "E 7", "E:7"])(
    "reads the shorthand when it is the whole field: %s",
    (input) => {
      expect(extractEnergyValue(input)).toBe(7)
    }
  )

  it("does not read the shorthand out of the middle of something", () => {
    // Catalog numbers and artist names look like this.
    expect(extractEnergyValue("E-1201 remix")).toBeNull()
    expect(extractEnergyValue("Drumcode E7 promo")).toBeNull()
  })

  it("refuses a bare number unless the field is unambiguous", () => {
    expect(extractEnergyValue("7")).toBeNull()
    expect(extractEnergyValue("7", { allowBareNumber: true })).toBe(7)
    expect(extractEnergyValue("07", { allowBareNumber: true })).toBe(7)
    expect(extractEnergyValue("7.0", { allowBareNumber: true })).toBe(7)
    // Still only a 1-10 scale, even where bare numbers are allowed.
    expect(extractEnergyValue("128", { allowBareNumber: true })).toBeNull()
    expect(extractEnergyValue("2024", { allowBareNumber: true })).toBeNull()
  })

  it.each([
    "",
    "   ",
    "energy",
    "high energy banger",
    "full of energy",
    "1st press",
    "128 BPM",
    "Energy 0",
    "Energy 11",
    "Energy 99",
  ])("rejects: %s", (input) => {
    expect(extractEnergyValue(input)).toBeNull()
  })

  it("handles null and undefined", () => {
    expect(extractEnergyValue(null)).toBeNull()
    expect(extractEnergyValue(undefined)).toBeNull()
  })
})

describe("readEnergyTag", () => {
  it("reports which field the value came from", () => {
    expect(readEnergyTag({ comment: "8A - Energy 6" })).toEqual({
      value: 6,
      field: "comment",
    })
    expect(readEnergyTag({ grouping: "Energy 9" })).toEqual({
      value: 9,
      field: "grouping",
    })
    expect(readEnergyTag({ lyrics: "Energy 4" })).toEqual({
      value: 4,
      field: "lyrics",
    })
  })

  it("prefers a dedicated ENERGY frame over everything else", () => {
    expect(
      readEnergyTag({ energy_frame: "8", comment: "Energy 3" })
    ).toEqual({ value: 8, field: "energy_frame" })
  })

  it("reads a bare number from a dedicated frame", () => {
    expect(readEnergyTag({ energy_frame: "7" })).toEqual({
      value: 7,
      field: "energy_frame",
    })
  })

  it("reads a bare number from a field where it can't mean anything else", () => {
    // Nobody's producer is "6".
    expect(readEnergyTag({ producer: "6" })).toEqual({
      value: 6,
      field: "producer",
    })
    expect(readEnergyTag({ composer: "6" })).toEqual({
      value: 6,
      field: "composer",
    })
  })

  it("never reads a bare number from a comment, grouping or label", () => {
    expect(readEnergyTag({ comment: "7" })).toBeNull()
    expect(readEnergyTag({ comment2: "7" })).toBeNull()
    expect(readEnergyTag({ grouping: "7" })).toBeNull()
    expect(readEnergyTag({ label: "7" })).toBeNull()
  })

  it("lets an explicit form anywhere beat a bare number anywhere", () => {
    // A written "Energy 8" is a statement; a producer field of "3" is at best
    // an inference, and it must not win.
    expect(readEnergyTag({ comment: "Energy 8", producer: "3" })).toEqual({
      value: 8,
      field: "comment",
    })
  })

  it("returns null when nothing carries a value", () => {
    expect(readEnergyTag({})).toBeNull()
    expect(
      readEnergyTag({ comment: "peak hour", grouping: "opener", label: "Drumcode" })
    ).toBeNull()
  })
})

describe("isEnergyTagField", () => {
  it("accepts the known fields only", () => {
    expect(isEnergyTagField("comment")).toBe(true)
    expect(isEnergyTagField("energy_frame")).toBe(true)
    expect(isEnergyTagField("bpm")).toBe(false)
    expect(isEnergyTagField(null)).toBe(false)
  })
})
