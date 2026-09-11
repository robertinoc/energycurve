import { NextResponse, type NextRequest } from "next/server"

import { isBackstageAdmin } from "@/lib/backstage/config"
import { getBackstageApiSession } from "@/lib/backstage/guard"
import { isTrustedOrigin } from "@/lib/http/trusted-origin"
import { logError, logWarn } from "@/lib/observability/logger"
import {
  deleteUserEverywhere,
  getBackstageProfileEmail,
  setUserSuspension,
} from "@/services/backstage-service"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Profile ids are uuids, and everything downstream assumes it.
 *
 * Without this, `/api/backstage/users/not-a-uuid` reached Postgres, which
 * answered with error 22P02, which `getProfileById` turned into a throw outside
 * any try — so the panel's answer to a malformed id was an unhandled 500 rather
 * than "no such user". A crash is not a security hole here, but it is the
 * difference between a route that refuses input and one that forwards it.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Both handlers below run the same preamble: admin session, same-origin, then a
 * target that exists and is not another admin.
 *
 * The origin check arrived with the F2 audit, which found the protection
 * distributed backwards — the unauthenticated contact form had one and these
 * cookie-authenticated endpoints, which suspend and delete accounts, did not. A
 * JSON `PATCH` is preflighted, so CORS already stops the naive cross-site
 * version; this is the check that does not depend on a CORS policy staying
 * correct forever, on the endpoint where being wrong once deletes a customer.
 */

/**
 * Backstage admins are managed through the BACKSTAGE_ADMIN_EMAILS env var,
 * not through the panel — suspending or deleting one from the UI would be
 * an easy way to lock yourself out.
 */
/**
 * Explicitly discriminated on `ok`, and the previous shape is worth recording
 * because it looked like it discriminated and did not.
 *
 * It returned `{ error: NextResponse } | { email: string }`, and the callers did
 * `if ("error" in target) return target.error`. TypeScript widens an inferred
 * union of object literals so that every member carries every key — the second
 * member becomes `{ email: string; error?: undefined }` — so `"error" in target`
 * narrows nothing and `target.error` is `NextResponse | undefined`. The handlers
 * were therefore typed as possibly returning `undefined`, which surfaced the
 * moment something imported them and read `.status`. It works at runtime, since
 * the optional key really is absent; it is one refactor away from not.
 */
type TargetResolution =
  | { ok: false; response: NextResponse }
  | { ok: true; email: string }

async function resolveTarget(profileId: string): Promise<TargetResolution> {
  const notFound: TargetResolution = {
    ok: false,
    response: NextResponse.json({ error: "User not found." }, { status: 404 }),
  }

  if (!UUID_PATTERN.test(profileId)) {
    return notFound
  }

  const email = await getBackstageProfileEmail(profileId)

  if (!email) {
    return notFound
  }

  if (isBackstageAdmin(email)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Backstage admin accounts cannot be modified from the panel." },
        { status: 400 }
      ),
    }
  }

  return { ok: true, email }
}

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
  const body = (await request.json().catch(() => null)) as {
    suspended?: unknown
  } | null

  if (!body || typeof body.suspended !== "boolean") {
    return NextResponse.json(
      { error: "Body must include a boolean 'suspended' field." },
      { status: 400 }
    )
  }

  const target = await resolveTarget(id)

  if (!target.ok) {
    return target.response
  }

  try {
    const profile = await setUserSuspension(id, body.suspended, session.email)

    return NextResponse.json({
      id: profile.id,
      suspendedAt: profile.suspended_at,
    })
  } catch (error) {
    logError("backstage.suspension_update_failed", error, { profileId: id })

    return NextResponse.json(
      { error: "Unable to update the suspension state." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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
  const target = await resolveTarget(id)

  if (!target.ok) {
    return target.response
  }

  try {
    const { email } = await deleteUserEverywhere(id, session.email)

    return NextResponse.json({ deleted: true, email })
  } catch (error) {
    logError("backstage.user_delete_failed", error, { profileId: id })

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete the user.",
      },
      { status: 500 }
    )
  }
}
