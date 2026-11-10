import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  clearConsent,
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VALUE,
  CONSENT_STORAGE_KEY,
  mirrorConsentToCookie,
  subscribeToConsent,
  writeConsent,
} from "@/lib/privacy/consent"

/**
 * The browser half of the consent the server reads for the sales-wall and
 * score events: a cookie that exists only while the answer is "granted".
 *
 * What a future change is most likely to break is the absence, not the
 * presence — a refusal that leaves the cookie behind is a server that keeps
 * tracking someone who said no.
 */

const store = new Map<string, string>()
let jar: Map<string, string>
let writes: string[]

function installBrowser({ dnt = null, protocol = "https:" }: { dnt?: string | null; protocol?: string } = {}) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
    navigator: { doNotTrack: dnt },
    location: { protocol },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  })

  // A cookie jar that behaves like `document.cookie` for one host-only cookie:
  // an assignment with Max-Age=0 deletes, anything else sets.
  vi.stubGlobal("document", {
    get cookie() {
      return [...jar].map(([name, value]) => `${name}=${value}`).join("; ")
    },
    set cookie(assignment: string) {
      writes.push(assignment)
      const [pair] = assignment.split(";")
      const [name, value] = pair.split("=")

      if (/max-age=0(;|$)/i.test(assignment)) {
        jar.delete(name)
      } else {
        jar.set(name, value)
      }
    },
  })
}

beforeEach(() => {
  store.clear()
  jar = new Map()
  writes = []
  vi.stubGlobal("CustomEvent", class {
    constructor(public type: string, public init?: unknown) {}
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the consent cookie the server reads", () => {
  it("is set by a yes, with the version in its value", () => {
    installBrowser()
    writeConsent("granted")

    expect(jar.get(CONSENT_COOKIE_NAME)).toBe(CONSENT_COOKIE_VALUE)
    expect(CONSENT_COOKIE_VALUE).toBe("granted.v1")
  })

  it("is host-only, Lax, Secure on https, and expires", () => {
    installBrowser()
    writeConsent("granted")

    const set = writes.at(-1)!
    expect(set).toMatch(/; Path=\/;/)
    expect(set).toMatch(/SameSite=Lax/)
    expect(set).toMatch(/; Secure$/)
    expect(set).toMatch(/Max-Age=\d{6,}/)
    expect(set).not.toMatch(/Domain=/i)
  })

  it("is not marked Secure on plain http, where the browser would drop it", () => {
    installBrowser({ protocol: "http:" })
    writeConsent("granted")

    expect(writes.at(-1)).not.toMatch(/Secure/)
    expect(jar.get(CONSENT_COOKIE_NAME)).toBe(CONSENT_COOKIE_VALUE)
  })

  it("is removed by a no", () => {
    installBrowser()
    writeConsent("granted")
    writeConsent("denied")

    expect(jar.has(CONSENT_COOKIE_NAME)).toBe(false)
  })

  it("is never created by a no", () => {
    installBrowser()
    writeConsent("denied")

    expect(jar.has(CONSENT_COOKIE_NAME)).toBe(false)
  })

  it("is removed when the answer is withdrawn", () => {
    installBrowser()
    writeConsent("granted")
    clearConsent()

    expect(jar.has(CONSENT_COOKIE_NAME)).toBe(false)
  })

  it("is not set under Do Not Track, even if a yes gets written", () => {
    installBrowser({ dnt: "1" })
    writeConsent("granted")

    expect(jar.has(CONSENT_COOKIE_NAME)).toBe(false)
  })

  it("is added on the next page for someone who said yes before it existed", () => {
    installBrowser()
    store.set(CONSENT_STORAGE_KEY, "granted")

    const unsubscribe = subscribeToConsent(() => {})
    unsubscribe()

    expect(jar.get(CONSENT_COOKIE_NAME)).toBe(CONSENT_COOKIE_VALUE)
  })

  it("is dropped on the next page if the stored answer is gone", () => {
    installBrowser()
    jar.set(CONSENT_COOKIE_NAME, CONSENT_COOKIE_VALUE)

    subscribeToConsent(() => {})()

    expect(jar.has(CONSENT_COOKIE_NAME)).toBe(false)
  })

  it("is dropped on the next page once Do Not Track is turned on", () => {
    installBrowser({ dnt: "1" })
    store.set(CONSENT_STORAGE_KEY, "granted")
    jar.set(CONSENT_COOKIE_NAME, CONSENT_COOKIE_VALUE)

    subscribeToConsent(() => {})()

    expect(jar.has(CONSENT_COOKIE_NAME)).toBe(false)
  })

  it("does nothing, and does not throw, where cookies cannot be written", () => {
    installBrowser()
    vi.stubGlobal("document", {
      set cookie(_value: string) {
        throw new Error("blocked")
      },
    })

    expect(() => mirrorConsentToCookie("granted")).not.toThrow()
  })
})
