import { describe, expect, it } from "vitest"

import {
  countPlacedIds,
  decodeSmartOrderEvents,
  encodeSmartOrderEvent,
  isFallbackReason,
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

/**
 * The fallback banner used to say "Claude didn't answer in time" for every
 * fallback — including a deployment with no API key, an answer that failed
 * validation, and a thrown error. That is the product asserting a cause it
 * hasn't established, and it made a real bug report impossible to act on.
 */
describe("fallback reason", () => {
  it("survives the wire", () => {
    const event: SmartOrderEvent = {
      type: "done",
      order: ["a", "b"],
      source: "fallback",
      reason: "not_configured",
    }

    const { events } = decodeSmartOrderEvents(encodeSmartOrderEvent(event))
    expect(events[0]).toEqual(event)
  })

  it("is optional, so a Claude-sourced done event stays as it was", () => {
    const event: SmartOrderEvent = {
      type: "done",
      order: ["a"],
      source: "claude",
    }

    const { events } = decodeSmartOrderEvents(encodeSmartOrderEvent(event))
    expect(events[0]).toEqual(event)
  })

  it("recognises exactly the reasons the server can send", () => {
    for (const reason of [
      "not_configured",
      "timeout",
      "invalid_answer",
      "refusal",
      "error",
    ]) {
      expect(isFallbackReason(reason), reason).toBe(true)
    }

    // An unknown reason must not reach the banner as a lookup miss.
    for (const value of ["", "slow", null, undefined, 7, {}]) {
      expect(isFallbackReason(value)).toBe(false)
    }
  })
})

describe("truncated answers", () => {
  it("is a reason of its own, not a generic error", () => {
    // An answer capped mid-array is a partial JSON document. It used to reach
    // JSON.parse, throw, and surface as "something went wrong" — which hid the
    // one failure that has an obvious fix (raise the output budget).
    expect(isFallbackReason("truncated")).toBe(true)

    const event: SmartOrderEvent = {
      type: "done",
      order: ["a"],
      source: "fallback",
      reason: "truncated",
    }
    const { events } = decodeSmartOrderEvents(encodeSmartOrderEvent(event))
    expect(events[0]).toEqual(event)
  })
})
