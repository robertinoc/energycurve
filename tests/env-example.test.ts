import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * `.env.example` has to name every variable the code reads.
 *
 * Three had drifted out of it — `GETSONGBPM_API_KEY`, `CONTACT_INBOX_EMAIL` and
 * `STRIPE_PORTAL_CONFIGURATION_ID` — and the failure mode is quiet in the worst
 * way: the feature simply behaves as if it were turned off. A fresh deployment
 * has no title lookup and sends contact mail to a hardcoded address, and nothing
 * anywhere says a variable is missing.
 *
 * This walks the source for `process.env.X` rather than checking a hand-written
 * list, so a variable added next month is covered too.
 */

const ROOTS = ["app", "lib", "services", "components"]

/** Set by the platform or by tooling, not by us. */
const NOT_OURS = new Set([
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  // Injected by Vercel on every deploy. Used as the Sentry release so an issue
  // names the commit that caused it; absent locally, which is correct.
  "VERCEL_GIT_COMMIT_SHA",
  "CI",
  "npm_package_version",
])

function sourceFiles(dir: string): string[] {
  const found: string[] = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(entry)) {
      found.push(full)
    }
  }

  return found
}

const referenced = new Set<string>()

for (const root of ROOTS) {
  for (const file of sourceFiles(join(process.cwd(), root))) {
    const source = readFileSync(file, "utf8")

    for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      if (!NOT_OURS.has(match[1])) referenced.add(match[1])
    }
  }
}

const example = readFileSync(join(process.cwd(), ".env.example"), "utf8")

describe("every variable the code reads is documented", () => {
  it("finds variables to check, so the walk is not vacuous", () => {
    expect(referenced.size).toBeGreaterThan(10)
  })

  it("names all of them in .env.example", () => {
    // A commented entry counts as documented, and deliberately so: an optional
    // variable with a sensible default is best shown as `# NAME=value` — it
    // tells a reader the knob exists without making them delete a line to get a
    // working setup. Four of the five this test first reported were exactly
    // that, and only one was genuinely missing.
    const missing = [...referenced]
      .filter((name) => !new RegExp(`^#?\\s*${name}=`, "m").test(example))
      .sort()

    expect(
      missing,
      "read by the code but absent from .env.example — a fresh deploy silently runs without them"
    ).toEqual([])
  })
})

describe("and the file explains itself", () => {
  it("says what each optional integration does when unset", () => {
    // A variable listed with no explanation is a variable someone sets wrong.
    // The three that drifted were also the three with no comment.
    for (const name of [
      "GETSONGBPM_API_KEY",
      "CONTACT_INBOX_EMAIL",
      "STRIPE_PORTAL_CONFIGURATION_ID",
      "CRON_SECRET",
    ]) {
      const index = example.indexOf(`${name}=`)
      const preceding = example.slice(Math.max(0, index - 500), index)

      expect(preceding, `${name} has no explanation above it`).toMatch(/^#/m)
    }
  })
})
