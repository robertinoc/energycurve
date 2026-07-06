import { describe, expect, it } from "vitest"

import {
  buildMetric,
  isAnalyticsPeriod,
  zeroFillSeries,
} from "@/lib/backstage/analytics"

describe("buildMetric", () => {
  it("computes the percent delta against the previous window", () => {
    expect(buildMetric(15, 10)).toEqual({
      current: 15,
      previous: 10,
      deltaPercent: 50,
    })
    expect(buildMetric(5, 10).deltaPercent).toBe(-50)
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
