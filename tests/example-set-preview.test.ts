import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FirstRunGuide } from "@/components/dashboard/first-run-guide"
import { analyzeExampleSet } from "@/lib/product/example-set-analysis"
import { computeFirstRun } from "@/lib/product/first-run"

/**
 * Where the example set appears, and what it promises (step 1.1). Rendered to
 * static markup: what matters is what the HTML says — that the example is
 * labelled one, that it has nothing to save, and that it ends on the import.
 */

const capture = vi.hoisted(() => vi.fn())
const consent = vi.hoisted(() => ({ running: false }))

vi.mock("posthog-js", () => ({ default: { capture } }))
vi.mock("@/components/analytics/analytics-runtime", () => ({
  analyticsRunning: () => consent.running,
}))
vi.mock("@/lib/privacy/consent", () => ({ readConsent: () => null }))

function guide(playlistCount: number, locale: "es" | "en" = "es") {
  return renderToStaticMarkup(
    createElement(FirstRunGuide, {
      state: computeFirstRun({ playlistCount, scoreHistories: playlistCount ? [[]] : [] }),
      locale,
      example: analyzeExampleSet(locale),
      importHref: "#import",
    })
  )
}

describe("the example set in the first-run guide", () => {
  it("is offered beside the first step to someone with nothing imported", () => {
    const html = guide(0)

    expect(html).toMatch(/data-example-set/)
    expect(html).toMatch(/Mirá primero un set de ejemplo/)
  })

  it("goes once the first import lands", () => {
    expect(guide(1)).not.toMatch(/data-example-set/)
  })

  it("never passes for the DJ's own set", () => {
    const html = guide(0)

    expect(html).toMatch(/>Ejemplo</)
    expect(html).toMatch(/Un set de ejemplo, no es tuyo/)
    expect(html).toMatch(/No se guarda en tu cuenta ni cuenta como playlist/)
  })

  it("is read-only: nothing to submit, nothing to save", () => {
    const preview = guide(0).split("data-example-set")[1]

    expect(preview).not.toMatch(/<form|<input|type="submit"/)
  })

  it("ends on the import form, in both languages", () => {
    expect(guide(0)).toMatch(/href="#import"[^>]*>Ahora probá con lo tuyo</)
    expect(guide(0, "en")).toMatch(/href="#import"[^>]*>Now try it with yours</)
  })
})

describe("the example set's events", () => {
  beforeEach(() => {
    capture.mockClear()
  })

  it("fire nothing for someone who hasn't accepted analytics", async () => {
    consent.running = false
    const { captureExampleSetEvent } = await import("@/lib/analytics/example-set-events")

    captureExampleSetEvent("example_set_opened", "es")

    expect(capture).not.toHaveBeenCalled()
  })

  it("carry only the language once analytics is accepted", async () => {
    consent.running = true
    const { captureExampleSetEvent } = await import("@/lib/analytics/example-set-events")

    captureExampleSetEvent("example_set_import_click", "en")

    expect(capture).toHaveBeenCalledWith("example_set_import_click", { locale: "en" })
  })
})
