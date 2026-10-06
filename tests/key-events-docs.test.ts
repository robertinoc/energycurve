import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The key events the plan tells Robertino to mark in PostHog have to be events
 * the code emits (lote 18).
 *
 * SEO-E28 named `signup_completed` and `first_analysis`. Neither ever existed:
 * the code emits `signup` and `analysis_completed`. Marked as written, the
 * funnel stays empty and the failure looks like PostHog's — the same shape as
 * H-17, where the document said one thing and the code did another.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

/** Every event name the product can send: the server union and the content CTA. */
function emittedEvents(): Set<string> {
  const server = read("lib/analytics/posthog-server.ts")
  const union = server.slice(server.indexOf("export type AnalyticsEvent"))
  const names = [...union.slice(0, union.indexOf("\n\n")).matchAll(/\|\s*"([a-z_]+)"/g)].map(
    (match) => match[1]
  )
  const content = read("lib/analytics/content-events.ts")
  for (const match of content.matchAll(/capture\(\s*"([a-z_]+)"/g)) names.push(match[1])
  return new Set(names)
}

describe("the key events the documents ask for", () => {
  it("the server union and the content event are found at all", () => {
    const emitted = emittedEvents()
    expect(emitted.has("signup")).toBe(true)
    expect(emitted.has("analysis_completed")).toBe(true)
    expect(emitted.has("content_cta_click")).toBe(true)
  })

  it("SEO-E28 marks only events the code emits", () => {
    const row = read("docs/seo/SEO-PLAN.md")
      .split("\n")
      .find((line) => line.startsWith("| SEO-E28 |"))
    expect(row, "the SEO-E28 row").toBeTruthy()

    const instruction = row!.slice(row!.indexOf("Mark "), row!.indexOf("as key events"))
    const asked = [...instruction.matchAll(/`([a-z_]+)`/g)].map((match) => match[1])

    expect(asked.length).toBeGreaterThan(0)
    const emitted = emittedEvents()
    for (const name of asked) {
      expect(emitted.has(name), `${name} is not emitted anywhere`).toBe(true)
    }
  })
})
