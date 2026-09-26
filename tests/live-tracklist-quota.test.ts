import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { LiveTracklist } from "@/components/analysis/live-tracklist"

/**
 * The AI-ordering allowance is shown before the click (F1 audit, A4).
 *
 * The server has always refused an over-limit request with a 402. What was
 * missing was the page saying so first: a FREE account with its one monthly
 * ordering spent saw an enabled "Smart ordering" button that could only fail,
 * and the reading left to the person was that the product was broken.
 *
 * Rendered to static markup on purpose: the property is what the HTML says and
 * whether the button is disabled, and both are visible without a DOM.
 */
function render(aiQuota: { remaining: number | null; limit: number | null }) {
  // React escapes apostrophes as `&#x27;` in static markup; the copy has them.
  return decode(renderToStaticMarkup(
    createElement(LiveTracklist, {
      rows: [],
      movedCount: 0,
      onMove: () => {},
      manualMoveCount: 0,
      onUndoMove: () => {},
      dirty: false,
      smartStatus: "idle",
      onSmartOrder: () => {},
      onReset: () => {},
      locale: "en",
      aiQuota,
    })
  ))
}

function decode(html: string): string {
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
}

/** A <button …> whose content, icon included, ends in the Smart ordering label. */
const SMART_BUTTON = /<button(?:(?!>)[\s\S])*>(?:(?!<\/button>)[\s\S])*Smart ordering/
// `disabled=""` is how React writes the boolean attribute in static markup.
// Not `\bdisabled`: the button's class list carries `disabled:opacity-70`,
// which matched and made an enabled button look disabled.
const SMART_BUTTON_DISABLED =
  /<button(?:(?!>)[\s\S])*\sdisabled=""(?:(?!>)[\s\S])*>(?:(?!<\/button>)[\s\S])*Smart ordering/

describe("the Smart ordering button and the monthly allowance", () => {
  it("is disabled, says the allowance is spent, and offers PRO when nothing is left", () => {
    const html = render({ remaining: 0, limit: 1 })

    expect(html).toMatch(/You've used this month's AI ordering/)
    expect(html).toMatch(/href="\/pricing"/)
    // The button itself, not some other disabled control on the page. The
    // label sits after an icon, so the match walks the button's whole content.
    expect(html).toMatch(SMART_BUTTON_DISABLED)
  })

  it("says how many are left while there are some", () => {
    const html = render({ remaining: 2, limit: 3 })

    expect(html).toMatch(/2 of 3 AI orderings left this month/)
    expect(html).toMatch(SMART_BUTTON)
    expect(html).not.toMatch(SMART_BUTTON_DISABLED)
  })

  it("says nothing about a limit on an unlimited plan", () => {
    const html = render({ remaining: null, limit: null })

    expect(html).not.toMatch(/left this month|used this month/)
    expect(html).toMatch(SMART_BUTTON)
    expect(html).not.toMatch(SMART_BUTTON_DISABLED)
  })
})
