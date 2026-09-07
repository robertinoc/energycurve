import { describe, expect, it } from "vitest"

import {
  camelotToMusical,
  camelotToOpenKey,
  detectKeyNotation,
  formatKey,
  isCamelot,
  isKeyNotation,
  KEY_NOTATIONS,
  keySortIndex,
  musicalKeyToTraktorValue,
  musicalKeyValueToOpenKey,
  toCamelot,
} from "@/lib/music/camelot"

describe("toCamelot", () => {
  it("maps minor keys to the A ring", () => {
    expect(toCamelot("Am")).toBe("8A")
    expect(toCamelot("Bm")).toBe("10A")
    expect(toCamelot("F#m")).toBe("11A")
    expect(toCamelot("Bbm")).toBe("3A")
    expect(toCamelot("Ebm")).toBe("2A")
    expect(toCamelot("Abm")).toBe("1A")
  })

  it("maps major keys to the B ring", () => {
    expect(toCamelot("C")).toBe("8B")
    expect(toCamelot("G")).toBe("9B")
    expect(toCamelot("E")).toBe("12B")
    expect(toCamelot("Bb")).toBe("6B")
  })

  it("handles enharmonic spellings", () => {
    expect(toCamelot("G#m")).toBe("1A")
    expect(toCamelot("Gbm")).toBe("11A")
    expect(toCamelot("Db")).toBe("3B")
  })

  it("normalizes verbose notations", () => {
    expect(toCamelot("A minor")).toBe("8A")
    expect(toCamelot("A maj")).toBe("11B")
    expect(toCamelot(" bm ")).toBe("10A")
  })

  it("passes through values already in Camelot notation", () => {
    expect(toCamelot("8A")).toBe("8A")
    expect(toCamelot("12b")).toBe("12B")
  })

  it("converts Traktor Open Key notation (B16)", () => {
    // Same wheel rotated by 7: 1d = C major = 8B, 1m = A minor = 8A.
    expect(toCamelot("1d")).toBe("8B")
    expect(toCamelot("1m")).toBe("8A")
    expect(toCamelot("2d")).toBe("9B")
    expect(toCamelot("6d")).toBe("1B")
    expect(toCamelot("6m")).toBe("1A")
    expect(toCamelot("7m")).toBe("2A")
    expect(toCamelot("9d")).toBe("4B")
    expect(toCamelot("11m")).toBe("6A")
    expect(toCamelot("12m")).toBe("7A")
    expect(toCamelot("12d")).toBe("7B")
  })

  it("agrees with the musical lookup through Open Key", () => {
    // Open Key 11m is G minor; the musical table maps Gm → 6A.
    expect(toCamelot("11m")).toBe(toCamelot("Gm"))
    // Open Key 4d is A major; the musical table maps A → 11B.
    expect(toCamelot("4d")).toBe(toCamelot("A"))
  })

  it("keeps rejecting out-of-range Open Key values", () => {
    expect(toCamelot("13m")).toBeNull()
    expect(toCamelot("0d")).toBeNull()
  })

  it("returns null for empty or unrecognized keys", () => {
    expect(toCamelot(null)).toBeNull()
    expect(toCamelot(undefined)).toBeNull()
    expect(toCamelot("")).toBeNull()
    expect(toCamelot("nonsense")).toBeNull()
  })
})

describe("isCamelot", () => {
  it("recognizes valid Camelot codes", () => {
    expect(isCamelot("1A")).toBe(true)
    expect(isCamelot("12B")).toBe(true)
    expect(isCamelot("8a")).toBe(true)
  })

  it("rejects musical keys and out-of-range codes", () => {
    expect(isCamelot("Am")).toBe(false)
    expect(isCamelot("13A")).toBe(false)
    expect(isCamelot("0B")).toBe(false)
  })
})

describe("musicalKeyToTraktorValue", () => {
  it("round-trips every Traktor numeric value through Open Key text", async () => {
    const { musicalKeyValueToOpenKey } = await import("@/lib/music/camelot")

    for (let value = 0; value <= 23; value += 1) {
      const openKey = musicalKeyValueToOpenKey(value)
      expect(openKey).not.toBeNull()
      expect(musicalKeyToTraktorValue(openKey)).toBe(value)
    }
  })

  it("maps Camelot and musical notations to the same value", () => {
    // 9A = E minor = index 4 + 12.
    expect(musicalKeyToTraktorValue("9A")).toBe(16)
    expect(musicalKeyToTraktorValue("Em")).toBe(16)
    // 8B = C major = index 0.
    expect(musicalKeyToTraktorValue("8B")).toBe(0)
    expect(musicalKeyToTraktorValue("C")).toBe(0)
    // Open Key "11m" = G minor = index 7 + 12.
    expect(musicalKeyToTraktorValue("11m")).toBe(19)
  })

  it("returns null for unmappable keys", () => {
    expect(musicalKeyToTraktorValue(null)).toBeNull()
    expect(musicalKeyToTraktorValue("")).toBeNull()
    expect(musicalKeyToTraktorValue("not-a-key")).toBeNull()
  })
})

/**
 * The notation converter an alpha user asked for: "selección de modelo de Key
 * (CAMELOT, Open Key, Musical) o conversor interno". Before this the module
 * converted only INTO Camelot, so a DJ who reads Open Key — which is what
 * Traktor displays — had to translate every row by hand.
 */
describe("notation conversion", () => {
  /** The full wheel, in all three notations. One row per key, no exceptions. */
  const WHEEL: Array<[camelot: string, openKey: string, musical: string]> = [
    ["1A", "6m", "Abm"],
    ["2A", "7m", "Ebm"],
    ["3A", "8m", "Bbm"],
    ["4A", "9m", "Fm"],
    ["5A", "10m", "Cm"],
    ["6A", "11m", "Gm"],
    ["7A", "12m", "Dm"],
    ["8A", "1m", "Am"],
    ["9A", "2m", "Em"],
    ["10A", "3m", "Bm"],
    ["11A", "4m", "F#m"],
    ["12A", "5m", "Dbm"],
    ["1B", "6d", "B"],
    ["2B", "7d", "F#"],
    ["3B", "8d", "Db"],
    ["4B", "9d", "Ab"],
    ["5B", "10d", "Eb"],
    ["6B", "11d", "Bb"],
    ["7B", "12d", "F"],
    ["8B", "1d", "C"],
    ["9B", "2d", "G"],
    ["10B", "3d", "D"],
    ["11B", "4d", "A"],
    ["12B", "5d", "E"],
  ]

  it.each(WHEEL)(
    "converts %s / %s / %s to every other notation",
    (camelot, openKey, musical) => {
      // Every input notation reaches every output notation.
      for (const input of [camelot, openKey, musical]) {
        expect(formatKey(input, "camelot"), input).toBe(camelot)
        expect(formatKey(input, "open_key"), input).toBe(openKey)
        expect(formatKey(input, "musical"), input).toBe(musical)
      }
    }
  )

  it("agrees with the existing Camelot→Traktor mapping on Open Key", () => {
    // camelotToOpenKey and musicalKeyValueToOpenKey were derived separately;
    // they have to land on the same string or one of them is wrong.
    for (let value = 0; value <= 23; value++) {
      const openKey = musicalKeyValueToOpenKey(value)!
      expect(camelotToOpenKey(toCamelot(openKey))).toBe(openKey)
    }
  })

  it("round-trips through every notation without drift", () => {
    for (const [camelot] of WHEEL) {
      const viaOpen = formatKey(formatKey(camelot, "open_key"), "camelot")
      const viaMusical = formatKey(formatKey(camelot, "musical"), "camelot")

      expect(viaOpen).toBe(camelot)
      expect(viaMusical).toBe(camelot)
    }
  })

  it("prefers the flat spelling, as Rekordbox and Mixed In Key display it", () => {
    expect(camelotToMusical("3A")).toBe("Bbm")
    expect(camelotToMusical("6B")).toBe("Bb")
    // Both spellings still read back to the same code.
    expect(toCamelot("A#m")).toBe("3A")
  })

  it("returns the DJ's own string when it can't be mapped", () => {
    // Losing a value to tidy a column is not an improvement.
    expect(formatKey("Ionian?", "camelot")).toBe("Ionian?")
    expect(formatKey("Ionian?", "musical")).toBe("Ionian?")
  })

  it("hands back exactly what was imported when asked to", () => {
    expect(formatKey("11m", "as_imported")).toBe("11m")
    expect(formatKey("  Am  ", "as_imported")).toBe("Am")
  })

  it("has nothing to show for an absent key", () => {
    for (const notation of KEY_NOTATIONS) {
      expect(formatKey(null, notation)).toBeNull()
      expect(formatKey("", notation)).toBeNull()
      expect(formatKey("   ", notation)).toBeNull()
    }
  })
})

describe("detectKeyNotation", () => {
  it("names the notation a stored string is written in", () => {
    expect(detectKeyNotation("8A")).toBe("camelot")
    expect(detectKeyNotation("11m")).toBe("open_key")
    expect(detectKeyNotation("Am")).toBe("musical")
    expect(detectKeyNotation("A minor")).toBe("musical")
    expect(detectKeyNotation("nonsense")).toBeNull()
    expect(detectKeyNotation(null)).toBeNull()
  })
})

describe("keySortIndex", () => {
  it("orders by wheel position, not by string", () => {
    // "10A" sorts before "2A" as text, which is why sorting the rendered
    // column was wrong: sorting by key exists to group compatible tracks.
    const sorted = ["10A", "2A", "1B", "1A"].sort(
      (a, b) => keySortIndex(a) - keySortIndex(b)
    )

    expect(sorted).toEqual(["1A", "1B", "2A", "10A"])
  })

  it("gives one order regardless of the notation each key is written in", () => {
    const camelot = ["9A", "1A", "5B"]
    const openKey = camelot.map((key) => camelotToOpenKey(key)!)

    expect(
      openKey
        .slice()
        .sort((a, b) => keySortIndex(a) - keySortIndex(b))
        .map((key) => toCamelot(key))
    ).toEqual(camelot.slice().sort((a, b) => keySortIndex(a) - keySortIndex(b)))
  })

  it("sorts unreadable keys last, where they can be found and fixed", () => {
    expect(keySortIndex("what")).toBeGreaterThan(keySortIndex("12B"))
    expect(keySortIndex(null)).toBeGreaterThan(keySortIndex("12B"))
  })
})

describe("isKeyNotation", () => {
  it("accepts the four notations and nothing else", () => {
    expect(isKeyNotation("camelot")).toBe(true)
    expect(isKeyNotation("open_key")).toBe(true)
    expect(isKeyNotation("musical")).toBe(true)
    expect(isKeyNotation("as_imported")).toBe(true)
    expect(isKeyNotation("traktor")).toBe(false)
    expect(isKeyNotation(null)).toBe(false)
  })
})
