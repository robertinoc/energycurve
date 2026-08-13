import { describe, expect, it } from "vitest"

import {
  AUTH_ALERT_COPY,
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
