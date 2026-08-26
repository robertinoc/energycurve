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

  it("stays within the 60s ceiling every Vercel plan allows", () => {
    // Above this, Hobby deployments reject the config outright rather than
    // clamping it — so a larger number breaks the deploy, not just the request.
    expect(numericExport("maxDuration")).toBeLessThanOrEqual(60)
  })

  it("gives Claude a deadline strictly inside the function budget", () => {
    const budget = numericExport("maxDuration")
    const clientMs = source.match(/CLAUDE_TIMEOUT_MS\s*=\s*([\d_]+)/)

    expect(budget).not.toBeNull()
    expect(clientMs).not.toBeNull()

    const clientSeconds = Number(clientMs![1].replace(/_/g, "")) / 1000

    // Not just "less than": the platform killing us returns a bodiless 504, so
    // the fallback order never reaches the client. Aborting ourselves first is
    // what makes the difference between a heuristic order and a dead request,
    // and that needs room for the response to be assembled and sent.
    expect(clientSeconds).toBeLessThan(budget! - 5)
  })
})
