import { readdirSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  INVITE_LANDING,
  KNOWN_SOURCES,
  PRIVATE_SECTIONS_EN,
  PUBLIC_SECTIONS_EN,
  PUBLIC_SECTIONS_ES,
  landingPath,
  normalizeCampaign,
  normalizeMedium,
  normalizeSource,
  referrerHost,
  sanitizeFirstTouch,
  touchFromVisit,
  type FirstTouch,
} from "@/lib/attribution/first-touch"
import { FIRST_TOUCH_STORAGE_KEY } from "@/lib/attribution/first-touch-store"
import {
  __resetFirstTouchForTests,
  reportFirstTouch,
  syncFirstTouchWithConsent,
} from "@/components/analytics/first-touch"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * Lote 20, task 2: where a person came from the first time, kept on the
 * profile. Three things this file pins, in the order they would hurt:
 *
 * 1. Without consent nothing is stored, anywhere — the person is unknown.
 * 2. Nothing that identifies a person gets through: no token, no query string,
 *    no address pasted into a campaign.
 * 3. First touch, not last, and only for a new profile.
 */

const NOW = new Date("2026-10-20T12:00:00Z")

const visit = (href: string, referrer = "") =>
  touchFromVisit({ href, referrer, at: NOW })

describe("normalising what a link says", () => {
  it("reads instagram, Instagram, IG and insta as one source", () => {
    for (const raw of ["instagram", "Instagram", "IG", "ig", " insta "]) {
      expect(normalizeSource(raw)).toBe("instagram")
    }
  })

  it("turns a source it does not know into `other`, without keeping the text", () => {
    expect(normalizeSource("my-friends-blog")).toBe("other")
  })

  it("maps medium spellings onto the closed list", () => {
    expect(normalizeMedium("Social_Media")).toBe("social")
    expect(normalizeMedium("cpc")).toBe("other")
    expect(normalizeMedium("")).toBeNull()
  })

  it("keeps a campaign in the format and drops one that is not", () => {
    expect(normalizeCampaign("Lanzamiento Octubre")).toBe("lanzamiento-octubre")
    expect(normalizeCampaign("2026-10-perfil")).toBe("2026-10-perfil")
    // An address pasted into a link is dropped, not repaired into a slug.
    expect(normalizeCampaign("juan@example.com")).toBeNull()
    // So is anything that looks like a phone number or an account id.
    expect(normalizeCampaign("promo-1155551234")).toBeNull()
    expect(normalizeCampaign("a".repeat(65))).toBeNull()
  })

  it("keeps only the host of a referrer", () => {
    expect(referrerHost("https://www.google.com.ar/search?q=dj+set+order")).toBe(
      "google.com.ar"
    )
    expect(referrerHost("not a url")).toBeNull()
  })
})

describe("a page load becomes a touch", () => {
  it("takes the UTM parameters when the link carries them", () => {
    expect(
      visit(
        "https://energycurve.app/es/herramientas/curva-de-energia?utm_source=IG&utm_campaign=Perfil%20Bio",
        "https://l.instagram.com/"
      )
    ).toEqual({
      source: "instagram",
      medium: "social",
      campaign: "perfil-bio",
      referrer: "l.instagram.com",
      landing: "/es/herramientas/curva-de-energia",
      at: NOW.toISOString(),
    })
  })

  it("falls back to the referring site, with its medium", () => {
    expect(visit("https://energycurve.app/blog/x", "https://www.google.de/")?.source).toBe(
      "google"
    )
    expect(visit("https://energycurve.app/", "https://gemini.google.com/app")).toMatchObject({
      source: "gemini",
      medium: "ai",
    })
    expect(visit("https://energycurve.app/", "https://some-dj-blog.net/post/42")).toMatchObject({
      source: "other",
      medium: "referral",
      referrer: "some-dj-blog.net",
    })
  })

  it("calls a load with no referrer and no tags direct", () => {
    expect(visit("https://energycurve.app/pricing")).toMatchObject({
      source: "direct",
      medium: "none",
      landing: "/pricing",
    })
  })

  it("does not count somebody already here, or coming back from signing in", () => {
    expect(visit("https://energycurve.app/pricing", "https://energycurve.app/")).toBeNull()
    expect(visit("https://energycurve.app/", "https://accounts.google.com/")).toBeNull()
    expect(visit("https://energycurve.app/dashboard")).toBeNull()
    expect(visit("https://energycurve.app/reset-password?token=abc")).toBeNull()
  })

  it("never keeps a query string, a hash, a click id or an invite token", () => {
    const touch = visit(
      "https://energycurve.app/c/s3cr3t-invite-token?email=a%40b.com&gclid=XYZ&utm_term=dj#frag"
    )
    const serialized = JSON.stringify(touch)

    expect(touch?.landing).toBe(INVITE_LANDING)
    for (const leak of ["s3cr3t", "a@b", "a%40b", "XYZ", "gclid", "utm_term", "frag"]) {
      expect(serialized).not.toContain(leak)
    }
  })
})

describe("landing pages fail closed", () => {
  /**
   * Every first path segment under app/(en) and app/(es)/es has to be sorted
   * into public or private. A new route that is in neither list fails here,
   * so it cannot become a landing page — or carry a token into one — by
   * accident.
   */
  function sections(dir: string): string[] {
    return readdirSync(join(process.cwd(), dir), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("("))
      .map((entry) => entry.name)
  }

  it("sorts every English route into public or private", () => {
    const known = new Set<string>([...PUBLIC_SECTIONS_EN, ...PRIVATE_SECTIONS_EN])
    const unsorted = sections("app/(en)").filter((name) => !known.has(name))

    expect(unsorted).toEqual([])
  })

  it("lists every Spanish route as public", () => {
    const known = new Set<string>(PUBLIC_SECTIONS_ES)
    const unsorted = sections("app/(es)/es").filter((name) => !known.has(name))

    expect(unsorted).toEqual([])
  })

  it("drops a path that is odd rather than trimming it into something else", () => {
    expect(landingPath("/Blog/Upper")).toBeNull()
    expect(landingPath("/blog/a/b/c/d")).toBeNull()
    expect(landingPath("/blog/caf%C3%A9")).toBeNull()
    expect(landingPath("/blog/ok/")).toBe("/blog/ok")
  })
})

describe("the server's own check", () => {
  const valid: FirstTouch = {
    source: "producthunt",
    medium: "directory",
    campaign: "launch",
    referrer: "producthunt.com",
    landing: "/",
    at: "2026-10-19T09:00:00.000Z",
  }

  it("accepts a touch the browser built", () => {
    expect(sanitizeFirstTouch(valid, NOW)).toEqual(valid)
  })

  it("refuses what it cannot count", () => {
    expect(sanitizeFirstTouch({ ...valid, source: "my-friends-blog" }, NOW)).toBeNull()
    expect(sanitizeFirstTouch({ ...valid, medium: "cpc" }, NOW)).toBeNull()
    expect(sanitizeFirstTouch({ ...valid, at: "2025-01-01T00:00:00Z" }, NOW)).toBeNull()
    expect(sanitizeFirstTouch({ ...valid, at: "2026-10-21T00:00:00Z" }, NOW)).toBeNull()
    expect(sanitizeFirstTouch("nope", NOW)).toBeNull()
  })

  it("drops a field that does not fit, and keeps the rest", () => {
    const hostile = sanitizeFirstTouch(
      {
        ...valid,
        referrer: "https://evil.example/path?email=a@b.com",
        landing: "/dashboard/playlists/123",
        campaign: "juan@example.com",
      },
      NOW
    )

    expect(hostile).toMatchObject({
      source: "producthunt",
      referrer: null,
      landing: null,
      campaign: null,
    })
  })

  it("names a medium for every known source", () => {
    for (const medium of Object.values(KNOWN_SOURCES)) {
      expect(normalizeMedium(medium)).toBe(medium)
    }
  })
})

// ---------------------------------------------------------------------------
// The browser half: both consent paths
// ---------------------------------------------------------------------------

const store = new Map<string, string>()

function installBrowser(href: string, referrer: string) {
  vi.stubGlobal("window", {
    location: { href },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  })
  vi.stubGlobal("document", { referrer })
}

describe("in the browser, consent decides", () => {
  beforeEach(() => {
    store.clear()
    __resetFirstTouchForTests()
    installBrowser("https://energycurve.app/tools?utm_source=stagelink", "")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("stores nothing when the visitor never answered", () => {
    syncFirstTouchWithConsent("unset")

    expect(store.has(FIRST_TOUCH_STORAGE_KEY)).toBe(false)
  })

  it("stores nothing when the visitor said no", () => {
    syncFirstTouchWithConsent("denied")

    expect(store.has(FIRST_TOUCH_STORAGE_KEY)).toBe(false)
  })

  it("stores the arrival once the visitor says yes — even on the page they landed on", () => {
    syncFirstTouchWithConsent("unset")
    syncFirstTouchWithConsent("granted")

    expect(JSON.parse(store.get(FIRST_TOUCH_STORAGE_KEY)!)).toMatchObject({
      source: "stagelink",
      medium: "crosspromo",
      landing: "/tools",
    })
  })

  it("keeps the first touch when a later visit arrives from somewhere else", () => {
    syncFirstTouchWithConsent("granted")

    __resetFirstTouchForTests()
    installBrowser("https://energycurve.app/pricing", "https://www.google.com/")
    syncFirstTouchWithConsent("granted")

    expect(JSON.parse(store.get(FIRST_TOUCH_STORAGE_KEY)!).source).toBe("stagelink")
  })

  it("removes the stored touch the moment consent is withdrawn", () => {
    syncFirstTouchWithConsent("granted")
    syncFirstTouchWithConsent("denied")

    expect(store.has(FIRST_TOUCH_STORAGE_KEY)).toBe(false)
  })

  it("sends nothing without consent, and sends once with it", async () => {
    syncFirstTouchWithConsent("granted")
    const send = vi.fn(async () => new Response(JSON.stringify({ outcome: "recorded" })))

    expect(await reportFirstTouch("denied", send as unknown as typeof fetch)).toBe("skipped")
    expect(send).not.toHaveBeenCalled()

    expect(await reportFirstTouch("granted", send as unknown as typeof fetch)).toBe("delivered")
    expect(await reportFirstTouch("granted", send as unknown as typeof fetch)).toBe("skipped")
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("keeps the touch for the next visit when the server is down or the session is gone", async () => {
    syncFirstTouchWithConsent("granted")

    for (const status of [401, 503]) {
      const send = vi.fn(async () => new Response("", { status }))

      expect(await reportFirstTouch("granted", send as unknown as typeof fetch)).toBe("kept")
    }

    expect(JSON.parse(store.get(FIRST_TOUCH_STORAGE_KEY)!).source).toBe("stagelink")
  })
})

// ---------------------------------------------------------------------------
// The server half: once, and only for a new profile
// ---------------------------------------------------------------------------

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))

const touch: FirstTouch = {
  source: "instagram",
  medium: "social",
  campaign: null,
  referrer: "l.instagram.com",
  landing: "/",
  at: "2026-10-18T10:00:00.000Z",
}

describe("recording on the profile", () => {
  beforeEach(() => {
    fake = createFakeSupabase({
      profiles: [
        { id: "new", created_at: "2026-10-20T11:00:00Z", first_touch_recorded_at: null },
        { id: "old", created_at: "2026-09-01T00:00:00Z", first_touch_recorded_at: null },
      ],
    })
  })

  it("writes a new profile's first touch", async () => {
    const { recordFirstTouch } = await import("@/services/attribution-service")

    expect(await recordFirstTouch("new", touch, NOW)).toBe("recorded")
    expect(fake.tables.profiles.find((row) => row.id === "new")).toMatchObject({
      first_touch_source: "instagram",
      first_touch_medium: "social",
      first_touch_recorded_at: NOW.toISOString(),
    })
  })

  it("never replaces it: the second touch is ignored", async () => {
    const { recordFirstTouch } = await import("@/services/attribution-service")

    await recordFirstTouch("new", touch, NOW)
    expect(await recordFirstTouch("new", { ...touch, source: "google" }, NOW)).toBe(
      "not_recorded"
    )
    expect(fake.tables.profiles.find((row) => row.id === "new")?.first_touch_source).toBe(
      "instagram"
    )
  })

  it("does not give an old account a source after the fact", async () => {
    const { recordFirstTouch } = await import("@/services/attribution-service")

    expect(await recordFirstTouch("old", touch, NOW)).toBe("not_recorded")
    expect(fake.tables.profiles.find((row) => row.id === "old")?.first_touch_source).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

const auth = vi.hoisted(() => ({ user: null as null | { id: string; email: string } }))

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: auth.user }),
  getWorkOS: vi.fn(),
}))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "new", suspended_at: null }),
}))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

describe("POST /api/attribution/first-touch", () => {
  const post = async (body: string) => {
    const { POST } = await import("@/app/api/attribution/first-touch/route")

    return POST(new Request("https://energycurve.app/api/attribution/first-touch", {
      method: "POST",
      body,
    }))
  }

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    fake = createFakeSupabase({
      profiles: [{ id: "new", created_at: "2026-10-20T11:00:00Z", first_touch_recorded_at: null }],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    auth.user = null
  })

  it("refuses a request without a session", async () => {
    expect((await post(JSON.stringify(touch))).status).toBe(401)
  })

  it("refuses something that is not a touch", async () => {
    auth.user = { id: "w", email: "dj@example.com" }

    expect((await post("{not json")).status).toBe(400)
    expect((await post(JSON.stringify({ source: "x" }))).status).toBe(400)
    expect((await post("x".repeat(3000))).status).toBe(413)
  })

  it("records a valid touch for the signed-in profile", async () => {
    auth.user = { id: "w", email: "dj@example.com" }

    const response = await post(JSON.stringify(touch))

    expect(await response.json()).toEqual({ outcome: "recorded" })
    expect(fake.tables.profiles[0]?.first_touch_source).toBe("instagram")
  })
})
