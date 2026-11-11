import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The CPU budgets run apart from the default suite (vitest.budget.config.ts),
 * and a test that was moved out of the way is one edit from never running
 * again. This holds the two things that move was for: the budgets are not
 * measured under coverage, and they are not skipped.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const budgetFiles = readdirSync(join(process.cwd(), "tests/budget"))

describe("the CPU budgets", () => {
  it("exist, and are named so the default suite cannot pick them up", () => {
    expect(budgetFiles).toContain("reorder.budget.ts")

    for (const file of budgetFiles) {
      // The default glob is *.test.* / *.spec.*: a budget under either name
      // would run under coverage in CI again, which is the bug this fixed.
      expect(file, file).toMatch(/\.budget\.ts$/)
      expect(file, file).not.toMatch(/\.(test|spec)\./)
    }
  })

  it("run from their own config, with coverage off", () => {
    const config = read("vitest.budget.config.ts")

    expect(config).toContain('include: ["tests/budget/**/*.budget.ts"]')
    expect(config).toMatch(/coverage:\s*\{\s*enabled:\s*false\s*\}/)

    const scripts = JSON.parse(read("package.json")).scripts as Record<string, string>

    expect(scripts["test:budget"]).toBe("vitest run --config vitest.budget.config.ts")
    expect(scripts["test:budget"]).not.toContain("--coverage")
  })

  it("still run in CI, as a step that cannot be skipped by a coverage failure", () => {
    const ci = read(".github/workflows/ci.yml")
    const step = ci.slice(ci.indexOf("- name: CPU budgets, without coverage"))
    const body = step.slice(0, step.indexOf("\n      - name:", 1))

    expect(body).toContain("run: npm run test:budget")
    expect(body).toContain("if: ${{ !cancelled() }}")
    expect(body).not.toMatch(/continue-on-error/)
  })

  it("the reorder budget is asserted, not skipped, and is not a formality", () => {
    const source = read("tests/budget/reorder.budget.ts")

    expect(source).not.toMatch(/\b(it|test|describe)\.(skip|todo|only|skipIf|runIf)\b/)
    expect(source).toContain("expect(ms).toBeLessThan(BUDGET_MS)")

    const budget = Number(/const BUDGET_MS = ([\d_]+)/.exec(source)?.[1].replace(/_/g, ""))

    // Below the 15 s it was while instrumented. Raising it past that would be
    // loosening it twice: once by dropping the instrumentation, once by hand.
    expect(budget).toBeGreaterThan(0)
    expect(budget).toBeLessThan(15_000)
  })

  it("the default suite no longer times the search", () => {
    expect(read("tests/reorder.test.ts")).not.toMatch(/cpuUsage|toBeLessThan\(15_000\)/)
  })
})
