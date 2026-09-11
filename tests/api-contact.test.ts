import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The only public, unauthenticated POST in the product. Its defences are a
 * same-origin check, a honeypot, an IP rate limit and a Zod schema, and none of
 * them had a test.
 *
 * Each test uses a distinct client IP on purpose: `lib/rate-limit.ts` keeps its
 * buckets in a module-level Map with no reset, so a shared IP would leak state
 * between tests. That is a real property of the limiter, not a test smell — the
 * same Map is why the limit is per serverless instance in production and resets
 * on a cold start. Noted in the F4 findings.
 */

const submitContactMessage = vi.fn(async () => ({ ok: true as const }))

vi.mock("@/services/contact-service", () => ({ submitContactMessage }))
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

const { POST } = await import("@/app/api/contact/route")

const ORIGIN = "https://energycurve.app"

function post(
  body: unknown,
  { headers = {}, ip = "203.0.113.1" }: { headers?: Record<string, string>; ip?: string } = {}
) {
  return POST(
    new Request(`${ORIGIN}/api/contact`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  )
}

const validMessage = {
  name: "Jordi",
  email: "jordi@example.com",
  message: "El export a Traktor me borró los hotcues.",
  locale: "es",
}

beforeEach(() => {
  submitContactMessage.mockClear()
})

describe("the same-origin check", () => {
  it("refuses a cross-origin POST", async () => {
    const response = await post(validMessage, {
      headers: { origin: "https://evil.example" },
      ip: "203.0.113.10",
    })

    expect(response.status).toBe(403)
    expect(submitContactMessage).not.toHaveBeenCalled()
  })

  it("refuses a referer from somewhere else", async () => {
    const response = await post(validMessage, {
      headers: { referer: "https://evil.example/page" },
      ip: "203.0.113.11",
    })

    expect(response.status).toBe(403)
    expect(submitContactMessage).not.toHaveBeenCalled()
  })

  it("accepts its own origin, so the two refusals mean something", async () => {
    const response = await post(validMessage, {
      headers: { origin: ORIGIN },
      ip: "203.0.113.12",
    })

    expect(response.status).toBe(200)
    expect(submitContactMessage).toHaveBeenCalledOnce()
  })

  it("accepts a request carrying neither header — documenting the gap", async () => {
    // `isTrustedOrigin` only rejects a header that is present and wrong, so a
    // client that sends neither passes. Browsers always send at least one on a
    // cross-origin POST, so this is not an open door in practice; a script is
    // not a browser, which is what the rate limit and honeypot are for.
    //
    // Pinned rather than fixed: tightening it to require an Origin would reject
    // legitimate non-browser callers, and that is a product decision. If it is
    // ever tightened, this test should be the one that fails and gets rewritten.
    const response = await post(validMessage, { ip: "203.0.113.13" })

    expect(response.status).toBe(200)
  })
})

describe("the honeypot", () => {
  it("does not deliver a submission that filled the hidden field", async () => {
    const response = await post(
      { ...validMessage, company: "Acme Marketing Ltd" },
      { headers: { origin: ORIGIN }, ip: "203.0.113.20" }
    )

    // Answers as if it worked: telling a bot it was detected teaches it to
    // adapt, and telling a human their message failed would be a lie.
    expect(response.status).toBe(200)
    expect(submitContactMessage).not.toHaveBeenCalled()
  })
})

describe("validation", () => {
  it("rejects a body that is not JSON at all", async () => {
    const response = await post("not json", {
      headers: { origin: ORIGIN },
      ip: "203.0.113.30",
    })

    expect(response.status).toBe(400)
    expect(submitContactMessage).not.toHaveBeenCalled()
  })

  it("rejects a malformed email without reaching the service", async () => {
    const response = await post(
      { ...validMessage, email: "not-an-email" },
      { headers: { origin: ORIGIN }, ip: "203.0.113.31" }
    )

    expect(response.status).toBe(400)
    expect(submitContactMessage).not.toHaveBeenCalled()
  })
})

describe("the rate limit", () => {
  it("allows five in the window and refuses the sixth with Retry-After", async () => {
    const ip = "203.0.113.40"
    const results: number[] = []

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await post(validMessage, { headers: { origin: ORIGIN }, ip })
      results.push(response.status)

      if (attempt === 5) {
        expect(response.headers.get("Retry-After")).toBeTruthy()
      }
    }

    expect(results).toEqual([200, 200, 200, 200, 200, 429])
    expect(submitContactMessage).toHaveBeenCalledTimes(5)
  })

  it("counts per IP, not globally", async () => {
    // A shared bucket would let one abusive sender lock out everyone else.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await post(validMessage, { headers: { origin: ORIGIN }, ip: "203.0.113.50" })
    }

    const other = await post(validMessage, {
      headers: { origin: ORIGIN },
      ip: "203.0.113.51",
    })

    expect(other.status).toBe(200)
  })

  it("reads the first address in x-forwarded-for, not the proxy chain", async () => {
    const ip = "203.0.113.60"

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await post(validMessage, {
        headers: { origin: ORIGIN, "x-forwarded-for": `${ip}, 10.0.0.1, 10.0.0.2` },
      })
    }

    // Same client, a different proxy hop behind it: still the same bucket.
    const sixth = await post(validMessage, {
      headers: { origin: ORIGIN, "x-forwarded-for": `${ip}, 10.9.9.9` },
    })

    expect(sixth.status).toBe(429)
  })
})
