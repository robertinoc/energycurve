import { describe, expect, it } from "vitest"

import {
  countPlacedIds,
  decodeSmartOrderEvents,
  encodeSmartOrderEvent,
  type SmartOrderEvent,
} from "@/lib/smart-order/stream"

describe("countPlacedIds", () => {
  it("counts only ids the model has finished writing", () => {
    expect(countPlacedIds('{"order":["a","b","c"')).toBe(3)
  })

  it("ignores a half-written id so the bar never overstates progress", () => {
    // The closing quote hasn't arrived: "c" is not committed yet.
    expect(countPlacedIds('{"order":["a","b","c')).toBe(2)
  })

  it("counts correctly when an id is split across deltas", () => {
    // Simulates accumulating text one delta at a time, which is the whole
    // reason this works off the full buffer instead of the latest chunk.
    const deltas = ['{"or', 'der":["tr', 'ack-1","tra', 'ck-2","track-3"]']
    let text = ""
    const seen: number[] = []

    for (const delta of deltas) {
      text += delta
      seen.push(countPlacedIds(text))
    }

    expect(seen).toEqual([0, 0, 1, 3])
  })

  it("stops at the end of the order array", () => {
    // `breathers` holds ids too — they must not inflate the count.
    const text = '{"order":["a","b"],"rationale":"x","breathers":["a","b","c"]}'
    expect(countPlacedIds(text)).toBe(2)
  })

  it("returns zero before the order key shows up", () => {
    expect(countPlacedIds('{"rationale":"thinking about it"')).toBe(0)
    expect(countPlacedIds("")).toBe(0)
  })

  it("is not confused by ids containing escaped quotes", () => {
    expect(countPlacedIds('{"order":["a\\"b","c"]')).toBe(2)
  })
})

describe("smart order event framing", () => {
  it("round-trips events", () => {
    const events: SmartOrderEvent[] = [
      { type: "start", total: 3 },
      { type: "progress", placed: 2, total: 3 },
      { type: "done", order: ["a", "b", "c"], source: "claude" },
    ]

    const wire = events.map(encodeSmartOrderEvent).join("")
    const { events: decoded, rest } = decodeSmartOrderEvents(wire)

    expect(decoded).toEqual(events)
    expect(rest).toBe("")
  })

  it("holds back a partial line instead of losing it", () => {
    const wire =
      encodeSmartOrderEvent({ type: "start", total: 2 }) + '{"type":"prog'

    const { events, rest } = decodeSmartOrderEvents(wire)

    expect(events).toEqual([{ type: "start", total: 2 }])
    expect(rest).toBe('{"type":"prog')

    // The next chunk completes it.
    const next = decodeSmartOrderEvents(
      rest + 'ress","placed":1,"total":2}\n'
    )
    expect(next.events).toEqual([{ type: "progress", placed: 1, total: 2 }])
  })

  it("skips a malformed line rather than dropping the terminal event", () => {
    const wire =
      "not json\n" +
      encodeSmartOrderEvent({ type: "done", order: ["a"], source: "fallback" })

    const { events } = decodeSmartOrderEvents(wire)

    expect(events).toEqual([
      { type: "done", order: ["a"], source: "fallback" },
    ])
  })
})
