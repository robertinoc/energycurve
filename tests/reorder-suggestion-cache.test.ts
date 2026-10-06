import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ResolvedTrackEnergy } from "@/types/analysis"

/**
 * The remembered suggested order (lote 18, H-23).
 *
 * The test that matters is the one about staleness: a suggestion for a set
 * that has since been edited is worse than a slow one. Every input that can
 * change the answer has to change the key, and the rest is about not letting
 * one request's copy leak into the next.
 */

const real = await vi.importActual<typeof import("@/lib/engine/recommendations")>(
  "@/lib/engine/recommendations"
)
const suggestReorder = vi.fn(real.suggestReorder)

vi.mock("@/lib/engine/recommendations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/engine/recommendations")>()),
  suggestReorder: (...args: Parameters<typeof real.suggestReorder>) => suggestReorder(...args),
}))

const {
  clearSuggestionCache,
  suggestReorderRemembered,
  suggestionCacheSize,
  SUGGESTION_CACHE_LIMIT,
} = await import("@/services/reorder-suggestion-cache")

/** A set the optimizer has something to say about: energy that falls, then climbs. */
function set(scores = [8, 3, 9, 2, 7, 4, 6, 5]): ResolvedTrackEnergy[] {
  return scores.map((score, index) => ({
    trackId: `t-${index}`,
    position: index + 1,
    score,
    source: "bpm",
    bpm: 120 + index,
    camelot: null,
  })) as ResolvedTrackEnergy[]
}

const call = (energies = set(), overrides: Partial<{ locale: "en" | "es"; score: number; shape: null | "after_hours" }> = {}) =>
  suggestReorderRemembered(
    energies,
    "techno",
    "main",
    overrides.score ?? 0,
    overrides.locale ?? "en",
    (overrides.shape ?? null) as never
  )

beforeEach(() => {
  clearSuggestionCache()
  suggestReorder.mockClear()
})

describe("the same set is computed once", () => {
  it("answers a repeat from memory, with the same answer", () => {
    const first = call()
    const second = call()

    expect(suggestReorder).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it("gives the same answer the engine gives", () => {
    expect(call()).toEqual(real.suggestReorder(set(), "techno", "main", 0, "en", null))
  })
})

describe("an edited set is never answered from memory", () => {
  it("recomputes when one track's energy changes", () => {
    call()
    call(set([8, 3, 9, 2, 7, 4, 6, 6]))

    expect(suggestReorder).toHaveBeenCalledTimes(2)
  })

  it("recomputes when the order changes", () => {
    call()
    call(set().reverse())

    expect(suggestReorder).toHaveBeenCalledTimes(2)
  })

  it("recomputes when a track gains a key", () => {
    call()
    const keyed = set()
    keyed[0] = { ...keyed[0], camelot: "8A" }
    call(keyed)

    expect(suggestReorder).toHaveBeenCalledTimes(2)
  })

  it("recomputes for another language, another score or another shape", () => {
    call()
    call(set(), { locale: "es" })
    call(set(), { score: 1 })
    call(set(), { shape: "after_hours" })

    expect(suggestReorder).toHaveBeenCalledTimes(4)
  })
})

describe("one request cannot touch the next", () => {
  it("hands out copies", () => {
    const first = call()
    expect(first, "this set has to produce a suggestion for the test to mean anything").not.toBeNull()
    first!.suggestedOrder.reverse()
    first!.rationale = "mutated"

    const second = call()

    expect(second!.rationale).not.toBe("mutated")
    expect(second!.suggestedOrder).toEqual(real.suggestReorder(set(), "techno", "main", 0, "en", null)!.suggestedOrder)
  })
})

describe("memory stays bounded", () => {
  it("keeps at most the limit, dropping the least recently used", () => {
    // The engine itself is not what this measures, and running it a few
    // hundred times would only make the test slow.
    suggestReorder.mockImplementation(() => null)

    for (let i = 0; i < SUGGESTION_CACHE_LIMIT + 10; i += 1) {
      call(set(), { score: i })
    }

    expect(suggestionCacheSize()).toBe(SUGGESTION_CACHE_LIMIT)

    suggestReorder.mockClear()
    call(set(), { score: 0 })
    expect(suggestReorder, "the oldest entry was evicted").toHaveBeenCalledTimes(1)
    suggestReorder.mockImplementation(real.suggestReorder)
  })
})
