import { describe, expect, it } from "vitest"

import {
  PASSWORD_MIN_LENGTH,
  evaluatePassword,
  looksCommonPassword,
  parsePasswordMinLength,
} from "@/lib/auth/password-policy"

describe("PASSWORD_MIN_LENGTH", () => {
  // Verified live against the WorkOS environment on 13 Aug 2026 — the API
  // answered `password_too_short` with `minimum_length: 10`.
  it("mirrors the WorkOS minimum", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10)
  })
})

describe("evaluatePassword", () => {
  it("reports an empty field as empty, not weak", () => {
    expect(evaluatePassword("").strength).toBe("empty")
  })

  it("fails anything under the minimum length", () => {
    const result = evaluatePassword("Ab3$xy")

    expect(result.meetsMinLength).toBe(false)
    expect(result.strength).toBe("weak")
  })

  it("passes the length rule exactly at the minimum", () => {
    const result = evaluatePassword("x".repeat(PASSWORD_MIN_LENGTH))

    expect(result.meetsMinLength).toBe(true)
  })

  it("rates a three-word passphrase strong", () => {
    const result = evaluatePassword("copper lantern drift")

    expect(result.wordCount).toBe(3)
    expect(result.strength).toBe("strong")
  })

  it("rates a long single word strong", () => {
    expect(evaluatePassword("thunderclapmarble").strength).toBe("strong")
  })

  it("rates a mid-length unremarkable password fair", () => {
    expect(evaluatePassword("Kv7rtplm2").strength).toBe(
      // 9 characters — under the minimum, so still weak.
      "weak"
    )
    expect(evaluatePassword("Kv7rtplm2q").strength).toBe("fair")
  })

  it("keeps a long common password weak despite the length", () => {
    const result = evaluatePassword("password1234")

    expect(result.meetsMinLength).toBe(true)
    expect(result.looksCommon).toBe(true)
    expect(result.strength).toBe("weak")
  })
})

describe("looksCommonPassword", () => {
  it("catches common bases behind leet substitutions", () => {
    expect(looksCommonPassword("P@ssw0rd123")).toBe(true)
  })

  it("catches keyboard runs", () => {
    expect(looksCommonPassword("qwertyuiop")).toBe(true)
  })

  it("catches a single repeated unit", () => {
    expect(looksCommonPassword("abababababab")).toBe(true)
    expect(looksCommonPassword("aaaaaaaaaaaa")).toBe(true)
  })

  it("catches sequential runs", () => {
    expect(looksCommonPassword("123456789")).toBe(true)
    expect(looksCommonPassword("abcdefghij")).toBe(true)
  })

  it("catches a digits-only password below passphrase length", () => {
    expect(looksCommonPassword("8362518407")).toBe(true)
  })

  it("does not flag an ordinary word inside a real passphrase", () => {
    expect(looksCommonPassword("copper password lantern drift")).toBe(false)
  })

  it("does not flag an unremarkable password", () => {
    expect(looksCommonPassword("Kv7rtplm2q")).toBe(false)
  })

  it("treats an empty value as not common", () => {
    expect(looksCommonPassword("")).toBe(false)
  })
})

describe("parsePasswordMinLength", () => {
  it("uses the reported value when it is a sane integer", () => {
    expect(parsePasswordMinLength("12")).toBe(12)
  })

  it("reads the first entry of a repeated param", () => {
    expect(parsePasswordMinLength(["14", "99"])).toBe(14)
  })

  it("falls back to the mirrored policy for junk input", () => {
    for (const value of [undefined, "", "abc", "-4", "0", "9.5", "9999"]) {
      expect(parsePasswordMinLength(value)).toBe(PASSWORD_MIN_LENGTH)
    }
  })
})

describe("evaluatePassword with an overridden minimum", () => {
  it("uses the minimum it is given over the mirrored constant", () => {
    const password = "x".repeat(PASSWORD_MIN_LENGTH)

    expect(evaluatePassword(password).meetsMinLength).toBe(true)
    expect(evaluatePassword(password, PASSWORD_MIN_LENGTH + 2).meetsMinLength).toBe(
      false
    )
  })
})
