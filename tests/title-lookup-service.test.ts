import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The network side of title lookup — the product's only external data API.
 *
 * The parsing and matching already have tests (`tests/title-lookup.test.ts`).
 * What had none is the part that talks to someone else's server, which is
 * exactly the part that fails in ways we do not control: timeouts, 429s, HTML
 * error pages served with a 200, and a payload shape that changes without
 * notice.
 *
 * The contract every one of these has to satisfy is the same: **a lookup that
 * fails leaves the track exactly as it was.** Missing BPM is a worse outcome
 * than a filled one and a far better outcome than a wrong one, and nothing here
 * may throw onward — the DJ asked to enrich a playlist, not to be shown a stack
 * trace because a free API had a bad minute.
 */

const fetchMock = vi.fn()

vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

const { lookupTracks, isTitleLookupConfigured } = await import(
  "@/services/title-lookup-service"
)

const TRACKS = [{ trackId: "t1", artist: "Adam Beyer", title: "Your Mind" }]

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  vi.stubEnv("GETSONGBPM_API_KEY", "test-key")
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("when there is no key", () => {
  it("reports itself unavailable rather than half-working", async () => {
    vi.stubEnv("GETSONGBPM_API_KEY", "")

    expect(isTitleLookupConfigured()).toBe(false)
  })

  it("returns every track unmatched and never calls out", async () => {
    vi.stubEnv("GETSONGBPM_API_KEY", "")

    await expect(lookupTracks(TRACKS)).resolves.toEqual([
      { trackId: "t1", result: null },
    ])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("when their server says no", () => {
  const failures: Array<[name: string, response: unknown]> = [
    ["429, rate limited", jsonResponse({}, 429)],
    ["500, their outage", jsonResponse({}, 500)],
    ["403, key rejected", jsonResponse({}, 403)],
    ["404", jsonResponse({}, 404)],
  ]

  for (const [name, response] of failures) {
    it(`survives ${name} and leaves the track untouched`, async () => {
      fetchMock.mockResolvedValue(response)

      await expect(lookupTracks(TRACKS)).resolves.toEqual([
        { trackId: "t1", result: null },
      ])
    })
  }

  it("survives a timeout without throwing", async () => {
    // `AbortSignal.timeout` rejects with this. A convenience feature must not
    // hold a request open or take the page down because a third party is slow.
    fetchMock.mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" })
    )

    await expect(lookupTracks(TRACKS)).resolves.toEqual([
      { trackId: "t1", result: null },
    ])
  })

  it("survives the network being gone entirely", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))

    await expect(lookupTracks(TRACKS)).resolves.toEqual([
      { trackId: "t1", result: null },
    ])
  })
})

describe("when their payload is not what we expect", () => {
  it("handles the error object they send instead of an array on no results", async () => {
    // Documented oddity: they answer 200 with `{search: {error: "no result"}}`,
    // which is why the code checks the shape rather than the status.
    fetchMock.mockResolvedValue(
      jsonResponse({ search: { error: "no result" } })
    )

    await expect(lookupTracks(TRACKS)).resolves.toEqual([
      { trackId: "t1", result: null },
    ])
  })

  it("handles a body that is not JSON at all", async () => {
    // An HTML error page served with a 200 is what a proxy or a WAF returns,
    // and `response.json()` throws on it.
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON")
      },
    })

    await expect(lookupTracks(TRACKS)).resolves.toEqual([
      { trackId: "t1", result: null },
    ])
  })

  for (const [name, payload] of [
    ["null", null],
    ["an empty object", {}],
    ["search as a string", { search: "none" }],
    ["an array of nulls", { search: [null, null] }],
    ["entries missing every field", { search: [{}, { title: "x" }] }],
  ] as Array<[string, unknown]>) {
    it(`does not trust ${name}`, async () => {
      fetchMock.mockResolvedValue(jsonResponse(payload))

      const [outcome] = await lookupTracks(TRACKS)

      expect(outcome.result).toBeNull()
    })
  }
})

describe("what it does with an answer it can use", () => {
  it("returns the match for the track that asked", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        search: [
          {
            title: "Your Mind",
            artist: { name: "Adam Beyer" },
            tempo: "128",
            key_of: "8A",
          },
        ],
      })
    )

    const [outcome] = await lookupTracks(TRACKS)

    expect(outcome.trackId).toBe("t1")
    expect(outcome.result).not.toBeNull()
  })

  it("never sends the API key anywhere but the query string of their host", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ search: [] }))

    await lookupTracks(TRACKS)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(url.startsWith("https://api.getsongbpm.com/")).toBe(true)
    // Not in a header we might later log, and not in a body.
    expect(JSON.stringify(init.headers ?? {})).not.toContain("test-key")
    expect(init.body).toBeUndefined()
  })

  it("sends only the artist and the title, never anything about the user", async () => {
    // The privacy claim in the RoPA for T8 is exactly this: artist and title
    // leave the machine, nothing else does.
    fetchMock.mockResolvedValue(jsonResponse({ search: [] }))

    await lookupTracks([
      { trackId: "playlist-owner-secret", artist: "Adam Beyer", title: "Your Mind" },
    ])

    const [url] = fetchMock.mock.calls[0] as [string]

    expect(url).not.toContain("playlist-owner-secret")
  })
})

describe("a batch", () => {
  it("returns one outcome per request, matched or not", async () => {
    // A silent partial result reads as a bug when half the tracks don't change.
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ search: [] }))
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          search: [
            {
              title: "Rotterdam",
              artist: { name: "Amelie Lens" },
              tempo: "140",
              key_of: "1A",
            },
          ],
        })
      )

    const outcomes = await lookupTracks([
      { trackId: "a", artist: "X", title: "One" },
      { trackId: "b", artist: "Y", title: "Two" },
      { trackId: "c", artist: "Amelie Lens", title: "Rotterdam" },
    ])

    expect(outcomes.map((outcome) => outcome.trackId)).toEqual(["a", "b", "c"])
    expect(outcomes[1].result).toBeNull()
  })

  it("one track's failure does not abandon the rest", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValue(jsonResponse({ search: [] }))

    const outcomes = await lookupTracks([
      { trackId: "a", artist: "X", title: "One" },
      { trackId: "b", artist: "Y", title: "Two" },
    ])

    expect(outcomes).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("calls one at a time, because a burst is what trips a rate limiter", async () => {
    let inFlight = 0
    let maxInFlight = 0

    fetchMock.mockImplementation(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight -= 1
      return jsonResponse({ search: [] })
    })

    await lookupTracks([
      { trackId: "a", artist: "X", title: "One" },
      { trackId: "b", artist: "Y", title: "Two" },
      { trackId: "c", artist: "Z", title: "Three" },
    ])

    expect(maxInFlight).toBe(1)
  })
})
