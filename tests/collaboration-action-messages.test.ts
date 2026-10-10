import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * What a collaborator reads when the server refuses them, by reason.
 *
 * Found writing banco UX.4: a collaborator whose share was revoked while the
 * page was open sent a suggestion and was told "Something went wrong while
 * saving. Please try again." — honest that nothing was saved, and wrong that
 * trying again could help. `no_access` now has its own sentence, in both
 * actions a collaborator reaches from the shared page.
 *
 * The actions run for real; only their edges are mocked: the session, the
 * profile sync, the rate limiter and the collaboration service.
 */

const addSuggestion = vi.fn()
const takeEditLock = vi.fn()

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({
    user: { id: "user_1", email: "guest@example.com", firstName: null, lastName: null },
  }),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/server-locale", () => ({ getRequestLocale: vi.fn(async () => "en") }))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: "profile_1", email: "guest@example.com" }),
}))
vi.mock("@/services/rate-limit-service", () => ({
  consumeRateLimit: async () => ({ allowed: true }),
}))
vi.mock("@/services/collaboration-service", () => ({
  addSuggestion: (...args: unknown[]) => addSuggestion(...args),
  takeEditLock: (...args: unknown[]) => takeEditLock(...args),
  getLockState: vi.fn(),
  mayHoldLock: vi.fn(),
  inviteCollaborator: vi.fn(),
  releaseEditLock: vi.fn(),
  removeCollaborator: vi.fn(),
  resolveSuggestion: vi.fn(),
  touchEditLock: vi.fn(),
}))

const { addSuggestionAction, takeEditTurnAction } = await import(
  "@/app/(en)/dashboard/playlists/actions"
)
const { DASHBOARD_COPY } = await import("@/lib/content/dashboard-copy")
const { getRequestLocale } = await import("@/lib/server-locale")

const COPY = DASHBOARD_COPY.actions
const GENERIC = /try again|Probá de nuevo/i

beforeEach(() => {
  addSuggestion.mockReset()
  takeEditLock.mockReset()
  vi.mocked(getRequestLocale).mockResolvedValue("en")
})

describe("a suggestion refused for access", () => {
  it("says the set is no longer shared and nothing was sent, not 'try again'", async () => {
    addSuggestion.mockResolvedValue({ ok: false, reason: "no_access" })

    const result = await addSuggestionAction("set_1", "swap 6 and 7", null)

    expect(result).toEqual({ ok: false, message: COPY.suggestionNoAccess.en })
    expect(result.message).not.toMatch(GENERIC)
  })

  it("speaks Spanish when the requester does", async () => {
    vi.mocked(getRequestLocale).mockResolvedValue("es")
    addSuggestion.mockResolvedValue({ ok: false, reason: "no_access" })

    const result = await addSuggestionAction("set_1", "cambiá 6 y 7", null)

    expect(result.message).toBe(COPY.suggestionNoAccess.es)
  })

  it("keeps the generic error for a failure that retrying can fix", async () => {
    addSuggestion.mockResolvedValue({ ok: false, reason: "failed" })

    const result = await addSuggestionAction("set_1", "swap 6 and 7", null)

    expect(result.message).toBe(COPY.genericError.en)
  })

  it("keeps its own sentence for an empty body", async () => {
    addSuggestion.mockResolvedValue({ ok: false, reason: "bad_body" })

    const result = await addSuggestionAction("set_1", "   ", null)

    expect(result.message).toBe(COPY.suggestionEmpty.en)
  })
})

describe("the edit turn refused for access", () => {
  it("says the set is no longer shared, not 'try again'", async () => {
    takeEditLock.mockResolvedValue({ ok: false, reason: "no_access" })

    const result = await takeEditTurnAction("set_1")

    expect(result).toEqual({ ok: false, message: COPY.turnNoAccess.en })
    expect(result.message).not.toMatch(GENERIC)
  })

  it("still tells a held turn apart from a lost share", async () => {
    takeEditLock.mockResolvedValue({ ok: false, reason: "held" })

    const result = await takeEditTurnAction("set_1")

    expect(result.message).toBe(COPY.turnHeld.en)
  })
})

describe("the copy itself", () => {
  // The same sentence answers an id that was never shared, so it must not
  // name a deletion or an owner's action — that would confirm the set exists.
  it.each(["suggestionNoAccess", "turnNoAccess"] as const)(
    "%s confirms nothing about the set existing",
    (key) => {
      for (const text of Object.values(COPY[key])) {
        expect(text).not.toMatch(/deleted|removed|revoked|borr|elimin|revoc/i)
      }
    }
  )
})
