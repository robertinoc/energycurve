import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Who can reach the panel that suspends and deletes accounts.
 *
 * `tests/backstage-config.test.ts` covers the allowlist parser — string in,
 * emails out. This file is the level above: the actual route handlers, probed at
 * each privilege level the product has (anonymous, signed-in DJ, admin), because
 * a correct allowlist wired to the wrong place protects nothing.
 *
 * The three levels are the whole RBAC model here, and that is worth writing down
 * rather than assuming: EnergyCurve has no support tier, no roles table and no
 * per-permission grants. There is "a user", and there is "an address in
 * BACKSTAGE_ADMIN_EMAILS". Every test below is an assertion about the boundary
 * between those two.
 */

let sessionUser: { id: string; email: string } | null = null

const getBackstageProfileEmail = vi.fn<(id: string) => Promise<string | null>>()
const setUserSuspension = vi.fn()
const deleteUserEverywhere = vi.fn()

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: sessionUser }),
  getWorkOS: () => ({ userManagement: { deleteUser: vi.fn() } }),
}))
vi.mock("@/services/backstage-service", () => ({
  getBackstageProfileEmail: (id: string) => getBackstageProfileEmail(id),
  setUserSuspension: (...args: unknown[]) => setUserSuspension(...args),
  deleteUserEverywhere: (...args: unknown[]) => deleteUserEverywhere(...args),
}))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

const { PATCH, DELETE } = await import("@/app/api/backstage/users/[id]/route")

const ADMIN = "admin@energycurve.app"
const SECOND_ADMIN = "second@energycurve.app"
const DJ = "dj@example.com"
const TARGET_ID = "11111111-2222-4333-8444-555555555555"
const ORIGIN = "https://backstage.energycurve.app"

function url(id = TARGET_ID) {
  return `${ORIGIN}/api/backstage/users/${id}`
}

function context(id = TARGET_ID) {
  return { params: Promise.resolve({ id }) }
}

function patchRequest(
  body: unknown = { suspended: true },
  headers: Record<string, string> = { origin: ORIGIN }
) {
  return new Request(url(), {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as never
}

function deleteRequest(
  id = TARGET_ID,
  headers: Record<string, string> = { origin: ORIGIN }
) {
  return new Request(url(id), { method: "DELETE", headers }) as never
}

const originalAllowlist = process.env.BACKSTAGE_ADMIN_EMAILS

beforeEach(() => {
  vi.clearAllMocks()
  process.env.BACKSTAGE_ADMIN_EMAILS = `${ADMIN},${SECOND_ADMIN}`
  sessionUser = { id: "workos-admin", email: ADMIN }
  getBackstageProfileEmail.mockResolvedValue(DJ)
  setUserSuspension.mockResolvedValue({ id: TARGET_ID, suspended_at: "2026-09-11T00:00:00Z" })
  deleteUserEverywhere.mockResolvedValue({ email: DJ })
})

afterEach(() => {
  if (originalAllowlist === undefined) {
    delete process.env.BACKSTAGE_ADMIN_EMAILS
  } else {
    process.env.BACKSTAGE_ADMIN_EMAILS = originalAllowlist
  }
})

describe("the three privilege levels", () => {
  it("refuses an anonymous caller, and touches nothing", async () => {
    sessionUser = null

    const patch = await PATCH(patchRequest(), context())
    const del = await DELETE(deleteRequest(), context())

    expect(patch.status).toBe(401)
    expect(del.status).toBe(401)
    expect(setUserSuspension).not.toHaveBeenCalled()
    expect(deleteUserEverywhere).not.toHaveBeenCalled()
    // Not even a lookup: a non-admin must not be able to use this endpoint to
    // learn whether a given profile id exists.
    expect(getBackstageProfileEmail).not.toHaveBeenCalled()
  })

  it("refuses a signed-in DJ who is not on the allowlist", async () => {
    sessionUser = { id: "workos-dj", email: DJ }

    const patch = await PATCH(patchRequest(), context())
    const del = await DELETE(deleteRequest(), context())

    expect(patch.status).toBe(401)
    expect(del.status).toBe(401)
    expect(setUserSuspension).not.toHaveBeenCalled()
    expect(deleteUserEverywhere).not.toHaveBeenCalled()
  })

  it("gives a DJ and an anonymous caller the same answer", async () => {
    sessionUser = null
    const anonymous = await PATCH(patchRequest(), context())

    sessionUser = { id: "workos-dj", email: DJ }
    const signedIn = await PATCH(patchRequest(), context())

    // Distinguishable answers would tell a signed-in stranger that the panel
    // exists and that they are merely not on its list.
    expect(await anonymous.json()).toEqual(await signedIn.json())
    expect(anonymous.status).toBe(signedIn.status)
  })

  it("lets an admin through", async () => {
    const response = await PATCH(patchRequest({ suspended: true }), context())

    expect(response.status).toBe(200)
    expect(setUserSuspension).toHaveBeenCalledWith(TARGET_ID, true, ADMIN)
  })

  it("matches the allowlist case-insensitively, like the login form does", async () => {
    sessionUser = { id: "workos-admin", email: ADMIN.toUpperCase() }

    const response = await PATCH(patchRequest(), context())

    expect(response.status).toBe(200)
  })

  it("stops being an admin the moment the address leaves the allowlist", async () => {
    process.env.BACKSTAGE_ADMIN_EMAILS = SECOND_ADMIN

    const response = await DELETE(deleteRequest(), context())

    expect(response.status).toBe(401)
    expect(deleteUserEverywhere).not.toHaveBeenCalled()
  })
})

describe("admins are not targets", () => {
  it("refuses to suspend another admin", async () => {
    getBackstageProfileEmail.mockResolvedValue(SECOND_ADMIN)

    const response = await PATCH(patchRequest(), context())

    expect(response.status).toBe(400)
    expect(setUserSuspension).not.toHaveBeenCalled()
  })

  it("refuses to delete another admin", async () => {
    getBackstageProfileEmail.mockResolvedValue(SECOND_ADMIN)

    const response = await DELETE(deleteRequest(), context())

    expect(response.status).toBe(400)
    expect(deleteUserEverywhere).not.toHaveBeenCalled()
  })

  it("refuses to delete yourself", async () => {
    getBackstageProfileEmail.mockResolvedValue(ADMIN)

    const response = await DELETE(deleteRequest(), context())

    expect(response.status).toBe(400)
    expect(deleteUserEverywhere).not.toHaveBeenCalled()
  })
})

describe("what the endpoint accepts", () => {
  it("answers 404 for a malformed id instead of crashing on it", async () => {
    const response = await DELETE(
      deleteRequest("not-a-uuid"),
      context("not-a-uuid")
    )

    expect(response.status).toBe(404)
    // The id never reached the database. Before this check, Postgres answered
    // 22P02, the service threw outside any try, and the panel returned 500.
    expect(getBackstageProfileEmail).not.toHaveBeenCalled()
  })

  it("rejects a suspension request without a boolean", async () => {
    const response = await PATCH(patchRequest({ suspended: "yes" }), context())

    expect(response.status).toBe(400)
    expect(setUserSuspension).not.toHaveBeenCalled()
  })

  it("survives a body that is not JSON at all", async () => {
    const request = new Request(url(), {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: "{ not json",
    }) as never

    const response = await PATCH(request, context())

    expect(response.status).toBe(400)
  })
})

describe("same-origin", () => {
  it("refuses a PATCH carrying another site's Origin", async () => {
    const response = await PATCH(
      patchRequest({ suspended: true }, { origin: "https://evil.example" }),
      context()
    )

    expect(response.status).toBe(403)
    expect(setUserSuspension).not.toHaveBeenCalled()
  })

  it("refuses a DELETE carrying another site's Referer", async () => {
    const response = await DELETE(
      deleteRequest(TARGET_ID, { referer: "https://evil.example/attack" }),
      context()
    )

    expect(response.status).toBe(403)
    expect(deleteUserEverywhere).not.toHaveBeenCalled()
  })

  it("checks the origin only after the session, so it leaks nothing to a stranger", async () => {
    sessionUser = null

    const response = await PATCH(
      patchRequest({ suspended: true }, { origin: "https://evil.example" }),
      context()
    )

    // 401, not 403: an unauthenticated caller learns nothing about which origins
    // this endpoint would have accepted.
    expect(response.status).toBe(401)
  })

  it("still serves a request with neither header, which is the documented gap", async () => {
    const response = await PATCH(patchRequest({ suspended: true }, {}), context())

    // Deliberate. curl and server-to-server callers send neither, and so can an
    // attacker — this check narrows where a *browser* may act from, and is not a
    // second authentication. Pinned so that the limitation stays a decision.
    expect(response.status).toBe(200)
  })
})
