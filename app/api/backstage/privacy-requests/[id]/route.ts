import { NextResponse, type NextRequest } from "next/server"

import { getBackstageApiSession } from "@/lib/backstage/guard"
import { isTrustedOrigin } from "@/lib/http/trusted-origin"
import { logError, logWarn } from "@/lib/observability/logger"
import { recordAdminAction } from "@/services/admin-audit-service"
import { resolvePrivacyRequest } from "@/services/privacy-request-service"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Closing a data-rights request.
 *
 * Same preamble as the user endpoints — admin session, then same-origin — and
 * for the same reason S-12 gave: a cookie-authenticated endpoint that writes
 * should not have its cross-site defence be a CORS policy nobody wrote on
 * purpose. This one is far less consequential than deleting an account, and it
 * gets the check anyway, because the cost of the check is a function call and
 * the cost of deciding case by case is that someone decides wrong once.
 *
 * Deliberately narrow: it marks a request answered or refused and writes a note.
 * It does not carry out the request. Nothing here rectifies an email or
 * restricts anything — those are done by hand, by a person, and this is the row
 * saying they were.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Enough for a real answer, bounded so the column is not a notes field. */
const MAX_NOTE_LENGTH = 500

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getBackstageApiSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!isTrustedOrigin(request)) {
    logWarn("backstage.untrusted_origin", {
      origin: request.headers.get("origin"),
      actorEmail: session.email,
    })

    return NextResponse.json({ error: "Untrusted origin." }, { status: 403 })
  }

  const { id } = await context.params

  // Validated before it reaches Postgres, which is S-13: a malformed id used to
  // travel all the way to a `22P02` and come back as an unhandled 500.
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as {
    status?: unknown
    note?: unknown
  } | null

  const status = body?.status
  const note = typeof body?.note === "string" ? body.note.trim() : ""

  if (status !== "answered" && status !== "refused") {
    return NextResponse.json(
      { error: "Body must include status 'answered' or 'refused'." },
      { status: 400 }
    )
  }

  // A refusal without a reason is not a refusal under Art. 12(4): the reason and
  // the right to complain have to be communicated. Requiring the note here does
  // not prove either was sent, but it does stop the row from claiming a refusal
  // that nobody can account for later.
  if (status === "refused" && note.length === 0) {
    return NextResponse.json(
      { error: "A refusal needs a reason — Art. 12(4)." },
      { status: 400 }
    )
  }

  if (note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `A note can be at most ${MAX_NOTE_LENGTH} characters.` },
      { status: 400 }
    )
  }

  try {
    const changed = await resolvePrivacyRequest({
      requestId: id,
      status,
      note,
    })

    if (!changed) {
      // Either it does not exist or it was already closed, and the two answer
      // the same — which is the same reasoning as the public curve page: a more
      // helpful message would confirm that an id exists.
      return NextResponse.json({ error: "Request not found." }, { status: 404 })
    }

    // Answering a rights request is not irreversible the way deleting an account
    // is, but it IS the act that discharges a legal obligation, so it belongs in
    // the same durable record. `targetProfileId` is the request id rather than a
    // profile: the audit row's job is to say which obligation was discharged,
    // and the profile is a join away through the request.
    await recordAdminAction({
      actorEmail: session.email,
      action:
        status === "answered"
          ? "privacy_request.answered"
          : "privacy_request.refused",
      targetProfileId: id,
      // No target email, deliberately: the audit log holds addresses for the
      // account actions and sweeps them after a year, and adding one here would
      // put the address of somebody exercising a data right into a second table
      // for no gain — the request row already has it, and its own sweep clears
      // it on a window tied to resolution rather than to arrival.
      detail: { noteLength: note.length },
    })

    return NextResponse.json({ id, status })
  } catch (error) {
    logError("backstage.privacy_request_resolve_failed", error, {
      requestId: id,
    })

    return NextResponse.json(
      { error: "Unable to update the request." },
      { status: 500 }
    )
  }
}
