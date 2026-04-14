import "server-only"

import { ContactFormInput } from "@/lib/contact-form"

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

  console.info(
    "[EnergyCurve contact]",
    JSON.stringify({
      referenceId,
      submittedAt: new Date().toISOString(),
      input: {
        name: input.name,
        email: input.email,
        message: input.message,
      },
      context,
    })
  )

  return {
    referenceId,
  }
}
