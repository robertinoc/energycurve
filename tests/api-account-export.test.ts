import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The route in front of "download my data".
 *
 * `tests/data-export.test.ts` proves the *service* only ever reads one account's
 * rows. This file is about everything wrapped around it: who is allowed to ask,
 * how often, and what the response tells a browser and a cache to do with an
 * entire account in one body.
 *
 * It exists because the coverage gate caught its absence. The export route
 * landed with the service tested and the handler not, `app/api/**` dropped
 * below its floor, and CI refused the branch — which is the gate doing exactly
 * what it was installed for.
 */

let sessionUser: { id: string; email: string } | null = null
/**
 * Varied per test, and it has to be the *profile* id rather than the WorkOS
 * one: the route's rate-limit key is `account-export:${profile.id}`. The first
 * draft of this file varied the session user and left the profile mock
 * returning a constant, so all four requests shared one bucket and the second
 * test saw 429 before it had asked three times.
 *
 * Same module-level Map with no reset that the contact and billing suites work
 * around, and the same reason production limits are per serverless instance.
 */
let profileId = "profile-1"
const buildAccountExport = vi.fn<() => Promise<unknown>>()

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: sessionUser }),
}))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: profileId }),
}))
vi.mock("@/services/data-export-service", () => ({ buildAccountExport }))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

const { GET } = await import("@/app/api/account/export/route")

const SAMPLE = {
  exportedAt: "2026-09-11T00:00:00.000Z",
  format: "energycurve.account-export.v1",
  account: { email: "dj@example.com" },
  playlists: [{ id: "pl-1", name: "Warm-up" }],
}

beforeEach(() => {
  vi.clearAllMocks()
  buildAccountExport.mockResolvedValue(SAMPLE)
  profileId = `profile-${Math.random().toString(36).slice(2)}`
  sessionUser = { id: `user-${profileId}`, email: "dj@example.com" }
})

describe("who is allowed to ask", () => {
  it("answers 401 with no session, and never builds the export", async () => {
    sessionUser = null

    const response = await GET()

    expect(response.status).toBe(401)
    expect(buildAccountExport).not.toHaveBeenCalled()
  })

  it("builds it for the caller's own profile, never for an id from outside", async () => {
    // The route takes no parameters at all — there is no id to tamper with,
    // which is the cheapest way to make an endpoint like this safe.
    await GET()

    expect(buildAccountExport).toHaveBeenCalledWith(profileId)
  })

  it("answers 404 when the profile has no rows rather than an empty file", async () => {
    buildAccountExport.mockResolvedValue(null)

    expect((await GET()).status).toBe(404)
  })
})

describe("how often", () => {
  it("allows three in the hour and refuses the fourth with Retry-After", async () => {
    const statuses: number[] = []
    let last: Response | null = null

    for (let attempt = 0; attempt < 4; attempt += 1) {
      last = await GET()
      statuses.push(last.status)
    }

    // Harder than anything else in the product on purpose: this is the one
    // endpoint that returns a whole account in one response, so it is both the
    // most valuable thing to fetch with a borrowed session and the most
    // expensive query we run.
    expect(statuses).toEqual([200, 200, 200, 429])
    expect(last?.headers.get("Retry-After")).toBeTruthy()
    expect(buildAccountExport).toHaveBeenCalledTimes(3)
  })
})

describe("what the response tells the browser", () => {
  it("is served as a file to save, not rendered as a wall of JSON", async () => {
    const response = await GET()
    const disposition = response.headers.get("Content-Disposition") ?? ""

    expect(disposition).toContain("attachment")
    expect(disposition).toMatch(/energycurve-my-data-\d{4}-\d{2}-\d{2}\.json/)
  })

  it("forbids caching anywhere, because it is an entire account", async () => {
    const cacheControl = (await GET()).headers.get("Cache-Control") ?? ""

    expect(cacheControl).toContain("no-store")
    expect(cacheControl).toContain("private")
  })

  it("returns readable JSON, since a person is going to open it", async () => {
    const response = await GET()
    const body = await response.text()

    expect(response.headers.get("Content-Type")).toContain("application/json")
    // Indented, not minified: the point of a portability export is that its
    // subject can read it.
    expect(body).toContain("\n  ")
    expect(JSON.parse(body)).toMatchObject({ format: "energycurve.account-export.v1" })
  })
})

describe("when building it fails", () => {
  it("answers 500 without leaking the error to the caller", async () => {
    buildAccountExport.mockRejectedValue(new Error("relation does not exist"))

    const response = await GET()
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(body).not.toContain("relation does not exist")
    expect(JSON.parse(body)).toEqual({ error: "export_failed" })
  })
})
