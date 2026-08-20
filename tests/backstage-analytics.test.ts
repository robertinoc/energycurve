import { describe, expect, it } from "vitest"

import {
  buildMetric,
  buildRetention,
  isAnalyticsPeriod,
  zeroFillSeries,
} from "@/lib/backstage/analytics"

describe("buildMetric", () => {
  it("computes the percent delta against the previous window", () => {
    expect(buildMetric(15, 10)).toEqual({
      current: 15,
      previous: 10,
      deltaPercent: 50,
      spark: [],
    })
    expect(buildMetric(5, 10).deltaPercent).toBe(-50)
  })

  it("carries the sparkline values through", () => {
    expect(buildMetric(3, 1, [0, 1, 2]).spark).toEqual([0, 1, 2])
  })

  it("returns null delta when the previous window is empty", () => {
    expect(buildMetric(7, 0).deltaPercent).toBeNull()
  })
})

describe("isAnalyticsPeriod", () => {
  it("accepts only known periods", () => {
    expect(isAnalyticsPeriod("7d")).toBe(true)
    expect(isAnalyticsPeriod("90d")).toBe(false)
  })
})

describe("zeroFillSeries", () => {
  const now = new Date("2026-07-06T15:30:00Z")

  it("returns one point per bucket with gaps filled with zeros", () => {
    const points = zeroFillSeries(
      [{ bucket: "2026-07-05 00:00:00", value: 4 }],
      "7d",
      now
    )

    expect(points).toHaveLength(7)
    expect(points[points.length - 1].label).toBe("06 Jul")
    expect(points.find((point) => point.label === "05 Jul")?.value).toBe(4)
    expect(points.filter((point) => point.value === 0)).toHaveLength(6)
  })

  it("builds 24 hourly buckets for the 24h period", () => {
    const points = zeroFillSeries(
      [{ bucket: "2026-07-06 15:00:00", value: 2 }],
      "24h",
      now
    )

    expect(points).toHaveLength(24)
    expect(points[points.length - 1]).toEqual({ label: "15h", value: 2 })
  })

  it("ignores malformed bucket keys", () => {
    const points = zeroFillSeries([{ bucket: "not-a-date", value: 9 }], "7d", now)

    expect(points.every((point) => point.value === 0)).toBe(true)
  })
})

describe("zeroFillSeries bucket formats", () => {
  const now = new Date("2026-07-06T15:30:00Z")

  it("accepts ISO buckets with T and explicit timezone", () => {
    const points = zeroFillSeries(
      [
        { bucket: "2026-07-05T00:00:00Z", value: 3 },
        { bucket: "2026-07-04T00:00:00+00:00", value: 2 },
      ],
      "7d",
      now
    )

    expect(points.find((point) => point.label === "05 Jul")?.value).toBe(3)
    expect(points.find((point) => point.label === "04 Jul")?.value).toBe(2)
  })

  it("floors offset timestamps onto the bucket grid instead of dropping them", () => {
    const points = zeroFillSeries(
      [{ bucket: "2026-07-05T00:00:00-03:00", value: 5 }],
      "7d",
      now
    )

    expect(points.find((point) => point.label === "05 Jul")?.value).toBe(5)
  })
})

describe("buildRetention", () => {
  it("reports the share of the previous window's users who came back", () => {
    const retention = buildRetention(6, 10, 40, 12)

    expect(retention.rate).toBeCloseTo(0.6)
    expect(retention.returningUsers).toBe(6)
    expect(retention.priorActiveUsers).toBe(10)
  })

  it("returns null rather than 0% when there was nobody to retain", () => {
    // The young-product case. 0% reads as total churn; the truth is that the
    // previous window was empty, and those are opposite facts.
    expect(buildRetention(0, 0, 5, 3).rate).toBeNull()
  })

  it("reports zero honestly when a real cohort all left", () => {
    // Distinct from the case above, and the distinction is the point.
    expect(buildRetention(0, 10, 5, 3).rate).toBe(0)
  })

  it("measures engagement per active user, not per event", () => {
    // A DJ who analyses one set and leaves and a DJ who analyses nine are both
    // one active user; the difference is the whole question.
    expect(buildRetention(3, 5, 27, 9).analysesPerActiveUser).toBe(3)
  })

  it("rounds engagement to one decimal", () => {
    expect(buildRetention(1, 2, 10, 3).analysesPerActiveUser).toBe(3.3)
  })

  it("returns null engagement when nobody was active", () => {
    // Rather than dividing by zero and rendering Infinity in a tile.
    expect(buildRetention(0, 4, 0, 0).analysesPerActiveUser).toBeNull()
  })

  it("can report more returning users than analyses", () => {
    // Someone can come back, look at a set and not analyse anything. That's a
    // real state, not a data error, so nothing here should clamp it.
    const retention = buildRetention(8, 10, 2, 8)

    expect(retention.rate).toBeCloseTo(0.8)
    expect(retention.analysesPerActiveUser).toBe(0.3)
  })
})
