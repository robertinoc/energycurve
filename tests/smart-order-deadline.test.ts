import Anthropic from "@anthropic-ai/sdk"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { classifyFailure } from "@/lib/smart-order/classify-failure"
import { finalMessageWithin } from "@/lib/smart-order/deadline"

/**
 * The SDK's `timeout` stops counting once the headers arrive, so a model that
 * thinks past the function's 60s ceiling got the request killed by the
 * platform: the DJ saw "unavailable" and no order at all. The deadline has to
 * cover the whole stream, and what it raises has to read as a timeout, so the
 * route falls back to the heuristic instead of dying.
 */

function hangingStream() {
  let reject: (error: unknown) => void = () => {}
  const finalMessage = new Promise<string>((_, r) => {
    reject = r
  })

  return {
    finalMessage: () => finalMessage,
    abort: vi.fn(() => reject(new Anthropic.APIUserAbortError())),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("finalMessageWithin", () => {
  it("aborts a stream that runs past the budget, as a timeout", async () => {
    const stream = hangingStream()
    const result = finalMessageWithin(stream, 40_000).catch((error) => error)

    await vi.advanceTimersByTimeAsync(39_999)
    expect(stream.abort).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(stream.abort).toHaveBeenCalledTimes(1)
    expect(classifyFailure(await result)).toBe("timeout")
  })

  it("leaves a stream that answers in time alone", async () => {
    const stream = { finalMessage: async () => "order", abort: vi.fn() }

    await expect(finalMessageWithin(stream, 40_000)).resolves.toBe("order")
    await vi.advanceTimersByTimeAsync(60_000)
    expect(stream.abort).not.toHaveBeenCalled()
  })
})
