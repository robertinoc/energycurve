import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Rectification — GDPR Art. 16.
 *
 * The gap assessment listed four reds that are really one problem: a user could
 * export their data and do nothing else with it. The concrete version was having
 * to email support to fix a typo in your own name.
 *
 * These tests are about the boundary around that edit, not the edit: who may
 * make it, how often, and what happens to a suspended account — because a write
 * path added for a privacy right is still a write path.
 */

let sessionUser: { id: string; email: string } | null = null
let suspendedAt: string | null = null
let profileId = "profile-1"
let rateLimitAllowed = true

const updateDisplayName =
  vi.fn<
    (workosUserId: string, firstName: string | null, lastName: string | null) => Promise<void>
  >()
const redirect = vi.fn((target: string) => {
  throw new Error(`REDIRECT:${target}`)
})

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: sessionUser }),
}))
vi.mock("next/navigation", () => ({ redirect }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({
    id: profileId,
    suspended_at: suspendedAt,
  }),
  updateDisplayName: (
    workosUserId: string,
    firstName: string | null,
    lastName: string | null
  ) => updateDisplayName(workosUserId, firstName, lastName),
}))
vi.mock("@/services/rate-limit-service", () => ({
  consumeRateLimit: async () => ({ allowed: rateLimitAllowed }),
}))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/lib/server-locale", () => ({ getRequestLocale: async () => "en" }))

const { updateNameAction, IDLE_ACCOUNT_STATE } = await import(
  "@/app/dashboard/account/actions"
)

function form(fields: Record<string, string>): FormData {
  const data = new FormData()

  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value)
  }

  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionUser = { id: "workos-1", email: "dj@example.com" }
  suspendedAt = null
  rateLimitAllowed = true
  profileId = `profile-${Math.random().toString(36).slice(2)}`
  updateDisplayName.mockResolvedValue(undefined)
})

describe("who may rectify", () => {
  it("sends an anonymous caller to login and writes nothing", async () => {
    sessionUser = null

    await expect(
      updateNameAction(IDLE_ACCOUNT_STATE, form({ firstName: "Jordi" }))
    ).rejects.toThrow(/REDIRECT:\/login/)

    expect(updateDisplayName).not.toHaveBeenCalled()
  })

  it("refuses a suspended account", async () => {
    suspendedAt = "2026-09-01T00:00:00Z"

    await expect(
      updateNameAction(IDLE_ACCOUNT_STATE, form({ firstName: "Jordi" }))
    ).rejects.toThrow(/REDIRECT:\/account-suspended/)

    // Suspension has to be an authorization check on every write, not a page
    // gate. A new action is exactly where that gets forgotten.
    expect(updateDisplayName).not.toHaveBeenCalled()
  })

  it("lets a signed-in user change their own name", async () => {
    const state = await updateNameAction(
      IDLE_ACCOUNT_STATE,
      form({ firstName: "Jordi", lastName: "Vidal" })
    )

    expect(state.ok).toBe(true)
    expect(updateDisplayName).toHaveBeenCalledWith("workos-1", "Jordi", "Vidal")
  })

  it("acts on the session's own id, never on anything from the form", async () => {
    const state = await updateNameAction(
      IDLE_ACCOUNT_STATE,
      form({ firstName: "Jordi", userId: "someone-else" })
    )

    expect(state.ok).toBe(true)
    expect(updateDisplayName).toHaveBeenCalledWith("workos-1", "Jordi", null)
  })
})

describe("what it accepts", () => {
  it("takes an empty pair as removing the name", async () => {
    const state = await updateNameAction(
      IDLE_ACCOUNT_STATE,
      form({ firstName: "", lastName: "" })
    )

    expect(state.ok).toBe(true)
    expect(updateDisplayName).toHaveBeenCalledWith("workos-1", null, null)
  })

  it("trims, so spaces do not pass as a name", async () => {
    await updateNameAction(IDLE_ACCOUNT_STATE, form({ firstName: "   " }))

    expect(updateDisplayName).toHaveBeenCalledWith("workos-1", null, null)
  })

  it("rejects a field over 80 characters without calling WorkOS", async () => {
    const state = await updateNameAction(
      IDLE_ACCOUNT_STATE,
      form({ firstName: "a".repeat(81) })
    )

    expect(state.ok).toBe(false)
    expect(updateDisplayName).not.toHaveBeenCalled()
  })

  it("accepts apostrophes, hyphens and accents", async () => {
    // No character class on purpose: a validator that rejects a real name is
    // worse than one that accepts an odd one, and React escapes the render.
    const state = await updateNameAction(
      IDLE_ACCOUNT_STATE,
      form({ firstName: "Ana-Sofía", lastName: "O'Brien" })
    )

    expect(state.ok).toBe(true)
    expect(updateDisplayName).toHaveBeenCalledWith(
      "workos-1",
      "Ana-Sofía",
      "O'Brien"
    )
  })

  it("does not treat a name that looks like markup as anything special", async () => {
    const state = await updateNameAction(
      IDLE_ACCOUNT_STATE,
      form({ firstName: "<script>alert(1)</script>" })
    )

    // Stored verbatim and escaped at render. Sanitising here would corrupt the
    // value for every other consumer while fixing nothing React had wrong.
    expect(state.ok).toBe(true)
  })
})

describe("limits and failures", () => {
  it("refuses past the rate limit, without calling WorkOS", async () => {
    rateLimitAllowed = false

    const state = await updateNameAction(
      IDLE_ACCOUNT_STATE,
      form({ firstName: "Jordi" })
    )

    expect(state.ok).toBe(false)
    expect(updateDisplayName).not.toHaveBeenCalled()
  })

  it("reports a failure instead of claiming success", async () => {
    updateDisplayName.mockRejectedValue(new Error("workos down"))

    const state = await updateNameAction(
      IDLE_ACCOUNT_STATE,
      form({ firstName: "Jordi" })
    )

    expect(state.ok).toBe(false)
    expect(state.message).toBeTruthy()
  })

  it("does not leak the upstream error to the user", async () => {
    updateDisplayName.mockRejectedValue(new Error("workos api key invalid"))

    const state = await updateNameAction(
      IDLE_ACCOUNT_STATE,
      form({ firstName: "Jordi" })
    )

    expect(state.message).not.toMatch(/api key|workos/i)
  })
})
