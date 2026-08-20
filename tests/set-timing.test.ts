import { describe, expect, it } from "vitest"

import {
  DURATION_COVERAGE_MIN,
  SLOT_FIT_TOLERANCE,
  assessSlotFit,
  resolveSetTiming,
} from "@/lib/engine/set-timing"

/** n tracks of the same length, in seconds. */
const uniform = (count: number, seconds: number) =>
  Array.from({ length: count }, () => seconds)

describe("resolveSetTiming", () => {
  it("sums the real lengths instead of guessing three minutes each", () => {
    // The case the guess got badly wrong: 20 progressive tracks at 7 minutes is a
    // 140-minute set, and trackCount × 3 called it 60.
    const timing = resolveSetTiming(uniform(20, 7 * 60))

    expect(timing.totalMinutes).toBe(140)
    expect(timing.measured).toBe(true)
    expect(timing.coverage).toBe(1)
  })

  it("keeps the real numbers when one track is untagged", () => {
    // Degrades per track. An every()-style check would discard 29 real lengths
    // because of one gap, which is how the flat guess kept winning.
    const timing = resolveSetTiming([...uniform(29, 6 * 60), null])

    expect(timing.unknownCount).toBe(1)
    expect(timing.measured).toBe(true)
    // The gap is filled with the median of the known ones — 6 minutes, not 3.
    expect(timing.totalMinutes).toBe(180)
  })

  it("fills gaps with the median of what it knows, not the global constant", () => {
    const timing = resolveSetTiming([600, 600, 600, 600, null])

    // 4 × 10 min + 1 × 10 min (median), not 4 × 10 + 3.
    expect(timing.totalMinutes).toBe(50)
  })

  it("uses the median so one long recording doesn't skew the gaps", () => {
    // A 40-minute live recording among 5-minute tracks. Mean would push the
    // fallback to ~13 minutes; median leaves it at 5.
    const timing = resolveSetTiming([300, 300, 300, 300, 2400, null])

    expect(timing.totalMinutes).toBe(65)
  })

  it("refuses to call a sparse set measured", () => {
    // 2 of 10 known — 80% of the answer would be invented.
    const timing = resolveSetTiming([300, 300, ...Array(8).fill(null)])

    expect(timing.coverage).toBeCloseTo(0.2)
    expect(timing.measured).toBe(false)
    // It still returns a total. Callers decide whether to state it; the number
    // itself is useful for sorting and for internal comparisons.
    expect(timing.totalMinutes).toBeGreaterThan(0)
  })

  it("puts the measured threshold exactly where the constant says", () => {
    const known = Math.round(10 * DURATION_COVERAGE_MIN)
    const atThreshold = [
      ...uniform(known, 300),
      ...Array(10 - known).fill(null),
    ]

    expect(resolveSetTiming(atThreshold).measured).toBe(true)
    expect(
      resolveSetTiming([...uniform(known - 1, 300), ...Array(11 - known).fill(null)])
        .measured
    ).toBe(false)
  })

  it("ignores lengths that can't be a track", () => {
    // A bad tag shouldn't define the median for everything around it.
    const timing = resolveSetTiming([300, 300, 0, -60, 99_999, Number.NaN])

    expect(timing.unknownCount).toBe(4)
    expect(timing.totalMinutes).toBe(30)
  })

  it("returns zero for an empty set rather than throwing", () => {
    expect(resolveSetTiming([])).toEqual({
      totalMinutes: 0,
      coverage: 0,
      measured: false,
      unknownCount: 0,
    })
  })
})

describe("assessSlotFit", () => {
  const measured = (minutes: number) => resolveSetTiming(uniform(minutes, 60))

  it("says short when there isn't enough music for the slot", () => {
    const fit = assessSlotFit(measured(90), 120)

    expect(fit).not.toBeNull()
    expect(fit!.verdict).toBe("short")
    expect(fit!.differenceMinutes).toBe(-30)
  })

  it("says over when there's more music than slot", () => {
    expect(assessSlotFit(measured(150), 120)!.verdict).toBe("over")
  })

  it("absorbs a gap a DJ absorbs without noticing", () => {
    // 10% of a two-hour slot. Mixing and looping cover this; a warning here would
    // fire on sets that are fine, and an engine that cries wolf gets ignored.
    const tolerated = Math.floor(120 * SLOT_FIT_TOLERANCE)

    expect(assessSlotFit(measured(120 - tolerated), 120)!.verdict).toBe("fits")
    expect(assessSlotFit(measured(120 + tolerated), 120)!.verdict).toBe("fits")
  })

  it("declines to answer when the set's length is a guess", () => {
    // A fit computed from a guessed total is a guess wearing a number, and this is
    // advice someone acts on before a booking.
    const guessed = resolveSetTiming(Array(20).fill(null))

    expect(guessed.measured).toBe(false)
    expect(assessSlotFit(guessed, 120)).toBeNull()
  })

  it("declines on a nonsensical slot instead of dividing by zero", () => {
    expect(assessSlotFit(measured(90), 0)).toBeNull()
    expect(assessSlotFit(measured(90), -60)).toBeNull()
  })
})
