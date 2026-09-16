import { describe, expect, it } from "vitest"

import { rateTransition, rateTransitions } from "@/lib/engine/transitions"

const track = (
  position: number,
  camelot: string | null,
  energy: number,
  bpm: number | null = null
) => ({
  id: `t${position}`,
  position,
  artist: `Artist ${position}`,
  name: `Track ${position}`,
  camelot,
  energy,
  bpm,
})

describe("rateTransition", () => {
  it("calls a same-key, small-step mix good", () => {
    expect(rateTransition("perfect", 0.5, "house").verdict).toBe("good")
  })

  it("calls a clash rough whatever the energy does", () => {
    // Two keys fighting is audible in a way a slightly large step isn't.
    expect(rateTransition("clash", 0, "house").verdict).toBe("rough")
    expect(rateTransition("clash", 0.1, "house").verdict).toBe("rough")
  })

  it("downgrades by one notch for an oversized step, rather than condemning it", () => {
    // DJs make big steps deliberately. Calling every one a mistake is how a
    // tool gets ignored.
    expect(rateTransition("perfect", 5, "house").verdict).toBe("workable")
    expect(rateTransition("boost", 5, "house").verdict).toBe("rough")
  })

  it("respects each genre's own comfort", () => {
    // Δ3 is fine in melodic techno (tolerance 3) and past comfort in trance (1.5).
    expect(rateTransition("perfect", 3, "melodic-techno").verdict).toBe("good")
    expect(rateTransition("perfect", 3, "trance").verdict).toBe("workable")
  })

  it("treats rises and drops by their own tolerances", () => {
    // organic-house tolerates a 2.0 drop but only a 1.5 rise.
    expect(rateTransition("perfect", -2, "organic-house").excess).toBe(0)
    expect(rateTransition("perfect", 2, "organic-house").excess).toBeGreaterThan(0)
  })

  it("never calls an unknown key rough", () => {
    // Half of most libraries have no key. A warning there would be a guess.
    expect(rateTransition("unknown", 0, "house").verdict).toBe("good")
    expect(rateTransition("unknown", 9, "house").verdict).toBe("workable")
  })
})

describe("rateTransitions", () => {
  it("rates every mix in the set, and only those", () => {
    const rated = rateTransitions(
      [track(1, "8A", 5), track(2, "8A", 5.5), track(3, "8A", 6)],
      "house"
    )

    expect(rated).toHaveLength(2)
    expect(rated[0].fromPosition).toBe(1)
    expect(rated[1].toPosition).toBe(3)
  })

  it("suggests nothing for a mix that already works", () => {
    const rated = rateTransitions(
      [track(1, "8A", 5), track(2, "8A", 5.5)],
      "house"
    )

    expect(rated[0].verdict).toBe("good")
    expect(rated[0].betterFit).toBeNull()
  })

  it("names a track from the set that would fit a clash better", () => {
    // 8A into 2B clashes; 9A is a smooth neighbour and sits at a similar energy.
    const rated = rateTransitions(
      [track(1, "8A", 6), track(2, "2B", 6.5), track(3, "9A", 6.5)],
      "house"
    )

    expect(rated[0].verdict).toBe("rough")
    expect(rated[0].betterFit?.position).toBe(3)
  })

  it("never suggests something rated no better than what it replaces", () => {
    // Every other track clashes too, so there is nothing honest to propose.
    const rated = rateTransitions(
      [track(1, "8A", 6), track(2, "2B", 6), track(3, "3B", 6)],
      "house"
    )

    expect(rated[0].betterFit).toBeNull()
  })

  it("does not propose the track already before the transition", () => {
    // Suggesting the neighbour is suggesting to do nothing.
    const rated = rateTransitions(
      [track(1, "9A", 6), track(2, "8A", 6), track(3, "2B", 6.5)],
      "house"
    )

    expect(rated[1].betterFit?.position).not.toBe(1)
  })

  it("prefers the smallest energy step among equally good candidates", () => {
    // The shape was already scored; the fix that disturbs it least wins.
    const rated = rateTransitions(
      [
        track(1, "8A", 6),
        track(2, "2B", 6),
        track(3, "8A", 9),
        track(4, "8A", 6.2),
      ],
      "house"
    )

    expect(rated[0].betterFit?.position).toBe(4)
  })

  it("names the transition table's own level, not just a tier", () => {
    // "Energy Boost ++" and "Mood change" are different advice; the tier
    // ("boost") is the same for both, which is why the level is reported.
    // Row 8A: Energy Boost ++ is 5A (+3 semitones), Mood change is 11B (A
    // minor into A major).
    const boost = rateTransitions([track(1, "8A", 6), track(2, "5A", 6)], "house")
    const mood = rateTransitions([track(1, "8A", 6), track(2, "11B", 6)], "house")

    expect(boost[0]).toMatchObject({ level: "boost_2", option: "primary" })
    expect(mood[0]).toMatchObject({ level: "mood", direction: "none" })
  })

  it("marks the table's parenthesised second choice as secondary", () => {
    // Row 8A, Energy Boost +++: "10A, (3A)".
    const rated = rateTransitions(
      [track(1, "8A", 6), track(2, "3A", 6)],
      "house"
    )

    expect(rated[0]).toMatchObject({ level: "boost_3", option: "secondary" })
  })

  it("measures the BPM gap without touching the verdict", () => {
    // 124 → 136 is +9.7%, past the ±7% crossfade margin — but the keys are the
    // same key and the energy step is nothing, so the mix itself is good.
    const rated = rateTransitions(
      [track(1, "8A", 6, 124), track(2, "8A", 6, 136)],
      "house"
    )

    expect(rated[0].verdict).toBe("good")
    expect(rated[0].tempo?.beyondMargin).toBe(true)
    expect(rated[0].tempo?.ratio).toBeCloseTo(0.0968, 3)
  })

  it("reads a halftime mix as a matched tempo, not a 50% jump", () => {
    const rated = rateTransitions(
      [track(1, "8A", 6, 174), track(2, "8A", 6, 87)],
      "house"
    )

    expect(rated[0].tempo).toMatchObject({
      relation: "half",
      beyondMargin: false,
    })
  })

  it("has no tempo reading when a BPM is missing", () => {
    const rated = rateTransitions(
      [track(1, "8A", 6, 128), track(2, "8A", 6)],
      "house"
    )

    expect(rated[0].tempo).toBeNull()
  })

  it("prefers a candidate you can beatmatch among equally good ones", () => {
    // Both #3 and #4 fix the clash at the same energy; #4 is 30 BPM away.
    const rated = rateTransitions(
      [
        track(1, "8A", 6, 128),
        track(2, "2B", 6, 128),
        track(3, "9A", 6, 130),
        track(4, "9A", 6, 158),
      ],
      "house"
    )

    expect(rated[0].betterFit?.position).toBe(3)
  })

  it("returns nothing for a set too short to have a transition", () => {
    expect(rateTransitions([track(1, "8A", 5)], "house")).toEqual([])
    expect(rateTransitions([], "house")).toEqual([])
  })
})
