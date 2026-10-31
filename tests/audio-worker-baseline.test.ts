/**
 * Pins what the feature worker returns today, so the optional whole-track
 * envelope (CUE points, phase A) can be added without moving a single number on
 * the path the import uses.
 *
 * The fixture was captured from the worker as it stood on origin/main before the
 * envelope existed (15def0d). Comparison is by relative tolerance, not by exact
 * bits: CI runs a different Node than the machine that captured it, and a last-bit
 * difference in Math.log between V8 releases is not a behaviour change.
 */

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { beforeAll, describe, expect, it } from "vitest"

import type { WorkerRequest, WorkerResponse } from "@/lib/audio/analysis-types"

import { deterministicSignal } from "./helpers/audio-signal"

const FIXTURE = fileURLToPath(
  new URL("./fixtures/audio-worker-baseline.json", import.meta.url)
)

const RATE = 11_025

type Handler = (event: { data: WorkerRequest }) => void

const posted: WorkerResponse[] = []
let handler: Handler

beforeAll(async () => {
  // The worker registers itself on `self` at import time and answers through
  // `self.postMessage`, so a plain object standing in for the worker scope is all
  // it needs to run in Node.
  const scope = {
    postMessage: (message: WorkerResponse) => posted.push(message),
    onmessage: null as Handler | null,
  }
  ;(globalThis as unknown as { self: typeof scope }).self = scope
  await import("@/lib/audio/analyze-features.worker")
  handler = scope.onmessage as unknown as Handler
})

function run(request: Omit<WorkerRequest, "id">): WorkerResponse {
  posted.length = 0
  handler({ data: { id: "t", ...request } })
  expect(posted).toHaveLength(1)
  return posted[0]
}

/** Everything the response carries except wall-clock, which is never stable. */
function stable(response: WorkerResponse) {
  if (!response.ok) {
    throw new Error(response.error)
  }
  const rest: Record<string, unknown> = { ...response }
  delete rest.analyzeMs
  return JSON.parse(JSON.stringify(rest)) as Record<string, unknown>
}

function expectClose(actual: unknown, expected: unknown, path = "$"): void {
  if (typeof expected === "number") {
    expect(typeof actual, path).toBe("number")
    const scale = Math.max(1e-12, Math.abs(expected))
    expect(Math.abs((actual as number) - expected) / scale, path).toBeLessThan(
      1e-9
    )
    return
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true)
    expect((actual as unknown[]).length, path).toBe(expected.length)
    expected.forEach((value, index) =>
      expectClose((actual as unknown[])[index], value, `${path}[${index}]`)
    )
    return
  }
  if (expected && typeof expected === "object") {
    expect(actual && typeof actual, path).toBe("object")
    expect(Object.keys(actual as object).sort(), path).toEqual(
      Object.keys(expected).sort()
    )
    for (const [key, value] of Object.entries(expected)) {
      expectClose((actual as Record<string, unknown>)[key], value, `${path}.${key}`)
    }
    return
  }
  expect(actual, path).toEqual(expected)
}

// Each run is a full Meyda pass over 40–100 s of audio: a few seconds, not ms.
const SLOW = 30_000

describe("feature worker, default path", () => {
  // 100 s: long enough that the three 30-second windows are sampled rather than
  // the track being analysed whole, which is the path every real import takes.
  const long = () => [deterministicSignal(100, RATE)]
  // 40 s: under the 90 s threshold, so analysed whole — the other branch.
  const short = () => [deterministicSignal(40, RATE)]

  it("returns exactly what it returned before the envelope existed", () => {
    const expected = JSON.parse(readFileSync(FIXTURE, "utf8")) as {
      long: Record<string, unknown>
      short: Record<string, unknown>
    }

    expectClose(stable(run({ channels: long(), sampleRate: RATE })), expected.long)
    expectClose(
      stable(run({ channels: short(), sampleRate: RATE })),
      expected.short
    )
  }, SLOW)

  it("adds the envelope only when asked, and moves nothing else", () => {
    const off = stable(run({ channels: long(), sampleRate: RATE }))
    const on = stable(run({ channels: long(), sampleRate: RATE, envelope: true }))

    expect(off).not.toHaveProperty("envelope")
    expect(off).not.toHaveProperty("envelopeMs")

    const { envelope, envelopeMs, ...rest } = on as Record<string, unknown> & {
      envelope: {
        full: number[]
        low: number[]
        lowFine: number[]
        secondsPerPoint: number
      }
      envelopeMs: number
    }
    // Same arithmetic in the same process: these are bit-identical, not close.
    expect(rest).toEqual(off)
    expect(envelopeMs).toBeGreaterThanOrEqual(0)
    // The whole 100 s, not the 90 s the feature pass samples. At 11 025 Hz the
    // hops round (110 and 5 500 samples), so a point is 0.4989 s and 100 s needs
    // 201 of them; at 44.1 and 48 kHz the half second is exact.
    expect(envelope.secondsPerPoint).toBeCloseTo(5_500 / RATE, 12)
    expect(envelope.full).toHaveLength(Math.ceil((100 * RATE) / 5_500))
    expect(envelope.low).toHaveLength(envelope.full.length)
    expect(envelope.lowFine).toHaveLength(Math.ceil((100 * RATE) / 110))
  }, SLOW)
})
