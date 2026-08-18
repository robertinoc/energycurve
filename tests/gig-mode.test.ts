import { describe, expect, it } from "vitest"

import {
  bpmDelta,
  clampGigPosition,
  gigPositionKey,
  type GigTrack,
} from "@/lib/playlists/gig-mode"
import { CAPABILITIES } from "@/lib/product/capabilities"

function track(overrides: Partial<GigTrack> = {}): GigTrack {
  return {
    position: 1,
    artist: "Artist",
    name: "Track",
    bpm: 128,
    camelot: "8A",
    energy: 6,
    clockMinutes: null,
    ...overrides,
  }
}

describe("clampGigPosition", () => {
  it("passes a position that's already in range", () => {
    expect(clampGigPosition(0, 10)).toBe(0)
    expect(clampGigPosition(5, 10)).toBe(5)
    expect(clampGigPosition(9, 10)).toBe(9)
  })

  it("pulls a position past the end back to the last track", () => {
    expect(clampGigPosition(10, 10)).toBe(9)
    expect(clampGigPosition(999, 10)).toBe(9)
  })

  it("collapses a position before the start to the opener", () => {
    expect(clampGigPosition(-1, 10)).toBe(0)
    expect(clampGigPosition(-999, 10)).toBe(0)
  })

  it("survives a stored value written against a longer set", () => {
    // The real failure this guards: a previous session bookmarked track 14, then
    // the DJ deleted tracks. Reading it back must not index past the array.
    expect(clampGigPosition("13", 8)).toBe(7)
  })

  it("reads the numeric strings localStorage actually returns", () => {
    expect(clampGigPosition("4", 10)).toBe(4)
    expect(clampGigPosition("0", 10)).toBe(0)
  })

  it("falls back to the opener on junk rather than to the closer", () => {
    // Landing on the first track is recoverable in a booth; landing on the last
    // one looks like the set already ended.
    for (const junk of ["", "abc", null, undefined, NaN, Infinity, {}]) {
      expect(clampGigPosition(junk, 10)).toBe(0)
    }
  })

  it("truncates a fractional position instead of rounding up past the end", () => {
    expect(clampGigPosition(3.9, 10)).toBe(3)
    expect(clampGigPosition(9.9, 10)).toBe(9)
  })

  it("returns 0 for an empty set instead of -1", () => {
    // -1 would be a valid-looking index that reads undefined out of the array.
    expect(clampGigPosition(0, 0)).toBe(0)
    expect(clampGigPosition(5, 0)).toBe(0)
  })
})

describe("gigPositionKey", () => {
  it("scopes the bookmark to one playlist", () => {
    expect(gigPositionKey("abc")).not.toBe(gigPositionKey("def"))
    expect(gigPositionKey("abc")).toContain("abc")
  })
})

describe("bpmDelta", () => {
  it("reports the signed tempo move into the next track", () => {
    expect(bpmDelta(track({ bpm: 126 }), track({ bpm: 130 }))).toBe(4)
    expect(bpmDelta(track({ bpm: 130 }), track({ bpm: 126 }))).toBe(-4)
    expect(bpmDelta(track({ bpm: 128 }), track({ bpm: 128 }))).toBe(0)
  })

  it("keeps one decimal, because tagged BPMs have them", () => {
    expect(bpmDelta(track({ bpm: 127.5 }), track({ bpm: 128.2 }))).toBe(0.7)
  })

  it("returns null when either side has no tempo", () => {
    expect(bpmDelta(track({ bpm: null }), track({ bpm: 128 }))).toBeNull()
    expect(bpmDelta(track({ bpm: 128 }), track({ bpm: null }))).toBeNull()
    expect(bpmDelta(track({ bpm: 128 }), undefined)).toBeNull()
    expect(bpmDelta(undefined, track({ bpm: 128 }))).toBeNull()
  })

  it("treats a zero BPM as missing rather than as a real tempo", () => {
    // 0 shows up in badly written tags; a "-128" delta would be nonsense.
    expect(bpmDelta(track({ bpm: 0 }), track({ bpm: 128 }))).toBeNull()
  })
})

describe("gig_mode capability", () => {
  it("is shipped and sold as PRO+", () => {
    // The pricing page and the plan matrix both promise this now, so a revert of
    // the registry entry alone should fail here rather than in a booth.
    expect(CAPABILITIES.gig_mode.status).toBe("shipped")
    expect(CAPABILITIES.gig_mode.minPlan).toBe("pro_plus")
  })
})
