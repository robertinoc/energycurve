import { describe, expect, it } from "vitest"

import { genreTip } from "@/lib/engine/genre-tips"

describe("genreTip", () => {
  it("names the genre and its BPM pocket", () => {
    const tip = genreTip("bounce", "main", [])
    expect(tip).toContain("Bounce")
    expect(tip).toContain("BPM")
  })

  it("flags tracks below the genre's BPM pocket", () => {
    // bpm=1 is below any genre's low anchor → counted as an outlier.
    const tip = genreTip("bounce", "main", [{ bpm: 1 }, { bpm: null }])
    expect(tip).toContain("below the genre's pocket")
    expect(tip).toContain("1 track")
  })

  it("omits the outlier sentence when everything is in the pocket", () => {
    const tip = genreTip("bounce", "main", [{ bpm: 150 }])
    expect(tip).not.toContain("below the genre's pocket")
  })

  it("works without a context", () => {
    expect(() => genreTip("techno", null, [])).not.toThrow()
    expect(genreTip("techno", null, [])).toContain("Techno")
  })
})
