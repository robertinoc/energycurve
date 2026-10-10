import { afterEach, describe, expect, it, vi } from "vitest"

import {
  KEY_ENV,
  URLS,
  appendRow,
  formatCell,
  formatRow,
  run,
  tableHeader,
} from "../scripts/psi-log.mjs"

/**
 * SEO-E31's script, without a key (lote 19).
 *
 * The real API is never called here: `fetchImpl` returns canned responses in
 * the shape PageSpeed Insights v5 answers with. What is under test is the part
 * that can be wrong without anyone noticing — the row, and what happens when
 * the key or the API is not there.
 */

const KEY = "AIza-not-a-real-key-0123456789"

const ok = (lcp: number, field = true) => ({
  lighthouseResult: {
    lighthouseVersion: "12.6.0",
    categories: { performance: { score: 0.78 } },
    audits: {
      "largest-contentful-paint": { numericValue: lcp },
      "cumulative-layout-shift": { numericValue: 0.012 },
      "total-blocking-time": { numericValue: 143.4 },
    },
  },
  loadingExperience: field
    ? {
        metrics: {
          LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2300 },
          INTERACTION_TO_NEXT_PAINT: { percentile: 180 },
          CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 },
        },
        origin_fallback: true,
      }
    : {},
})

function fakeFetch(bodies: Array<{ status: number; body: unknown }>) {
  let call = 0
  const urls: string[] = []
  const impl = async (url: string) => {
    urls.push(url)
    const { status, body } = bodies[call++ % bodies.length]
    return {
      ok: status === 200,
      status,
      statusText: "x",
      json: async () => body,
    }
  }
  return { impl, urls }
}

afterEach(() => vi.restoreAllMocks())

describe("without a key", () => {
  it("fails loudly, names the variable, and measures nothing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const { impl, urls } = fakeFetch([{ status: 200, body: ok(3000) }])

    expect(await run({ env: {}, fetchImpl: impl, dryRun: true })).toBe(1)
    expect(urls).toHaveLength(0)
    expect(error.mock.calls[0][0]).toContain(`Falta ${KEY_ENV}`)
    expect(error.mock.calls[0][0]).toContain("No se escribió ninguna fila")
  })
})

describe("the row", () => {
  it("has the date, the Lighthouse version and one cell per URL", () => {
    const row = formatRow("2026-10-12", URLS.map(() => ok(3480)))
    const cells = row.split(" | ")
    expect(row.startsWith("| 2026-10-12 | 12.6.0 | ")).toBe(true)
    expect(cells).toHaveLength(2 + URLS.length)
    expect(tableHeader().split("\n")[0].split(" | ")).toHaveLength(2 + URLS.length)
  })

  it("prints lab and field numbers as the API gave them", () => {
    expect(formatCell(ok(3480))).toBe(
      "LCP 3.5 s · CLS 0.01 · TBT 143 ms · 78/100<br>campo: LCP 2.3 s · INP 180 ms · CLS 0.05 (origen)"
    )
  })

  it("says there is no field data instead of leaving it blank", () => {
    expect(formatCell(ok(3480, false))).toContain("campo: sin datos de campo")
  })

  it("says an API error for that URL, in its cell", () => {
    expect(formatCell({ error: { code: 500, message: "Lighthouse returned error: NO_FCP" } })).toBe(
      "error 500: Lighthouse returned error: NO_FCP"
    )
  })

  it("appends under the existing table, header written only once", () => {
    const first = appendRow("", "| a |")
    const second = appendRow(first, "| b |")
    expect(second.match(/# Registro de Core Web Vitals/g)).toHaveLength(1)
    expect(second.trimEnd().endsWith("| a |\n| b |")).toBe(true)
  })
})

describe("with a key and a failing API", () => {
  it("one URL failing still writes the row, and the cell says so", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const { impl, urls } = fakeFetch([
      { status: 200, body: ok(3000) },
      { status: 500, body: { error: { code: 500, message: "Internal error" } } },
    ])

    expect(await run({ env: { [KEY_ENV]: KEY }, fetchImpl: impl, dryRun: true })).toBe(0)
    expect(urls).toHaveLength(URLS.length)
    const row = log.mock.calls[0][0] as string
    expect(row).toContain("error 500: Internal error")
    expect(row).toContain("LCP 3.0 s")
  })

  it("all six failing writes nothing and exits 1", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const { impl } = fakeFetch([
      { status: 400, body: { error: { code: 400, message: `API key not valid: ${KEY}` } } },
    ])

    expect(await run({ env: { [KEY_ENV]: KEY }, fetchImpl: impl, dryRun: true })).toBe(1)
    expect(log).not.toHaveBeenCalled()
    // The key never reaches the output, even when the API echoes it back.
    expect(error.mock.calls[0][0]).not.toContain(KEY)
    expect(error.mock.calls[0][0]).toContain("***")
  })

  it("asks for mobile and passes the key only in the request", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    const { impl, urls } = fakeFetch([{ status: 200, body: ok(3000) }])
    await run({ env: { [KEY_ENV]: KEY }, fetchImpl: impl, dryRun: true })
    const first = new URL(urls[0])
    expect(first.searchParams.get("strategy")).toBe("mobile")
    expect(first.searchParams.get("url")).toBe("https://energycurve.app/")
    expect(first.searchParams.get("key")).toBe(KEY)
  })
})
