import { describe, expect, it } from "vitest"

import { rateTransition, rateTransitions } from "@/lib/engine/transitions"

const track = (
  position: number,
  camelot: string | null,
  energy: number
) => ({
  id: `t${position}`,
  position,
  artist: `Artist ${position}`,
  name: `Track ${position}`,
  camelot,
  energy,
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

  it("returns nothing for a set too short to have a transition", () => {
    expect(rateTransitions([track(1, "8A", 5)], "house")).toEqual([])
    expect(rateTransitions([], "house")).toEqual([])
  })
})
