import { describe, expect, it } from "vitest"

import { buildBrandedEmail } from "@/lib/email/build-email-html"

describe("buildBrandedEmail", () => {
  it("renders heading, paragraphs, button, and footnote into the HTML", () => {
    const { html } = buildBrandedEmail({
      preview: "Preview line",
      heading: "Reset your password",
      paragraphs: ["First paragraph.", "Second paragraph."],
      button: { label: "Reset password", url: "https://energycurve.app/x" },
      footnote: "Expires soon.",
    })

    expect(html).toContain("Reset your password")
    expect(html).toContain("First paragraph.")
    expect(html).toContain("Second paragraph.")
    expect(html).toContain("https://energycurve.app/x")
    expect(html).toContain("Expires soon.")
    expect(html).toContain("Preview line")
    expect(html.startsWith("<!doctype html>")).toBe(true)
  })

  it("builds a plain-text fallback from the same content", () => {
    const { text } = buildBrandedEmail({
      preview: "p",
      heading: "Reset your password",
      paragraphs: ["Do the thing."],
      button: { label: "Reset password", url: "https://energycurve.app/x" },
      footnote: "Expires soon.",
    })

    expect(text).toContain("Reset your password")
    expect(text).toContain("Do the thing.")
    expect(text).toContain("Reset password: https://energycurve.app/x")
    expect(text).toContain("Expires soon.")
    expect(text).toContain("energycurve.app")
  })

  it("escapes HTML in user-facing content to prevent injection", () => {
    const { html } = buildBrandedEmail({
      preview: "p",
      heading: "Hi <script>alert(1)</script>",
      paragraphs: ["a & b < c"],
    })

    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("a &amp; b &lt; c")
  })

  it("omits button and footnote when not provided", () => {
    const { html, text } = buildBrandedEmail({
      preview: "p",
      heading: "Welcome",
      paragraphs: ["Thanks for joining."],
    })

    expect(html).not.toContain("<a href")
    expect(text).not.toContain("http")
  })
})

describe("character encoding", () => {
  it("declares utf-8 in the document, not only in the MIME header", () => {
    // Without this, a client that reads the document instead of the header —
    // older Outlook, or anyone forwarding the saved HTML — renders every em dash
    // and apostrophe as mojibake. It was missing since this builder was written.
    const { html } = buildBrandedEmail({
      preview: "p",
      heading: "h",
      paragraphs: ["b"],
    })

    expect(html).toContain('<meta charset="utf-8" />')
    expect(html.indexOf("<meta charset")).toBeLessThan(html.indexOf("<body"))
  })

  it("survives a full round trip through utf-8 bytes", () => {
    // The actual failure, reproduced: encode as utf-8 and decode as latin-1 and
    // the dash breaks. Asserting the bytes decode back cleanly is what pins it.
    const { html, text } = buildBrandedEmail({
      preview: "Preview — with punctuation",
      heading: "You're on PRO — welcome",
      paragraphs: ["Warm-up, peak time — after-hours. ¿Y la tonalidad? Sí."],
    })

    for (const body of [html, text]) {
      const roundTripped = new TextDecoder("utf-8").decode(
        new TextEncoder().encode(body)
      )

      expect(roundTripped).toBe(body)
      expect(roundTripped).toContain("—")
      expect(roundTripped).not.toContain("â€")
    }
  })
})
