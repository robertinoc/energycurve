import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  runSmartOrder,
  type ClaudeCallOutcome,
  type SmartOrderRunDeps,
} from "@/lib/smart-order/run"
import type { SmartOrderEvent } from "@/lib/smart-order/stream"

/**
 * The two guarantees this runner exists for, asserted without HTTP or the SDK:
 *
 * 1. Every run ends in exactly one terminal event. The production failure this
 *    answers: the platform killed the function mid-generation and the NDJSON
 *    stream just stopped — no `done`, no `error`, the DJ billed for an attempt
 *    that delivered nothing. If any path here can end without a terminal
 *    event, these tests fail.
 *
 * 2. The deadline is real wall-clock over the whole call. The SDK's `timeout`
 *    option only bounds time-to-headers, so the runner's own race is the only
 *    thing standing between a slow generation and the platform kill.
 */

const ORDER = ["a", "b", "c"]
const HEURISTIC = {
  order: ["c", "b", "a"],
  rationale: "local",
  breathers: [],
}

function terminalEvents(events: SmartOrderEvent[]) {
  return events.filter((e) => e.type === "done" || e.type === "error")
}

function depsWith(overrides: Partial<SmartOrderRunDeps>): SmartOrderRunDeps {
  return {
    total: ORDER.length,
    deadlineMs: 120_000,
    callClaude: async () => ({
      ok: true,
      value: { order: ORDER, rationale: "model", breathers: [] },
    }),
    heuristic: () => HEURISTIC,
    classify: () => "error",
    ...overrides,
  }
}

async function run(overrides: Partial<SmartOrderRunDeps>) {
  const events: SmartOrderEvent[] = []
  await runSmartOrder(depsWith(overrides), (event) => events.push(event))
  return events
}

describe("runSmartOrder", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("answers a successful call with the model's order", async () => {
    const events = await run({})

    expect(events[0]).toEqual({ type: "start", total: 3 })
    expect(events.at(-1)).toEqual({
      type: "done",
      order: ORDER,
      source: "claude",
      reason: undefined,
    })
  })

  it("forwards the model's progress as it places tracks", async () => {
    const events = await run({
      callClaude: async (_signal, onPlaced) => {
        onPlaced(1)
        onPlaced(2)
        return {
          ok: true,
          value: { order: ORDER, rationale: "model", breathers: [] },
        }
      },
    })

    expect(events.filter((e) => e.type === "progress")).toEqual([
      { type: "progress", placed: 1, total: 3 },
      { type: "progress", placed: 2, total: 3 },
    ])
  })

  describe("the deadline", () => {
    it("answers with the heuristic even when the call never settles", async () => {
      // The hardest case: a stream that hangs forever. The SDK's own timeout
      // can't save us here (it was cleared when headers arrived), so only the
      // runner's race ends this run.
      const onTimeout = vi.fn()
      let aborted = false

      const events: SmartOrderEvent[] = []
      const running = runSmartOrder(
        depsWith({
          deadlineMs: 120_000,
          callClaude: (signal) =>
            new Promise<ClaudeCallOutcome>(() => {
              signal.addEventListener("abort", () => {
                aborted = true
              })
            }),
          onTimeout,
        }),
        (event) => events.push(event)
      )

      await vi.advanceTimersByTimeAsync(120_000)
      await running

      expect(events.at(-1)).toEqual({
        type: "done",
        order: HEURISTIC.order,
        source: "fallback",
        reason: "timeout",
      })
      // Every second a doomed stream stays open is billed: expiring the budget
      // must abort the upstream call, not just stop waiting for it.
      expect(aborted).toBe(true)
      expect(onTimeout).toHaveBeenCalledWith(120_000)
      expect(terminalEvents(events)).toHaveLength(1)
    })

    it("does not fire on a call that finishes in time", async () => {
      const onTimeout = vi.fn()

      const events = await run({ deadlineMs: 120_000, onTimeout })

      expect(onTimeout).not.toHaveBeenCalled()
      expect(events.at(-1)).toMatchObject({ type: "done", source: "claude" })
    })

    it("reads a rejection caused by its own abort as the timeout, not a new failure", async () => {
      // The SDK surfaces our abort as a thrown APIUserAbortError, which may
      // land before the deadline branch of the race does. Same cause, one
      // reason: the budget expired.
      const onFailure = vi.fn()
      const onTimeout = vi.fn()

      const events: SmartOrderEvent[] = []
      const running = runSmartOrder(
        depsWith({
          deadlineMs: 120_000,
          callClaude: (signal) =>
            new Promise<ClaudeCallOutcome>((_resolve, reject) => {
              signal.addEventListener("abort", () =>
                reject(new Error("aborted mid-stream"))
              )
            }),
          onFailure,
          onTimeout,
        }),
        (event) => events.push(event)
      )

      await vi.advanceTimersByTimeAsync(120_000)
      await running

      expect(events.at(-1)).toMatchObject({
        type: "done",
        source: "fallback",
        reason: "timeout",
      })
      expect(onFailure).not.toHaveBeenCalled()
      expect(terminalEvents(events)).toHaveLength(1)
    })
  })

  it("classifies a thrown failure and answers with the heuristic", async () => {
    const boom = new Error("rate limited")
    const onFailure = vi.fn()

    const events = await run({
      callClaude: async () => {
        throw boom
      },
      classify: (error) => (error === boom ? "rate_limited" : "error"),
      onFailure,
    })

    expect(events.at(-1)).toEqual({
      type: "done",
      order: HEURISTIC.order,
      source: "fallback",
      reason: "rate_limited",
    })
    expect(onFailure).toHaveBeenCalledWith(boom, "rate_limited")
  })

  it("answers a declined outcome with the heuristic and its reason", async () => {
    const events = await run({
      callClaude: async () => ({ ok: false, reason: "invalid_answer" }),
    })

    expect(events.at(-1)).toEqual({
      type: "done",
      order: HEURISTIC.order,
      source: "fallback",
      reason: "invalid_answer",
    })
  })

  it("still emits done when the bookkeeping after the result throws", async () => {
    // Quota writes, run records, cache, logs — none of them may cost the DJ an
    // order that is already in hand.
    const onUnexpected = vi.fn()

    const events = await run({
      afterResult: async () => {
        throw new Error("supabase hiccup")
      },
      onUnexpected,
    })

    expect(events.at(-1)).toMatchObject({ type: "done", source: "claude" })
    expect(onUnexpected).toHaveBeenCalledOnce()
  })

  it("ends with a terminal error event when even the heuristic throws", async () => {
    // The one path with no order to answer with. The stream must still end
    // with a terminal event — a cut stream is the exact bug this module fixes.
    const onUnexpected = vi.fn()

    const events = await run({
      callClaude: async () => ({ ok: false, reason: "error" }),
      heuristic: () => {
        throw new Error("heuristic bug")
      },
      onUnexpected,
    })

    expect(events.at(-1)).toEqual({ type: "error" })
    expect(terminalEvents(events)).toHaveLength(1)
    expect(onUnexpected).toHaveBeenCalledOnce()
  })

  it("ends every run, whatever happens, with exactly one terminal event", async () => {
    // The invariant on its own: no scenario below may end a stream without a
    // terminal event, or with more than one.
    const scenarios: Partial<SmartOrderRunDeps>[] = [
      {},
      { callClaude: async () => ({ ok: false, reason: "refusal" }) },
      {
        callClaude: async () => {
          throw new Error("boom")
        },
      },
      {
        afterResult: async () => {
          throw new Error("boom")
        },
      },
      {
        heuristic: () => {
          throw new Error("boom")
        },
        callClaude: async () => {
          throw new Error("boom")
        },
      },
    ]

    for (const scenario of scenarios) {
      const events = await run(scenario)
      expect(terminalEvents(events), JSON.stringify(scenario)).toHaveLength(1)
    }
  })
})
