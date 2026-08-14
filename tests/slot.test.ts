import { describe, expect, it } from "vitest"

import {
  assessSlot,
  clockAt,
  formatClock,
  formatGap,
  isValidMinuteOfDay,
  MINUTES_IN_DAY,
  parseClock,
  PEAK_WINDOW,
  peakIndexOf,
  resolveSlot,
} from "@/lib/engine/slot"

const at = (h: number, m = 0) => h * 60 + m

/** 01:00 → 03:00, the case the whole feature exists for. */
const WARMUP = resolveSlot(at(1), at(3))!

describe("resolveSlot", () => {
  it("measures a same-day slot", () => {
    const slot = resolveSlot(at(22), at(23, 30))!
    expect(slot.durationMinutes).toBe(90)
    expect(slot.crossesMidnight).toBe(false)
  })

  it("measures a slot that crosses midnight", () => {
    // The common case, not the edge one: most club sets run past midnight, and
    // naive subtraction would make this negative.
    const slot = resolveSlot(at(23), at(1))!
    expect(slot.durationMinutes).toBe(120)
    expect(slot.crossesMidnight).toBe(true)
  })

  it("handles a slot ending exactly at midnight", () => {
    const slot = resolveSlot(at(22), at(0))!
    expect(slot.durationMinutes).toBe(120)
    expect(slot.crossesMidnight).toBe(true)
  })

  it("refuses a zero-length slot rather than reading it as 24 hours", () => {
    // Far likelier to be a half-filled form than a DJ playing for a full day.
    expect(resolveSlot(at(1), at(1))).toBeNull()
  })

  it("refuses anything that isn't a usable minute of day", () => {
    expect(resolveSlot(null, at(3))).toBeNull()
    expect(resolveSlot(at(1), null)).toBeNull()
    expect(resolveSlot(undefined, undefined)).toBeNull()
    expect(resolveSlot(-1, at(3))).toBeNull()
    expect(resolveSlot(at(1), MINUTES_IN_DAY)).toBeNull()
    expect(resolveSlot(90.5, at(3))).toBeNull()
  })

  it("validates minute offsets on their own", () => {
    expect(isValidMinuteOfDay(0)).toBe(true)
    expect(isValidMinuteOfDay(1439)).toBe(true)
    expect(isValidMinuteOfDay(1440)).toBe(false)
    expect(isValidMinuteOfDay(-1)).toBe(false)
    expect(isValidMinuteOfDay("60")).toBe(false)
    expect(isValidMinuteOfDay(null)).toBe(false)
  })
})

describe("formatClock", () => {
  it("pads to a readable wall clock", () => {
    expect(formatClock(at(1, 20))).toBe("01:20")
    expect(formatClock(at(23, 5))).toBe("23:05")
    expect(formatClock(0)).toBe("00:00")
  })

  it("wraps past midnight instead of printing 25:00", () => {
    // clockAt returns unwrapped minutes for a slot that crosses midnight, so the
    // wrap has to live in the formatter.
    expect(formatClock(at(25, 30))).toBe("01:30")
    expect(formatClock(at(24))).toBe("00:00")
  })

  it("rounds to the nearest minute", () => {
    expect(formatClock(at(1, 20) + 0.6)).toBe("01:21")
  })
})

describe("formatGap", () => {
  it("reads as a duration a person would say out loud", () => {
    expect(formatGap(25)).toBe("25min")
    expect(formatGap(60)).toBe("1h")
    expect(formatGap(100)).toBe("1h40")
    expect(formatGap(125)).toBe("2h05")
  })

  it("never goes negative", () => {
    expect(formatGap(-10)).toBe("0min")
  })
})

describe("clockAt", () => {
  it("starts the set at the slot's start", () => {
    expect(clockAt(0, 24, WARMUP)).toBe(at(1))
  })

  it("stretches the tracklist to fill the declared slot", () => {
    // Deliberately not the sum of track durations: the DJ said they play until
    // 03:00, and they will — the tracklist flexes, not the slot.
    expect(clockAt(12, 24, WARMUP)).toBe(at(2))
    expect(clockAt(18, 24, WARMUP)).toBe(at(2, 30))
  })

  it("puts a single-track set at the start", () => {
    expect(clockAt(0, 1, WARMUP)).toBe(at(1))
  })

  it("returns unwrapped minutes across midnight, for the formatter to wrap", () => {
    const slot = resolveSlot(at(23), at(1))!
    expect(clockAt(12, 24, slot)).toBe(at(24))
    expect(formatClock(clockAt(12, 24, slot))).toBe("00:00")
  })
})

describe("assessSlot", () => {
  /** A curve whose maximum sits at a chosen share of the set. */
  function curveWithPeakAt(share: number, length = 20): number[] {
    const peak = Math.round(share * length)
    return Array.from({ length }, (_, index) => (index === peak ? 10 : 4))
  }

  it("flags a peak that lands with most of the set still to play", () => {
    // The warm-up DJ's actual failure: great arc, burned the floor at 01:20 with
    // 1h40 still to fill.
    const assessment = assessSlot(curveWithPeakAt(0.2), WARMUP)!

    expect(assessment.verdict).toBe("peak_too_early")
    expect(formatClock(assessment.peakClockMinutes)).toBe("01:24")
    expect(formatGap(assessment.remainingMinutes)).toBe("1h36")
  })

  it("flags a peak with no room left to land the set", () => {
    expect(assessSlot(curveWithPeakAt(0.97), WARMUP)!.verdict).toBe("peak_too_late")
  })

  it("accepts a peak anywhere in the defensible window", () => {
    for (const share of [PEAK_WINDOW.from, 0.7, 0.85, PEAK_WINDOW.to]) {
      expect(
        assessSlot(curveWithPeakAt(share), WARMUP)!.verdict,
        `share ${share}`
      ).toBe("well_placed")
    }
  })

  it("takes the last maximum when the set touches its top twice", () => {
    // Two equal highs: the floor peaks the *second* time, and calling the first
    // one "the peak" would report a too-early warning for a set that is fine.
    const curve = [4, 10, 5, 6, 7, 8, 9, 10, 6, 5]
    const assessment = assessSlot(curve, WARMUP)!

    expect(assessment.peakPosition).toBe(8)
    expect(assessment.verdict).toBe("well_placed")
  })

  it("reports the peak position 1-based, matching the tracklist", () => {
    const assessment = assessSlot([4, 4, 10, 4], WARMUP)!
    expect(assessment.peakPosition).toBe(3)
  })

  it("returns null for an empty set", () => {
    expect(assessSlot([], WARMUP)).toBeNull()
  })

  it("works across midnight", () => {
    const slot = resolveSlot(at(23), at(2))!
    const assessment = assessSlot(curveWithPeakAt(0.75, 20), slot)!

    expect(assessment.verdict).toBe("well_placed")
    expect(formatClock(assessment.peakClockMinutes)).toBe("01:15")
  })

  it("keeps remaining minutes at zero rather than negative at the very end", () => {
    const assessment = assessSlot([4, 4, 4, 10], WARMUP)!
    expect(assessment.remainingMinutes).toBeGreaterThanOrEqual(0)
  })
})

describe("parseClock", () => {
  it("accepts what a person types", () => {
    expect(parseClock("01:30")).toBe(90)
    expect(parseClock("1:30")).toBe(90)
    expect(parseClock(" 23:59 ")).toBe(1439)
    expect(parseClock("00:00")).toBe(0)
  })

  it("rejects impossible and malformed values", () => {
    expect(parseClock("24:00")).toBeNull()
    expect(parseClock("01:60")).toBeNull()
    expect(parseClock("1")).toBeNull()
    expect(parseClock("1:5")).toBeNull()
    expect(parseClock("")).toBeNull()
    expect(parseClock("abc")).toBeNull()
  })

  it("round-trips with formatClock", () => {
    for (const value of ["00:00", "01:20", "13:45", "23:59"]) {
      expect(formatClock(parseClock(value)!)).toBe(value)
    }
  })
})

describe("peakIndexOf", () => {
  it("finds the single maximum", () => {
    expect(peakIndexOf([4, 5, 9, 6])).toBe(2)
  })

  it("takes the last maximum when the top is touched twice", () => {
    // The shared rule. Both the set sheet and the analysis read this, so a DJ
    // can't be told the peak is track 2 on paper and track 8 on screen.
    expect(peakIndexOf([4, 10, 5, 6, 7, 8, 9, 10, 6])).toBe(7)
  })

  it("agrees with the position assessSlot reports", () => {
    const curve = [4, 10, 5, 6, 7, 8, 9, 10, 6]
    const assessment = assessSlot(curve, WARMUP)!

    expect(assessment.peakPosition).toBe(peakIndexOf(curve) + 1)
  })

  it("returns -1 for an empty set rather than a misleading 0", () => {
    expect(peakIndexOf([])).toBe(-1)
  })

  it("handles a flat set by naming its last track", () => {
    expect(peakIndexOf([7, 7, 7, 7])).toBe(3)
  })
})
