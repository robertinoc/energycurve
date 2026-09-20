import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  AUTH_ALERT_COPY,
  AUTH_PAGE_COPY,
  PASSWORD_FIELD_COPY,
  getAuthAlertCopy,
} from "@/lib/content/auth-copy"
import { supportedLocales } from "@/lib/content/site-copy"

function collectLeaves(
  node: unknown,
  path: string,
  leaves: Array<{ path: string; label: Record<string, string> }>
) {
  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>
    const keys = Object.keys(record)
    const isLeaf =
      keys.length > 0 &&
      keys.every(
        (key) =>
          (supportedLocales as readonly string[]).includes(key) &&
          typeof record[key] === "string"
      )

    if (isLeaf) {
      leaves.push({ path, label: record as Record<string, string> })
      return
    }

    for (const key of keys) {
      collectLeaves(record[key], `${path}.${key}`, leaves)
    }
  }
}

function allLeaves() {
  const leaves: Array<{ path: string; label: Record<string, string> }> = []
  collectLeaves(AUTH_ALERT_COPY, "AUTH_ALERT_COPY", leaves)
  collectLeaves(PASSWORD_FIELD_COPY, "PASSWORD_FIELD_COPY", leaves)
  collectLeaves(AUTH_PAGE_COPY, "AUTH_PAGE_COPY", leaves)
  return leaves
}

describe("auth copy", () => {
  it("has a non-empty string for every locale on every label", () => {
    const leaves = allLeaves()

    expect(leaves.length).toBeGreaterThan(20)

    for (const { path, label } of leaves) {
      for (const locale of supportedLocales) {
        expect(label[locale], `${path} (${locale})`).toBeTruthy()
      }
    }
  })

  it("keeps template slots consistent across locales", () => {
    const slotsOf = (template: string) =>
      [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

    for (const { path, label } of allLeaves()) {
      expect(slotsOf(label.es), `${path} slots`).toEqual(slotsOf(label.en))
    }
  })

  // The whole point of the change: the old copy named an internal vendor and
  // told the user to "choose a stronger password" without saying what would
  // make it stronger. Neither may come back.
  it("never sends the user to a vendor they cannot see", () => {
    for (const { path, label } of allLeaves()) {
      for (const locale of supportedLocales) {
        expect(label[locale].toLowerCase(), `${path} (${locale})`).not.toContain(
          "workos"
        )
      }
    }
  })

  /**
   * The login button read "Login" in Spanish too, because it was an English
   * literal in the JSX — on a page that already had `locale` as a prop and was
   * already using it for the alerts and the password field. So a Spanish
   * visitor got errors in Spanish and the button they had to press in English.
   *
   * Scanning the source rather than rendering: what broke here was not the
   * output for one locale, it was that a string existed somewhere the locale
   * could not reach. A render test only catches the strings you thought to
   * assert on; this catches the next one somebody adds.
   */
  it("leaves no user-facing literal in the auth page", () => {
    const source = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "components/auth/password-auth-page.tsx"
      ),
      "utf8"
    )

    // Props whose values are machine-facing: routes, form wiring, Tailwind,
    // SVG geometry. Everything a reader sees has to come from the copy module,
    // so anything left quoted after these are removed is a finding.
    const TECHNICAL_PROP =
      /\b(?:className|href|name|id|type|autoComplete|htmlFor|viewBox|fill|d|tone|size|kind|variant|xmlns|role|clipRule|fillRule|stroke|strokeWidth|strokeLinecap|strokeLinejoin)="[^"]*"/g

    const scannable = source
      .replace(TECHNICAL_PROP, "")
      .replace(/^\s*(?:import|interface|type)\b.*$/gm, "")

    // A user-facing string is capitalized, or has a space in it. A machine one
    // ("email", "current-password", "you@example.com") is neither.
    const literals = [...scannable.matchAll(/"([^"\n]{2,})"/g)]
      .map((match) => match[1])
      .filter((value) => /^[A-Z]/.test(value) || value.includes(" "))
      .filter((value) => value !== "you@example.com")

    // Bare JSX text: >Some words</  — the closing `</` is what tells a real
    // text node apart from a type signature like `=> Promise<void>`.
    const textNodes = [...scannable.matchAll(/>\s*([A-Za-z][A-Za-z'’?!,. ]{3,})\s*<\//g)]
      .map((match) => match[1].trim())

    expect(literals, "hard-coded strings").toEqual([])
    expect(textNodes, "hard-coded text nodes").toEqual([])
  })

  it("offers the passphrase escape hatch on every password rejection", () => {
    const passwordAlerts = [
      "passwordTooShort",
      "passwordBreached",
      "passwordContainsEmail",
      "passwordMissingCharacter",
      "passwordTooWeak",
      "weakPassword",
    ] as const

    for (const key of passwordAlerts) {
      expect(
        AUTH_ALERT_COPY[key].description.en.toLowerCase(),
        `${key} (en)`
      ).toContain("passphrase")
      expect(
        AUTH_ALERT_COPY[key].description.es.toLowerCase(),
        `${key} (es)`
      ).toContain("frase")
    }
  })
})

describe("getAuthAlertCopy", () => {
  it("resolves each password reason to its own message", () => {
    const short = getAuthAlertCopy({
      errorCode: "password_too_short",
      locale: "en",
      minLength: 10,
    })
    const breached = getAuthAlertCopy({
      errorCode: "password_breached",
      locale: "en",
      minLength: 10,
    })

    expect(short?.description).toContain("at least 10 characters")
    expect(breached?.title).toContain("data breaches")
    expect(short?.title).not.toBe(breached?.title)
  })

  it("quotes the minimum length it was given", () => {
    const copy = getAuthAlertCopy({
      errorCode: "password_too_short",
      locale: "es",
      minLength: 14,
    })

    expect(copy?.description).toContain("14")
    expect(copy?.description).not.toContain("{min}")
  })

  it("prefers the success and sign-out states over an error code", () => {
    expect(
      getAuthAlertCopy({
        errorCode: "auth",
        locale: "en",
        minLength: 10,
        resetSuccess: true,
      })?.title
    ).toBe(AUTH_ALERT_COPY.passwordUpdated.title.en)

    expect(
      getAuthAlertCopy({
        errorCode: "auth",
        locale: "en",
        minLength: 10,
        loggedOut: true,
      })?.title
    ).toBe(AUTH_ALERT_COPY.signedOut.title.en)
  })

  it("returns nothing for no error and for codes it does not know", () => {
    expect(getAuthAlertCopy({ locale: "en", minLength: 10 })).toBeUndefined()
    expect(
      getAuthAlertCopy({ errorCode: "not_a_real_code", locale: "en", minLength: 10 })
    ).toBeUndefined()
  })
})
