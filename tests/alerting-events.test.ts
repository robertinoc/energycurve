import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Keeps `docs/security/alerting.md` from describing events that do not exist.
 *
 * An alert catalogue is worth exactly as much as the events it names. Rename
 * `billing.webhook.bad_signature` in a refactor and the document still reads
 * fine, the alert still "exists", and it fires never — which is worse than not
 * having written it, because the row in the table says the case is covered.
 *
 * So the document's event names are extracted from the document itself and
 * checked against what the code emits. Both directions are wrong in their own
 * way: a name in the doc that the code never emits is a dead alert, and this
 * catches it.
 */

const DOC = readFileSync(
  join(process.cwd(), "docs/security/alerting.md"),
  "utf8"
)

/**
 * Every `event` string passed to the structured logger, read out of the source
 * rather than maintained as a list here — a list would be the second thing to
 * drift.
 */
function emittedEvents(): Set<string> {
  const output = execSync(
    `grep -rhoE 'log(Error|Warn|Info)\\("[a-z_.]+"' --include='*.ts' --include='*.tsx' app lib services`,
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
  )

  return new Set(
    output
      .split("\n")
      .map((line) => line.match(/"([a-z_.]+)"/)?.[1])
      .filter((name): name is string => Boolean(name))
  )
}

/**
 * Event names the document cites, taken only from inside backticks: prose like
 * "the retention sweep" is not a claim about an event, and picking up ordinary
 * words would make this check noisy enough to be disabled.
 */
function citedEvents(): string[] {
  const matches = DOC.matchAll(/`([a-z]+(?:\.[a-z_]+)+)`/g)

  return [...new Set([...matches].map((match) => match[1]))].filter(
    // Paths and filenames also live in backticks and also contain dots.
    (name) => !name.includes("/") && !/\.(ts|tsx|md|json|yml)$/.test(name)
  )
}

describe("the alert catalogue names real events", () => {
  const emitted = emittedEvents()
  const cited = citedEvents()

  it("read both sides, so the comparison isn't vacuous", () => {
    expect(emitted.size).toBeGreaterThan(100)
    expect(cited.length).toBeGreaterThan(10)
  })

  it("cites nothing the code does not emit", () => {
    const dead = cited.filter((name) => !emitted.has(name))

    expect(dead).toEqual([])
  })
})

describe("the two events this phase added", () => {
  const emitted = emittedEvents()

  it("logs a webhook arriving with no signature at all", () => {
    // A *bad* signature was already logged; a missing one returned 400 in
    // silence, which is the cheaper probe to run and was the invisible one.
    expect(emitted.has("billing.webhook.missing_signature")).toBe(true)
  })

  it("logs a signed-in non-admin reaching /backstage", () => {
    // The silent redirect stays — the panel must not advertise itself — but it
    // now leaves a record, because repeated attempts are the only authorisation
    // anomaly this product can actually have.
    expect(emitted.has("backstage.non_admin_attempt")).toBe(true)
  })
})

describe("what the document promises about its own limits", () => {
  it("still says the rate limiter is per-instance", () => {
    // The `*_rate_limited` thresholds are only honest while this is true. If a
    // distributed limiter ever lands, this test failing is the reminder that
    // those rows now mean something different.
    expect(DOC).toMatch(/por instancia/)
    expect(readFileSync(join(process.cwd(), "lib/rate-limit.ts"), "utf8")).toMatch(
      /new Map|Map</
    )
  })
})
