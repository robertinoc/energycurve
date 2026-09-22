import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The endpoint that closes a data-rights request, probed at each privilege
 * level the product has.
 *
 * It is much less consequential than the endpoints that suspend and delete
 * accounts, and it carries the same three guards anyway — session, same-origin,
 * uuid — because the alternative is deciding case by case which write deserves
 * them, and S-12 is what deciding case by case produced: the unauthenticated
 * contact form had the origin check and the endpoints that delete customers did
 * not.
 *
 * The property this file cares about most is the last one: **a refusal without
 * a reason is refused.** Art. 12(4) makes a refusal a real answer that has to
 * carry its reason and the right to complain, so a row that records a refusal
 * nobody can account for is worse than an open request — it looks handled.
 */

let sessionUser: { id: string; email: string } | null = null

const resolvePrivacyRequest = vi.fn<(input: unknown) => Promise<boolean>>()
const recordAdminAction = vi.fn<(entry: unknown) => Promise<boolean>>()

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: sessionUser }),
  getWorkOS: () => ({ userManagement: { deleteUser: vi.fn() } }),
}))
vi.mock("@/services/privacy-request-service", () => ({
  resolvePrivacyRequest: (input: unknown) => resolvePrivacyRequest(input),
}))
vi.mock("@/services/admin-audit-service", () => ({
  recordAdminAction: (entry: unknown) => recordAdminAction(entry),
}))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

const { PATCH } = await import(
  "@/app/api/backstage/privacy-requests/[id]/route"
)

const ADMIN = "admin@energycurve.app"
const DJ = "dj@example.com"
const REQUEST_ID = "11111111-2222-4333-8444-555555555555"
const ORIGIN = "https://backstage.energycurve.app"

function context(id = REQUEST_ID) {
  return { params: Promise.resolve({ id }) }
}

function patchRequest(
  body: unknown = { status: "answered", note: "done" },
  headers: Record<string, string> = { origin: ORIGIN },
  id = REQUEST_ID
) {
  return new Request(`${ORIGIN}/api/backstage/privacy-requests/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as never
}

const originalAllowlist = process.env.BACKSTAGE_ADMIN_EMAILS

beforeEach(() => {
  vi.clearAllMocks()
  process.env.BACKSTAGE_ADMIN_EMAILS = ADMIN
  sessionUser = { id: "workos-admin", email: ADMIN }
  resolvePrivacyRequest.mockResolvedValue(true)
  recordAdminAction.mockResolvedValue(true)
})

afterEach(() => {
  if (originalAllowlist === undefined) {
    delete process.env.BACKSTAGE_ADMIN_EMAILS
  } else {
    process.env.BACKSTAGE_ADMIN_EMAILS = originalAllowlist
  }
})

describe("who can close a request", () => {
  it("an admin can", async () => {
    const response = await PATCH(patchRequest(), context())

    expect(response.status).toBe(200)
    expect(resolvePrivacyRequest).toHaveBeenCalledOnce()
  })

  it("an anonymous visitor cannot", async () => {
    sessionUser = null

    const response = await PATCH(patchRequest(), context())

    expect(response.status).toBe(401)
    expect(resolvePrivacyRequest).not.toHaveBeenCalled()
  })

  it("a signed-in DJ gets the same answer as an anonymous visitor", async () => {
    // Same status AND same body. If they differed, any user could discover that
    // the panel exists and that they are not on the list — which is the
    // property `tests/backstage-rbac.test.ts` pins for the user endpoints.
    sessionUser = { id: "workos-dj", email: DJ }

    const asDj = await PATCH(patchRequest(), context())
    const djBody = await asDj.text()

    sessionUser = null
    const anonymous = await PATCH(patchRequest(), context())

    expect(asDj.status).toBe(anonymous.status)
    expect(djBody).toBe(await anonymous.text())
    expect(resolvePrivacyRequest).not.toHaveBeenCalled()
  })
})

describe("the guards around the write", () => {
  it("refuses a request from an untrusted origin", async () => {
    const response = await PATCH(
      patchRequest({ status: "answered", note: "" }, {
        origin: "https://evil.example",
      }),
      context()
    )

    expect(response.status).toBe(403)
    expect(resolvePrivacyRequest).not.toHaveBeenCalled()
  })

  it("answers 404 for a malformed id without touching the database", async () => {
    // S-13: a malformed id used to reach Postgres, come back as 22P02, and
    // surface as an unhandled 500.
    const response = await PATCH(
      patchRequest({ status: "answered", note: "" }, { origin: ORIGIN }, "not-a-uuid"),
      context("not-a-uuid")
    )

    expect(response.status).toBe(404)
    expect(resolvePrivacyRequest).not.toHaveBeenCalled()
  })

  it("rejects a status that is not a resolution", async () => {
    const response = await PATCH(
      patchRequest({ status: "open", note: "" }),
      context()
    )

    expect(response.status).toBe(400)
    expect(resolvePrivacyRequest).not.toHaveBeenCalled()
  })

  it("rejects a refusal with no reason — Art. 12(4)", async () => {
    const response = await PATCH(
      patchRequest({ status: "refused", note: "   " }),
      context()
    )

    expect(response.status).toBe(400)
    expect(resolvePrivacyRequest).not.toHaveBeenCalled()
  })

  it("accepts a refusal that carries one", async () => {
    const response = await PATCH(
      patchRequest({ status: "refused", note: "Manifestly unfounded, Art. 12(5)" }),
      context()
    )

    expect(response.status).toBe(200)
  })

  it("answers 404 for a request that was already closed", async () => {
    // The service reports no change, and "already closed" and "never existed"
    // answer the same — the same reasoning as the public curve page, where a
    // friendlier message would confirm that an id exists.
    resolvePrivacyRequest.mockResolvedValue(false)

    const response = await PATCH(patchRequest(), context())

    expect(response.status).toBe(404)
  })
})

describe("the audit trail", () => {
  it("records closing a request, without the requester's address", async () => {
    await PATCH(patchRequest({ status: "answered", note: "fixed" }), context())

    expect(recordAdminAction).toHaveBeenCalledOnce()

    const entry = recordAdminAction.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >

    expect(entry.action).toBe("privacy_request.answered")
    expect(entry.actorEmail).toBe(ADMIN)
    expect(entry.targetProfileId).toBe(REQUEST_ID)
    // No address, deliberately: the request row already holds it, under a sweep
    // whose window starts at resolution. A copy here would outlive that.
    expect(entry.targetEmail).toBeUndefined()
  })

  it("distinguishes a refusal from an answer in the record", async () => {
    await PATCH(
      patchRequest({ status: "refused", note: "not our data" }),
      context()
    )

    const entry = recordAdminAction.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >

    expect(entry.action).toBe("privacy_request.refused")
  })

  it("does not record anything when nothing changed", async () => {
    resolvePrivacyRequest.mockResolvedValue(false)

    await PATCH(patchRequest(), context())

    expect(recordAdminAction).not.toHaveBeenCalled()
  })
})
