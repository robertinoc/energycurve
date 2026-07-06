/**
 * Shared branded HTML shell for transactional emails (pattern adapted from
 * StageLink). Wraps body content in a consistent EnergyCurve layout —
 * wordmark header, dark card, optional CTA button, footer — so every email
 * looks the same and adding a new one is just supplying title + paragraphs.
 * Inline styles only (email clients strip <style>/external CSS).
 */

const BRAND = {
  bg: "#08050F",
  card: "#14101F",
  text: "#F4F1FA",
  muted: "#9E97B4",
  purple: "#A24DE0",
  cyan: "#22D3EE",
  border: "rgba(255,255,255,0.10)",
} as const

export interface EmailButton {
  label: string
  url: string
}

export interface BrandedEmailOptions {
  /** Preheader — the grey preview line shown in the inbox list. */
  preview: string
  heading: string
  /** Body paragraphs, rendered in order. */
  paragraphs: string[]
  button?: EmailButton
  /** Small print under the button (e.g. link expiry, ignore-if-not-you). */
  footnote?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Renders the branded HTML plus a plain-text fallback built from the same
 * content, so callers get both bodies from one source of truth.
 */
export function buildBrandedEmail(options: BrandedEmailOptions): {
  html: string
  text: string
} {
  const paragraphsHtml = options.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.text};">${escapeHtml(p)}</p>`
    )
    .join("")

  const buttonHtml = options.button
    ? `<p style="margin:24px 0;">
        <a href="${options.button.url}" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,${BRAND.purple},${BRAND.cyan});color:#0B0B0F;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">${escapeHtml(options.button.label)}</a>
      </p>`
    : ""

  const footnoteHtml = options.footnote
    ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(options.footnote)}</p>`
    : ""

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${BRAND.bg};">
    <span style="display:none;font-size:1px;color:${BRAND.bg};max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(options.preview)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 8px;">
                <span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.02em;color:${BRAND.text};">ENERGY<span style="color:${BRAND.purple};">CURVE</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${BRAND.text};">${escapeHtml(options.heading)}</h1>
                ${paragraphsHtml}
                ${buttonHtml}
                ${footnoteHtml}
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.muted};">EnergyCurve · energycurve.app</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const textParts = [
    options.heading,
    "",
    ...options.paragraphs,
  ]
  if (options.button) {
    textParts.push("", `${options.button.label}: ${options.button.url}`)
  }
  if (options.footnote) {
    textParts.push("", options.footnote)
  }
  textParts.push("", "EnergyCurve · energycurve.app")

  return { html, text: textParts.join("\n") }
}
