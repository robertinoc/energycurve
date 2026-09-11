import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  analyticsAllowed,
  clearConsent,
  CONSENT_CHANGE_EVENT,
  CONSENT_STORAGE_KEY,
  hasDoNotTrack,
  readConsent,
  shouldAskForConsent,
  subscribeToConsent,
  writeConsent,
} from "@/lib/privacy/consent"
import { redactUrl } from "@/components/analytics/analytics-tracker"

/**
 * Analytics consent. PostHog used to initialise on first paint with
 * `localStorage+cookie` persistence and ask nobody, which under ePrivacy is
 * analytics without consent — gap 4 of the RoPA.
 *
 * The tests worth having here are the ones about the *defaults*, because those
 * are what a future change is most likely to get wrong: silence means no, a
 * broken storage means no, and Do Not Track means no without being asked.
 */

const store = new Map<string, string>()

function installBrowser({ dnt = null }: { dnt?: string | null } = {}) {
  const listeners = new Map<string, Set<(event: Event) => void>>()

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
    navigator: { doNotTrack: dnt },
    addEventListener: (type: string, fn: (event: Event) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(fn)
    },
    removeEventListener: (type: string, fn: (event: Event) => void) => {
      listeners.get(type)?.delete(fn)
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((fn) => fn(event))
      return true
    },
  })

  return listeners
}

beforeEach(() => {
  store.clear()
  installBrowser()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("silence is a no", () => {
  it("starts unset, and unset does not allow analytics", () => {
    expect(readConsent()).toBe("unset")
    expect(analyticsAllowed(readConsent())).toBe(false)
  })

  it("asks, rather than assuming, when nothing is stored", () => {
    expect(shouldAskForConsent(readConsent())).toBe(true)
  })

  it("treats a corrupted stored value as unset rather than as a yes", () => {
    // Someone else's key collision, a half-written value, a migration — the
    // safe reading of anything unrecognised is "we never asked".
    store.set(CONSENT_STORAGE_KEY, "true")

    expect(readConsent()).toBe("unset")
    expect(analyticsAllowed(readConsent())).toBe(false)
  })
})

describe("Do Not Track answers on the visitor's behalf", () => {
  it("reads as denied without consulting storage", () => {
    installBrowser({ dnt: "1" })
    // Even with a stored yes: the browser signal is newer information than a
    // click from some previous visit, and it says no.
    store.set(CONSENT_STORAGE_KEY, "granted")

    expect(hasDoNotTrack()).toBe(true)
    expect(readConsent()).toBe("denied")
    expect(analyticsAllowed(readConsent())).toBe(false)
  })

  it("does not put the banner on screen, because the question is answered", () => {
    installBrowser({ dnt: "1" })

    expect(shouldAskForConsent(readConsent())).toBe(false)
  })

  it("accepts 'yes' as well as '1', since both are in the wild", () => {
    installBrowser({ dnt: "yes" })

    expect(hasDoNotTrack()).toBe(true)
  })
})

describe("answering, and changing the answer", () => {
  it("remembers a yes and allows analytics", () => {
    writeConsent("granted")

    expect(readConsent()).toBe("granted")
    expect(analyticsAllowed(readConsent())).toBe(true)
  })

  it("remembers a no and keeps the banner away", () => {
    writeConsent("denied")

    expect(readConsent()).toBe("denied")
    expect(shouldAskForConsent(readConsent())).toBe(false)
    expect(analyticsAllowed(readConsent())).toBe(false)
  })

  it("announces every change, so the tracker reacts on this page not the next", () => {
    const seen: unknown[] = []
    installBrowser()
    window.addEventListener(CONSENT_CHANGE_EVENT, (event) => {
      seen.push((event as CustomEvent).detail)
    })

    writeConsent("granted")
    writeConsent("denied")
    clearConsent()

    expect(seen).toEqual(["granted", "denied", "unset"])
  })

  it("clearing brings the question back", () => {
    writeConsent("granted")
    clearConsent()

    expect(readConsent()).toBe("unset")
    expect(shouldAskForConsent(readConsent())).toBe(true)
  })
})

describe("keeping other tabs honest", () => {
  it("notifies on this tab's own change", () => {
    let calls = 0
    const unsubscribe = subscribeToConsent(() => {
      calls += 1
    })

    writeConsent("granted")

    expect(calls).toBe(1)
    unsubscribe()
  })

  it("notifies when another tab writes the key", () => {
    // `storage` fires only in the tabs that did *not* make the change, which is
    // exactly the case our own event cannot cover. Withdrawing consent in one
    // tab has to stop tracking in the rest.
    let calls = 0
    subscribeToConsent(() => {
      calls += 1
    })

    window.dispatchEvent(
      Object.assign(new Event("storage"), { key: CONSENT_STORAGE_KEY })
    )

    expect(calls).toBe(1)
  })

  it("notifies when another tab clears all storage", () => {
    // A null key means the whole store was wiped, which counts.
    let calls = 0
    subscribeToConsent(() => {
      calls += 1
    })

    window.dispatchEvent(Object.assign(new Event("storage"), { key: null }))

    expect(calls).toBe(1)
  })

  it("ignores an unrelated key, so a theme change does not churn analytics", () => {
    let calls = 0
    subscribeToConsent(() => {
      calls += 1
    })

    window.dispatchEvent(
      Object.assign(new Event("storage"), { key: "energycurve:locale" })
    )

    expect(calls).toBe(0)
  })

  it("stops listening once unsubscribed", () => {
    let calls = 0
    subscribeToConsent(() => {
      calls += 1
    })()

    writeConsent("denied")

    expect(calls).toBe(0)
  })
})

describe("when the browser refuses storage entirely", () => {
  it("reads as unset instead of throwing", () => {
    // A private window, cleared site data, or a browser set to block storage:
    // all of them throw on access. An exception here must not take a page down,
    // and the safe direction is no consent.
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError")
        },
        setItem: () => {
          throw new Error("SecurityError")
        },
        removeItem: () => {},
      },
      navigator: { doNotTrack: null },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    })

    expect(() => readConsent()).not.toThrow()
    expect(readConsent()).toBe("unset")
  })

  it("still announces a write, so the current page behaves correctly", () => {
    const seen: unknown[] = []
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("SecurityError")
        },
        removeItem: () => {},
      },
      navigator: { doNotTrack: null },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: (event: Event) => {
        seen.push(event.type)
        return true
      },
    })

    expect(() => writeConsent("granted")).not.toThrow()
    expect(seen).toEqual([CONSENT_CHANGE_EVENT])
    // It will ask again next visit. Re-asking is a nuisance; assuming yes is a
    // violation.
  })
})

describe("on the server", () => {
  it("reads as unset, so nothing is rendered into the HTML", () => {
    vi.stubGlobal("window", undefined)

    expect(readConsent()).toBe("unset")
    expect(hasDoNotTrack()).toBe(false)
    expect(() => writeConsent("granted")).not.toThrow()
  })

  it("subscribing is a no-op that still returns a working unsubscribe", () => {
    vi.stubGlobal("window", undefined)

    const unsubscribe = subscribeToConsent(() => {})

    expect(() => unsubscribe()).not.toThrow()
  })
})

describe("what a pageview is allowed to carry", () => {
  it("redacts the token from a password-reset landing", () => {
    // The exact leak: a person clicks a link in an email, lands here, and the
    // single-use credential used to travel to a third-party processor as a
    // pageview property.
    const url = redactUrl(
      "https://energycurve.app",
      "/reset-password",
      "token=abc123secret"
    )

    expect(url).not.toContain("abc123secret")
    expect(url).toContain("token=%5Bredacted%5D")
  })

  it("redacts the address and the code from an email verification", () => {
    const url = redactUrl(
      "https://energycurve.app",
      "/verify-email",
      "pending=xyz&email=dj%40example.com"
    )

    expect(url).not.toContain("dj@example.com")
    expect(url).not.toContain("dj%40example.com")
    expect(url).not.toContain("xyz")
  })

  it("keeps campaign parameters, which is what analytics is for", () => {
    const url = redactUrl(
      "https://energycurve.app",
      "/pricing",
      "utm_source=reddit&utm_campaign=alpha"
    )

    expect(url).toContain("utm_source=reddit")
    expect(url).toContain("utm_campaign=alpha")
  })

  it("leaves a plain path alone", () => {
    expect(redactUrl("https://energycurve.app", "/es/pricing", "")).toBe(
      "https://energycurve.app/es/pricing"
    )
  })

  it("redacts rather than drops, so a stripped value is visible in the data", () => {
    // Dropping the key would make a redacted pageview indistinguishable from
    // one that never had a token, and hide that the leak was ever there.
    const url = redactUrl("https://energycurve.app", "/verify-email", "token=x")

    expect(url).toContain("token=")
  })
})
