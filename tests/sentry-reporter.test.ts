import { beforeEach, describe, expect, it } from "vitest"

import {
  MAX_EVENTS_PER_MINUTE,
  buildEvent,
  parseDsn,
  resetReporterBudget,
  scrubMetadata,
  withinBudget,
} from "@/lib/observability/sentry"

/**
 * The reporter that replaced the SDK.
 *
 * Most of these pin the transport. The one that matters is the scrubbing: the
 * logger already carries emails (`auth.password_reset_rate_limited` passes one),
 * so a reporter that forwarded metadata verbatim would ship user addresses to a
 * processor in the US. That is a privacy incident with a green test suite.
 */

beforeEach(() => {
  resetReporterBudget()
})

describe("parseDsn", () => {
  it("splits a real DSN into what the ingest call needs", () => {
    expect(parseDsn("https://abc123@o42.ingest.sentry.io/1234567")).toEqual({
      host: "o42.ingest.sentry.io",
      projectId: "1234567",
      publicKey: "abc123",
    })
  })

  it("treats an unset DSN as not configured", () => {
    expect(parseDsn(undefined)).toBeNull()
    expect(parseDsn("")).toBeNull()
  })

  it("returns null on a malformed DSN instead of throwing", () => {
    // A typo in an environment variable must not be able to take a request
    // down. Null is the same path as "not configured".
    expect(parseDsn("not a url")).toBeNull()
    expect(parseDsn("https://o42.ingest.sentry.io/1234567")).toBeNull() // no key
    expect(parseDsn("https://abc123@o42.ingest.sentry.io")).toBeNull() // no project
  })
})

describe("scrubMetadata", () => {
  it("forwards the ids that make an error diagnosable", () => {
    expect(
      scrubMetadata({ profileId: "p-1", playlistId: "pl-1", count: 3 })
    ).toEqual({ profileId: "p-1", playlistId: "pl-1", count: 3 })
  })

  it("does not forward an email", () => {
    // The reason this file exists. lib/auth/password-reset.ts logs { email }.
    const scrubbed = scrubMetadata({ email: "dj@example.com" })

    expect(JSON.stringify(scrubbed)).not.toContain("dj@example.com")
  })

  it("names what it dropped instead of leaving a hole", () => {
    // An empty object tells the next person nothing. This tells them where to
    // look, and lets them add the key deliberately.
    expect(scrubMetadata({ email: "dj@example.com" })).toEqual({
      email: "[dropped: not on the forward list]",
    })
  })

  it("drops a nested object even under an allowed key", () => {
    // Where an email actually hides: not under `email`, but inside the
    // serialised error of a key that is otherwise fine to send.
    const scrubbed = scrubMetadata({
      profileId: { nested: "dj@example.com" },
    })

    expect(JSON.stringify(scrubbed)).not.toContain("dj@example.com")
  })

  it("is an allow-list, so a new key is dropped until someone allows it", () => {
    // The export leak taught this from the other side: a denylist misses
    // exactly the fields nobody thought of. A new logger key has to fail
    // closed.
    expect(scrubMetadata({ venueName: "Razzmatazz" })).toEqual({
      venueName: "[dropped: not on the forward list]",
    })
  })
})

describe("buildEvent", () => {
  it("groups on the log event name, not the exception message", () => {
    // A message like "playlist pl-9f2 not found" would scatter one fault across
    // hundreds of issues. The event name is the stable fingerprint.
    const built = buildEvent({
      event: "smart_order.failed",
      error: new Error("playlist pl-9f2 not found"),
      metadata: {},
      environment: "production",
    })

    expect(built.logger).toBe("smart_order.failed")
    expect(built.message).toBe("smart_order.failed")
  })

  it("carries the exception type and message when there is an Error", () => {
    const built = buildEvent({
      event: "x.failed",
      error: new TypeError("bad input"),
      metadata: {},
      environment: "production",
    })

    expect(built.exception?.values[0]).toMatchObject({
      type: "TypeError",
      value: "bad input",
    })
  })

  it("still reports when what was thrown is not an Error", () => {
    // `throw "boom"` happens, and it is not a reason to report nothing.
    const built = buildEvent({
      event: "x.failed",
      error: "boom",
      metadata: {},
      environment: "production",
    })

    expect(built.exception).toBeUndefined()
    expect(built.message).toBe("x.failed")
  })

  it("scrubs the metadata it carries", () => {
    const built = buildEvent({
      event: "auth.reset_failed",
      error: new Error("nope"),
      metadata: { email: "dj@example.com", profileId: "p-1" },
      environment: "production",
    })

    expect(JSON.stringify(built)).not.toContain("dj@example.com")
    expect(built.extra.profileId).toBe("p-1")
  })

  it("omits release rather than sending an empty one", () => {
    const built = buildEvent({
      event: "x.failed",
      error: null,
      metadata: {},
      environment: "development",
    })

    expect(built).not.toHaveProperty("release")
  })
})

describe("withinBudget", () => {
  it("allows up to the cap in a minute", () => {
    for (let i = 0; i < MAX_EVENTS_PER_MINUTE; i += 1) {
      expect(withinBudget(1_000)).toBe(true)
    }

    expect(withinBudget(1_000)).toBe(false)
  })

  it("opens again in the next minute", () => {
    // A failing dependency errors in a loop, and an unbounded reporter turns one
    // outage into two by spending the whole Sentry quota. But a budget that
    // never reopens would hide the next incident.
    for (let i = 0; i <= MAX_EVENTS_PER_MINUTE; i += 1) withinBudget(1_000)

    expect(withinBudget(62_000)).toBe(true)
  })
})
