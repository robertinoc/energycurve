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
