import { NextResponse, type NextRequest } from "next/server"

import { getBackstageApiSession } from "@/lib/backstage/guard"
import { logError } from "@/lib/observability/logger"
import { sendBackstageMessage } from "@/services/backstage-service"

type RouteContext = { params: Promise<{ id: string }> }

const MAX_SUBJECT = 150
const MAX_BODY = 4000

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getBackstageApiSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const payload = (await request.json().catch(() => null)) as {
    subject?: unknown
    body?: unknown
  } | null

  const subject = typeof payload?.subject === "string" ? payload.subject.trim() : ""
  const body = typeof payload?.body === "string" ? payload.body.trim() : ""

  if (!subject || !body) {
    return NextResponse.json(
      { error: "Both a subject and a message are required." },
      { status: 400 }
    )
  }

  if (subject.length > MAX_SUBJECT || body.length > MAX_BODY) {
    return NextResponse.json(
      { error: "The subject or message is too long." },
      { status: 400 }
    )
  }

  try {
    const result = await sendBackstageMessage(id, subject, body, session.email)

    if (result.sent) {
      return NextResponse.json({ sent: true })
    }

    const responses: Record<typeof result.reason, [string, number]> = {
      not_configured: [
        "Email delivery is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL).",
        503,
      ],
      not_found: ["User not found.", 404],
      send_failed: ["Resend did not accept the email. Check the logs.", 502],
    }
    const [error, status] = responses[result.reason]

    return NextResponse.json({ error }, { status })
  } catch (error) {
    logError("backstage.message_failed", error, { profileId: id })

    return NextResponse.json(
      { error: "Unable to send the message." },
      { status: 500 }
    )
  }
}
