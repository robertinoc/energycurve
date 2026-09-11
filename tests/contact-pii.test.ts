import { describe, expect, it, vi } from "vitest"

/**
 * The contact form is the one place in the product where a stranger types free
 * text, and it used to copy all of it — their name, their email, the full body
 * of the message and their IP — into an application log with no retention
 * policy, no redaction and no access control beyond the hosting dashboard.
 *
 * Someone writing in about a billing problem, or quoting a private setlist, had
 * it duplicated somewhere nobody would think to look for their data, and nothing
 * was ever deleting it. The privacy policy does not mention it either.
 *
 * This test is the thing that stops it coming back, because "add the message to
 * the log so we can debug it" is a reasonable-sounding change that someone will
 * propose again.
 */

const logInfo = vi.fn()
const logWarn = vi.fn()

vi.mock("@/lib/observability/logger", () => ({
  logInfo,
  logWarn,
  logError: vi.fn(),
}))
vi.mock("@/lib/email/send-email", () => ({
  isEmailDeliveryConfigured: () => false,
  sendEmail: vi.fn(async () => undefined),
}))

const { submitContactMessage } = await import("@/services/contact-service")

const SUBMISSION = {
  name: "Jordi Vidal",
  email: "jordi.vidal@example.com",
  message: "My set for Saturday at Razzmatazz leaked in the shared link.",
  locale: "es" as const,
  company: "",
}

const CONTEXT = {
  ipAddress: "203.0.113.77",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  origin: "https://energycurve.app",
}

describe("what reaches the application log", () => {
  it("never contains the message body, the email, the name or the IP", async () => {
    logInfo.mockClear()

    await submitContactMessage(SUBMISSION as never, CONTEXT)

    const logged = JSON.stringify(logInfo.mock.calls)

    for (const secret of [
      SUBMISSION.message,
      "Razzmatazz", // a venue name is exactly the kind of thing not to copy
      SUBMISSION.email,
      SUBMISSION.name,
      "Jordi",
      CONTEXT.ipAddress,
      CONTEXT.userAgent,
    ]) {
      expect(logged, `leaked: ${secret}`).not.toContain(secret)
    }
  })

  it("still records enough to prove a submission happened", async () => {
    logInfo.mockClear()

    const { referenceId } = await submitContactMessage(SUBMISSION as never, CONTEXT)

    // The log's job is to answer "did this arrive?" when delivery fails. That
    // needs an identifier and a timestamp, not the contents.
    const [event, payload] = logInfo.mock.calls[0] as [string, Record<string, unknown>]

    expect(event).toBe("contact.submission_received")
    expect(payload.referenceId).toBe(referenceId)
    expect(payload.submittedAt).toBeTruthy()
    expect(payload.messageLength).toBe(SUBMISSION.message.length)
  })

  it("keeps the email domain but not the address, to spot a bot flood", async () => {
    logInfo.mockClear()

    await submitContactMessage(SUBMISSION as never, CONTEXT)

    const [, payload] = logInfo.mock.calls[0] as [string, Record<string, unknown>]

    expect(payload.emailDomain).toBe("example.com")
    expect(JSON.stringify(payload)).not.toContain("jordi.vidal")
  })
})
