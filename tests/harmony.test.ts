import { describe, expect, it } from "vitest"

import { assessHarmony, keyCoverage } from "@/lib/engine/harmony"
import {
  harmonicTier,
  musicalKeyValueToOpenKey,
  parseCamelot,
} from "@/lib/music/camelot"

describe("musicalKeyValueToOpenKey", () => {
  it("maps Traktor's numeric MUSICAL_KEY to Open Key (verified on real files)", () => {
    // Cross-checked against 24 real tracks carrying both notations (B17).
    expect(musicalKeyValueToOpenKey(22)).toBe("8m") // Bbm
    expect(musicalKeyValueToOpenKey(4)).toBe("5d") // E major
    expect(musicalKeyValueToOpenKey(23)).toBe("3m") // Bm
    expect(musicalKeyValueToOpenKey(0)).toBe("1d") // C major
    expect(musicalKeyValueToOpenKey(12)).toBe("10m") // Cm
    expect(musicalKeyValueToOpenKey(10)).toBe("11d") // Bb major
    expect(musicalKeyValueToOpenKey(19)).toBe("11m") // Gm
  })

  it("rejects out-of-range values", () => {
    expect(musicalKeyValueToOpenKey(-1)).toBeNull()
    expect(musicalKeyValueToOpenKey(24)).toBeNull()
    expect(musicalKeyValueToOpenKey(3.5)).toBeNull()
  })
})

describe("parseCamelot", () => {
  it("parses valid codes and rejects the rest", () => {
    expect(parseCamelot("8A")).toEqual({ num: 8, ring: "A" })
    expect(parseCamelot("12b")).toEqual({ num: 12, ring: "B" })
    expect(parseCamelot("13A")).toBeNull()
    expect(parseCamelot("8m")).toBeNull()
    expect(parseCamelot(null)).toBeNull()
  })
})

describe("harmonicTier", () => {
  it("classifies the classic Camelot moves", () => {
    expect(harmonicTier("8A", "8A")).toBe("perfect")
    expect(harmonicTier("8A", "9A")).toBe("smooth")
    expect(harmonicTier("8A", "7A")).toBe("smooth")
    expect(harmonicTier("12A", "1A")).toBe("smooth") // wheel wrap
    expect(harmonicTier("8A", "8B")).toBe("smooth") // relative major/minor
    expect(harmonicTier("8A", "10A")).toBe("boost") // +2 energy jump
    expect(harmonicTier("8A", "3B")).toBe("clash")
    expect(harmonicTier("8A", "9B")).toBe("clash") // diagonal is not smooth
  })

  it("works across notations (Open Key / musical keys convert first)", () => {
    // Open Key 8m = Bbm = Camelot 3A; 9m = Fm = 4A → adjacent, smooth.
    expect(harmonicTier("8m", "9m")).toBe("smooth")
    // Musical "Am" = 8A vs Camelot "8A" — same key.
    expect(harmonicTier("Am", "8A")).toBe("perfect")
  })

  it("returns unknown when a key is missing or unparseable", () => {
    expect(harmonicTier(null, "8A")).toBe("unknown")
    expect(harmonicTier("8A", "nonsense")).toBe("unknown")
  })
})

describe("assessHarmony", () => {
  it("counts tiers and computes the ratio over known transitions", () => {
    // 8A→9A smooth, 9A→9B smooth(relative), 9B→? unknown, ?→3B unknown,
    // 3B→10B clash... wait 3B→10B distance 5 → clash.
    const result = assessHarmony(["8A", "9A", "9B", null, "3B", "10B"])

    expect(result.knownTransitions).toBe(3)
    expect(result.harmonicCount).toBe(2)
    expect(result.clashCount).toBe(1)
    expect(result.ratio).toBeCloseTo(1 - 1 / 3)
  })

  it("is neutral (ratio 1) when nothing is known", () => {
    expect(assessHarmony([null, null, null]).ratio).toBe(1)
  })

  it("keyCoverage reflects the share of judgeable transitions", () => {
    expect(keyCoverage(["8A", "9A", null, "3B"])).toBeCloseTo(1 / 3)
    expect(keyCoverage(["8A", "9A", "10A"])).toBe(1)
    expect(keyCoverage(["8A"])).toBe(0)
  })
})
