import { beforeEach, describe, expect, it } from "vitest"

import {
  ENERGY_LABEL_MAX,
  ENERGY_LABEL_MIN,
  MAX_LABELS,
  clipKey,
  exportEnergyLabels,
  parseEnergyLabel,
  readEnergyLabels,
  removeEnergyLabel,
  summarizeEnergyLabels,
  writeEnergyLabel,
  labelsForFitting,
  parseLabelsDocument,
  type EnergyLabel,
} from "@/lib/audio/energy-labels"
import { TRACK_FEATURES_VERSION } from "@/lib/audio/track-features"

const features = (version = TRACK_FEATURES_VERSION) => ({
  rmsMean: 0.2,
  rmsPeak: 0.4,
  fluxMean: 1.1,
  entropyMean: 0.38,
  onsetRate: 2.2,
  analyzedSeconds: 90,
  version,
})

function label(
  overrides: Partial<EnergyLabel> = {},
  version = TRACK_FEATURES_VERSION
): EnergyLabel {
  return {
    clip: "peak.mp3::4210",
    fileName: "peak.mp3",
    label: 7,
    features: features(version),
    bpm: 150,
    at: "2026-08-19T09:00:00.000Z",
    ...overrides,
  }
}

/** localStorage isn't in the node environment; a Map behaves close enough. */
function installStorage() {
  const store = new Map<string, string>()

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    },
  })

  return store
}

beforeEach(() => {
  installStorage()
})

describe("identifying the clip a rating belongs to", () => {
  it("combines name and byte size", () => {
    expect(clipKey("peak.mp3", 4210)).toBe("peak.mp3::4210")
  })

  it("separates two files that share a name", () => {
    expect(clipKey("intro.wav", 100)).not.toBe(clipKey("intro.wav", 200))
  })
})

describe("parsing a rating", () => {
  it("accepts a well-formed one", () => {
    expect(parseEnergyLabel(label())).toEqual(label())
  })

  it("rejects ratings outside the scale", () => {
    for (const value of [0, 11, -1, 4.5, "7", Number.NaN, null]) {
      expect(parseEnergyLabel({ ...label(), label: value })).toBeNull()
    }
  })

  it("accepts both ends of the scale", () => {
    expect(parseEnergyLabel({ ...label(), label: ENERGY_LABEL_MIN })).not.toBeNull()
    expect(parseEnergyLabel({ ...label(), label: ENERGY_LABEL_MAX })).not.toBeNull()
  })

  it("rejects a rating whose features don't parse", () => {
    // All-or-nothing, same as track-features: a label paired with half a feature
    // vector would train a coefficient on evidence that isn't there.
    expect(parseEnergyLabel({ ...label(), features: { rmsMean: 0.2 } })).toBeNull()
    expect(parseEnergyLabel({ ...label(), features: null })).toBeNull()
  })

  it("rejects anything that isn't an object with a clip", () => {
    for (const input of [null, 7, "x", [], {}, { ...label(), clip: "" }]) {
      expect(parseEnergyLabel(input)).toBeNull()
    }
  })
})

describe("storing ratings", () => {
  it("writes and reads one back", () => {
    writeEnergyLabel(
      { clip: "a::1", fileName: "a.mp3", label: 8, features: features(), bpm: 150 },
      "2026-08-19T09:00:00.000Z"
    )

    const stored = readEnergyLabels()
    expect(stored["a::1"].label).toBe(8)
    expect(stored["a::1"].at).toBe("2026-08-19T09:00:00.000Z")
  })

  it("replaces a previous rating for the same clip", () => {
    // Re-rating is a better label, not a conflict — a second listen should win.
    writeEnergyLabel(
      { clip: "a::1", fileName: "a.mp3", label: 4, features: features(), bpm: 150 },
      "2026-08-19T09:00:00.000Z"
    )
    const after = writeEnergyLabel(
      { clip: "a::1", fileName: "a.mp3", label: 9, features: features(), bpm: 150 },
      "2026-08-19T10:00:00.000Z"
    )

    expect(Object.keys(after)).toHaveLength(1)
    expect(after["a::1"].label).toBe(9)
  })

  it("keeps earlier ratings when a later batch is rated", () => {
    // The property the whole workflow rests on. The harness clears its visible
    // table on every new file pick, so a DJ rating three tracks at a time only
    // ever sees the current three — and would have no way to notice if the
    // previous ones had been dropped. They must survive in the store.
    writeEnergyLabel(
      { clip: "a::1", fileName: "a.mp3", label: 3, features: features(), bpm: 122 },
      "2026-08-19T09:00:00.000Z"
    )
    writeEnergyLabel(
      { clip: "b::2", fileName: "b.mp3", label: 7, features: features(), bpm: 128 },
      "2026-08-19T09:05:00.000Z"
    )
    const after = writeEnergyLabel(
      { clip: "c::3", fileName: "c.mp3", label: 9, features: features(), bpm: 134 },
      "2026-08-19T09:10:00.000Z"
    )

    expect(Object.keys(after).sort()).toEqual(["a::1", "b::2", "c::3"])
    expect(after["a::1"].label).toBe(3)
    expect(after["b::2"].label).toBe(7)

    // And they survive a reload, which is the case that actually loses an
    // afternoon: the store is the only copy until the export is taken.
    const reloaded = readEnergyLabels()
    expect(Object.keys(reloaded)).toHaveLength(3)
    expect(reloaded["a::1"].label).toBe(3)
  })

  it("removes one", () => {
    writeEnergyLabel(
      { clip: "a::1", fileName: "a.mp3", label: 4, features: features(), bpm: 150 },
      "t"
    )
    expect(Object.keys(removeEnergyLabel("a::1"))).toHaveLength(0)
  })

  it("stops accepting new clips past the cap", () => {
    // Seeded in one write rather than looped: every write re-serialises the whole
    // store, so filling the cap a rating at a time is quadratic. That cost is
    // irrelevant for a human entering labels one by one, and unacceptable in a
    // test.
    const store = installStorage()
    const full: Record<string, EnergyLabel> = {}
    for (let index = 0; index < MAX_LABELS; index += 1) {
      full[`c${index}`] = label({ clip: `c${index}`, label: 5 })
    }
    store.set("energycurve:energy-labels", JSON.stringify(full))

    const refused = writeEnergyLabel(
      { clip: "one-more", fileName: "x.mp3", label: 5, features: features(), bpm: 150 },
      "t"
    )
    expect(refused["one-more"]).toBeUndefined()

    // A correction to something already stored still goes through — the cap is on
    // growth, not on fixing a rating.
    const corrected = writeEnergyLabel(
      { clip: "c0", fileName: "x.mp3", label: 9, features: features(), bpm: 150 },
      "t"
    )
    expect(corrected["c0"].label).toBe(9)
  })

  it("survives corrupt storage instead of throwing", () => {
    const store = installStorage()
    store.set("energycurve:energy-labels", "{not json")
    expect(readEnergyLabels()).toEqual({})

    store.set("energycurve:energy-labels", JSON.stringify([1, 2, 3]))
    expect(readEnergyLabels()).toEqual({})
  })

  it("drops individual unreadable entries and keeps the rest", () => {
    const store = installStorage()
    store.set(
      "energycurve:energy-labels",
      JSON.stringify({ good: label({ clip: "good" }), bad: { label: 99 } })
    )

    const read = readEnergyLabels()
    expect(Object.keys(read)).toEqual(["good"])
  })

  it("returns nothing on the server", () => {
    Reflect.deleteProperty(globalThis, "window")
    expect(readEnergyLabels()).toEqual({})
  })
})

describe("summarising the label set", () => {
  it("counts coverage of the scale, not just the total", () => {
    // The number that matters: fifty tracks all rated 7 fit a model that can only
    // ever answer 7.
    const labels = {
      a: label({ clip: "a", label: 3 }),
      b: label({ clip: "b", label: 3 }),
      c: label({ clip: "c", label: 9 }),
    }

    const summary = summarizeEnergyLabels(labels)
    expect(summary.total).toBe(3)
    expect(summary.usable).toBe(3)
    expect(summary.coveredRatings).toBe(2)
    expect(summary.missingRatings).toEqual([1, 2, 4, 5, 6, 7, 8, 10])
  })

  it("excludes labels measured by an older extraction", () => {
    // Mixing extraction versions in one fit would attribute a change in method to
    // a change in the music.
    const labels = {
      current: label({ clip: "current", label: 5 }),
      stale: label({ clip: "stale", label: 8 }, TRACK_FEATURES_VERSION - 1),
    }

    const summary = summarizeEnergyLabels(labels)
    expect(summary.total).toBe(2)
    expect(summary.usable).toBe(1)
    expect(summary.missingRatings).toContain(8)
  })

  it("reports a full scale when every rating has an example", () => {
    const labels: Record<string, EnergyLabel> = {}
    for (let rating = ENERGY_LABEL_MIN; rating <= ENERGY_LABEL_MAX; rating += 1) {
      labels[`c${rating}`] = label({ clip: `c${rating}`, label: rating })
    }

    const summary = summarizeEnergyLabels(labels)
    expect(summary.coveredRatings).toBe(10)
    expect(summary.missingRatings).toEqual([])
  })
})

describe("exporting", () => {
  it("emits the extraction version alongside the entries", () => {
    const parsed = JSON.parse(
      exportEnergyLabels({ a: label({ clip: "a" }) })
    ) as Record<string, unknown>

    expect(parsed.kind).toBe("energycurve.energy-labels")
    expect(parsed.featuresVersion).toBe(TRACK_FEATURES_VERSION)
    expect(parsed.count).toBe(1)
    expect(parsed.summary).toBeDefined()
  })

  it("sorts by file name so two exports of the same set diff cleanly", () => {
    const parsed = JSON.parse(
      exportEnergyLabels({
        b: label({ clip: "b", fileName: "zz.mp3" }),
        a: label({ clip: "a", fileName: "aa.mp3" }),
      })
    ) as { entries: EnergyLabel[] }

    expect(parsed.entries.map((entry) => entry.fileName)).toEqual([
      "aa.mp3",
      "zz.mp3",
    ])
  })

  it("round-trips through the parser", () => {
    const exported = JSON.parse(
      exportEnergyLabels({ a: label({ clip: "a" }) })
    ) as { entries: unknown[] }

    expect(parseEnergyLabel(exported.entries[0])).toEqual(label({ clip: "a" }))
  })
})

describe("tempo on a label", () => {
  it("counts a label with no tempo as unfittable, not as broken", () => {
    // The bug this exists for: the model needs a tempo, TrackAudioFeatures
    // deliberately doesn't carry one (beat detection is a separate, better
    // measurement), and the first version of the export stored neither. Every
    // exported row would have been silently dropped by the fit.
    //
    // A rating with no detectable beat is still a real rating, so it's kept and
    // reported separately rather than rejected — throwing it away would discard part
    // of a listening session.
    const labels = {
      fittable: label({ clip: "fittable", label: 6 }),
      beatless: label({ clip: "beatless", label: 3, bpm: null }),
    }

    const summary = summarizeEnergyLabels(labels)

    expect(summary.total).toBe(2)
    expect(summary.usable).toBe(1)
    expect(summary.withoutTempo).toBe(1)
    // Its rating doesn't count toward coverage either, because it can't train.
    expect(summary.missingRatings).toContain(3)
  })

  it("reads a label written before tempo was stored", () => {
    const legacy = { ...label(), bpm: undefined }
    const parsed = parseEnergyLabel(legacy)

    expect(parsed).not.toBeNull()
    expect(parsed!.bpm).toBeNull()
  })

  it("rejects a tempo that isn't a positive number", () => {
    for (const bad of [0, -140, "150", Number.NaN]) {
      expect(parseEnergyLabel({ ...label(), bpm: bad })!.bpm).toBeNull()
    }
  })

  it("round-trips the tempo through the export", () => {
    const exported = JSON.parse(
      exportEnergyLabels({ a: label({ clip: "a", bpm: 147.5 }) })
    ) as { entries: unknown[] }

    expect(parseEnergyLabel(exported.entries[0])!.bpm).toBe(147.5)
  })
})

describe("preparing labels for a fit", () => {
  it("keeps only rows a fit can actually use", () => {
    const labels = {
      good: label({ clip: "good", label: 5 }),
      stale: label({ clip: "stale", label: 6 }, TRACK_FEATURES_VERSION - 1),
      beatless: label({ clip: "beatless", label: 7, bpm: null }),
    }

    const rows = labelsForFitting(labels)
    expect(rows).toHaveLength(1)
    expect(rows[0].label).toBe(5)
  })
})

describe("reading a pasted labels document", () => {
  it("accepts the export envelope", () => {
    const text = exportEnergyLabels({ a: label({ clip: "a" }) })
    expect(Object.keys(parseLabelsDocument(text))).toEqual(["a"])
  })

  it("accepts a bare array, because people paste the inner list", () => {
    const text = JSON.stringify([label({ clip: "a" }), label({ clip: "b" })])
    expect(Object.keys(parseLabelsDocument(text)).sort()).toEqual(["a", "b"])
  })

  it("skips unreadable entries instead of failing the whole paste", () => {
    // Losing one row beats losing forty.
    const text = JSON.stringify({
      entries: [label({ clip: "good" }), { label: 99 }, null],
    })
    expect(Object.keys(parseLabelsDocument(text))).toEqual(["good"])
  })

  it("returns nothing for input that isn't a labels document", () => {
    expect(parseLabelsDocument("not json")).toEqual({})
    expect(parseLabelsDocument("42")).toEqual({})
    expect(parseLabelsDocument(JSON.stringify({ entries: "nope" }))).toEqual({})
  })
})
