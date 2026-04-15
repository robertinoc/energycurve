import "server-only"

import { ContactFormInput } from "@/lib/contact-form"
import { logInfo } from "@/lib/observability/logger"

interface ContactSubmissionContext {
  ipAddress: string
  userAgent: string | null
  origin: string
}

export async function submitContactMessage(
  input: ContactFormInput,
  context: ContactSubmissionContext
) {
  const referenceId = `ec_${crypto.randomUUID()}`

  logInfo("contact.submission_received", {
    referenceId,
    submittedAt: new Date().toISOString(),
    input: {
      name: input.name,
      email: input.email,
      message: input.message,
    },
    context: {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      origin: context.origin,
    },
  })

  return {
    referenceId,
  }
}
