import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

import { sanitizeFirstTouch } from "@/lib/attribution/first-touch"
import { isSuspended, SUSPENDED_RESPONSE } from "@/lib/auth/suspension"
import { logError, logInfo } from "@/lib/observability/logger"
import { recordFirstTouch } from "@/services/attribution-service"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

export const dynamic = "force-dynamic"

/**
 * A first touch is six short fields. Anything bigger is not one, and is refused
 * before it is parsed.
 */
const MAX_BODY_BYTES = 2048

/**
 * The browser's first touch, for the signed-in profile.
 *
 * Only ever called by `FirstTouchReport`, which only calls it when analytics is
 * granted in that browser. The server cannot see that answer — it lives in
 * `localStorage` — so the consent gate is the client's, and what the server adds
 * is the rest: a valid session, a profile that is new and has no touch yet, and
 * every field re-checked against its format.
 *
 * Answers 200 whether or not the touch was kept, and says which; the browser
 * stops sending either way.
 */
export async function POST(request: Request) {
  const { user } = await withAuth()

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await request.text()

  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 })
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }

  const touch = sanitizeFirstTouch(parsed)

  if (!touch) {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }

  try {
    const profile = await syncProfileFromWorkOSUser({
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
    })

    if (isSuspended(profile)) {
      return NextResponse.json(SUSPENDED_RESPONSE.body, {
        status: SUSPENDED_RESPONSE.status,
      })
    }

    const outcome = await recordFirstTouch(profile.id, touch)

    // Source and medium only: they are words from a closed list. The campaign,
    // referrer and landing stay in the database and out of the logs.
    logInfo("attribution.first_touch", {
      profileId: profile.id,
      outcome,
      source: touch.source,
      medium: touch.medium,
    })

    return NextResponse.json({ outcome })
  } catch (error) {
    logError("attribution.first_touch_failed", error)

    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}
