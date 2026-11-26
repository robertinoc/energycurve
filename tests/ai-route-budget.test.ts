import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The smart-order route calls Claude, which takes tens of seconds. Without an
 * explicit `maxDuration` the platform applies its own default — 10-15s — and
 * kills the function mid-request. The user never sees an error, only the
 * heuristic fallback with "Claude didn't answer in time", every single time.
 *
 * Scanned from source rather than imported because these are build-time route
 * config exports: importing the module would drag in the Anthropic client and
 * the auth stack, and would not tell us whether Next can see the value.
 */
const ROUTE = "app/api/playlists/[id]/smart-order/route.ts"

const source = readFileSync(join(process.cwd(), ROUTE), "utf8")

function numericExport(name: string): number | null {
  const match = source.match(new RegExp(`export const ${name}\\s*=\\s*(\\d+)`))
  return match ? Number(match[1]) : null
}

describe("smart-order route budget", () => {
  it("declares a maxDuration", () => {
    expect(numericExport("maxDuration")).not.toBeNull()
  })

  it("stays within the 300s ceiling of this project's plan", () => {
    // This assertion used to say 60, with a comment claiming 60s was the
    // ceiling on every Vercel plan — which is what made the platform kill look
    // unavoidable. It isn't: this project runs Hobby with Fluid compute, where
    // 300s is both the default and the maximum (read from the Vercel project
    // API and the duration docs on 26/11/2026). Above the plan's ceiling the
    // deploy is rejected outright rather than clamped, so a larger number
    // breaks the deploy, not just the request.
    expect(numericExport("maxDuration")).toBeLessThanOrEqual(300)
  })

  it("gives Claude a deadline strictly inside the function budget", () => {
    const budget = numericExport("maxDuration")
    const deadlineMs = source.match(/SMART_ORDER_DEADLINE_MS\s*=\s*([\d_]+)/)

    expect(budget).not.toBeNull()
    expect(deadlineMs).not.toBeNull()

    const deadlineSeconds = Number(deadlineMs![1].replace(/_/g, "")) / 1000

    // Not just "less than": the platform killing us returns a bodiless 504, so
    // the fallback order never reaches the client. Aborting ourselves first is
    // what makes the difference between a heuristic order and a dead request,
    // and that needs room for the heuristic to run (~2s measured at 80 tracks)
    // and the response to be assembled and sent.
    expect(deadlineSeconds).toBeLessThan(budget! - 5)
  })

  it("keeps the headers timeout inside the whole-call deadline", () => {
    // CLAUDE_TIMEOUT_MS only bounds the wait for response headers (the SDK
    // clears its timer when the fetch resolves, i.e. at headers) — the
    // whole-call bound is SMART_ORDER_DEADLINE_MS. If the headers allowance
    // ever grew past the deadline it would be dead letter, which is how the
    // old configuration quietly had no real budget at all.
    const clientMs = source.match(/CLAUDE_TIMEOUT_MS\s*=\s*([\d_]+)/)
    const deadlineMs = source.match(/SMART_ORDER_DEADLINE_MS\s*=\s*([\d_]+)/)

    expect(clientMs).not.toBeNull()
    expect(deadlineMs).not.toBeNull()

    expect(Number(clientMs![1].replace(/_/g, ""))).toBeLessThan(
      Number(deadlineMs![1].replace(/_/g, ""))
    )
  })
})
