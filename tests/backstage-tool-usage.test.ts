import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchToolUsage, TOOL_USAGE_WINDOW_DAYS } from "@/lib/backstage/posthog-reporting"

vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }))

/**
 * Lote 20, task 6, the PostHog half. Not verified against a real PostHog
 * project — this machine has no POSTHOG_PERSONAL_API_KEY — so this pins what
 * can be pinned without one: the question asked (after first use, not before),
 * the parsing, and that a missing answer is null, never zeros.
 */

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function configure() {
  vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "phx_test")
  vi.stubEnv("POSTHOG_PROJECT_ID", "1")
}

describe("fetchToolUsage", () => {
  it("is null when reporting is not configured — the panel then says it has no data", async () => {
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "")
    vi.stubEnv("POSTHOG_PROJECT_ID", "")

    expect(await fetchToolUsage()).toBeNull()
  })

  it("asks for signups after the first use, and returns every tool", async () => {
    configure()
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      Response.json({ results: [["energy_curve", 40, 5], ["camelot_wheel", "10", "2"]] })
    )
    vi.stubGlobal("fetch", fetchMock)

    const usage = await fetchToolUsage()
    const [, init] = fetchMock.mock.calls[0]!
    const query = JSON.parse(String(init.body)).query.query as string

    expect(query).toContain("countIf(s.signed_at > t.first_use)")
    expect(query).toContain(`INTERVAL ${TOOL_USAGE_WINDOW_DAYS} DAY`)
    // A click on "sign up" inside a tool is not using it.
    expect(query).not.toContain("tool_signup_click")
    expect(usage).toEqual({
      windowDays: TOOL_USAGE_WINDOW_DAYS,
      rows: [
        { tool: "energy_curve", users: 40, signedUpAfter: 5 },
        { tool: "camelot_wheel", users: 10, signedUpAfter: 2 },
        { tool: "key_bpm", users: 0, signedUpAfter: 0 },
        { tool: "playlist_converter", users: 0, signedUpAfter: 0 },
      ],
    })
  })

  it("is null, not zeros, when PostHog fails", async () => {
    configure()
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })))

    expect(await fetchToolUsage()).toBeNull()
  })
})
