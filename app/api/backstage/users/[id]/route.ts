import { NextResponse, type NextRequest } from "next/server"

import { isBackstageAdmin } from "@/lib/backstage/config"
import { getBackstageApiSession } from "@/lib/backstage/guard"
import { logError } from "@/lib/observability/logger"
import {
  deleteUserEverywhere,
  getBackstageProfileEmail,
  setUserSuspension,
} from "@/services/backstage-service"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Backstage admins are managed through the BACKSTAGE_ADMIN_EMAILS env var,
 * not through the panel — suspending or deleting one from the UI would be
 * an easy way to lock yourself out.
 */
async function resolveTarget(profileId: string) {
  const email = await getBackstageProfileEmail(profileId)

  if (!email) {
    return { error: NextResponse.json({ error: "User not found." }, { status: 404 }) }
  }

  if (isBackstageAdmin(email)) {
    return {
      error: NextResponse.json(
        { error: "Backstage admin accounts cannot be modified from the panel." },
        { status: 400 }
      ),
    }
  }

  return { email }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getBackstageApiSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
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

  if ("error" in target) {
    return target.error
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

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getBackstageApiSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id } = await context.params
  const target = await resolveTarget(id)

  if ("error" in target) {
    return target.error
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
