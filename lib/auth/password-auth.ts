"use server"

import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs"
import type { AuthenticationResponse } from "@workos-inc/node"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  buildCallbackUrlFromHeaders,
  mapLoginError,
  mapSignupError,
} from "@/lib/auth/password-auth-helpers"
import { buildReturnToHref, getSafeReturnTo } from "@/lib/auth/return-to"
import { syncProfileFromWorkOSUser } from "@/services/profile-service"

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value.trim() : ""
}

async function getRequestContextUrl() {
  const headersStore = await headers()
  return buildCallbackUrlFromHeaders(
    headersStore,
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  )
}

async function persistWorkOSSession(
  authResponse: AuthenticationResponse,
  requestUrl: string
) {
  await saveSession(
    {
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      user: authResponse.user,
      impersonator: authResponse.impersonator,
    },
    requestUrl
  )

  await syncProfileFromWorkOSUser({
    id: authResponse.user.id,
    email: authResponse.user.email,
    firstName: authResponse.user.firstName ?? null,
    lastName: authResponse.user.lastName ?? null,
  })
}

export async function loginWithPasswordAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getFormValue(formData, "returnTo"))
  const email = getFormValue(formData, "email")
  const password = getFormValue(formData, "password")

  if (!email || !password) {
    redirect(`${buildReturnToHref("/login", returnTo)}&error=missing_fields`)
  }

  const requestUrl = await getRequestContextUrl()

  if (!requestUrl) {
    redirect(`${buildReturnToHref("/login", returnTo)}&error=config`)
  }

  try {
    const headersStore = await headers()
    const authResponse = await getWorkOS().userManagement.authenticateWithPassword(
      {
        clientId: process.env.WORKOS_CLIENT_ID,
        email,
        password,
        userAgent: headersStore.get("user-agent") ?? undefined,
      }
    )

    await persistWorkOSSession(authResponse, requestUrl)
  } catch (error) {
    redirect(
      `${buildReturnToHref("/login", returnTo)}&error=${mapLoginError(error)}`
    )
  }

  redirect(returnTo)
}

export async function signupWithPasswordAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getFormValue(formData, "returnTo"))
  const email = getFormValue(formData, "email")
  const password = getFormValue(formData, "password")
  const confirmPassword = getFormValue(formData, "confirmPassword")

  if (!email || !password || !confirmPassword) {
    redirect(`${buildReturnToHref("/signup", returnTo)}&error=missing_fields`)
  }

  if (password !== confirmPassword) {
    redirect(
      `${buildReturnToHref("/signup", returnTo)}&error=password_mismatch`
    )
  }

  const requestUrl = await getRequestContextUrl()

  if (!requestUrl) {
    redirect(`${buildReturnToHref("/signup", returnTo)}&error=config`)
  }

  try {
    const headersStore = await headers()

    await getWorkOS().userManagement.createUser({
      email,
      password,
      emailVerified: true,
    })

    const authResponse = await getWorkOS().userManagement.authenticateWithPassword(
      {
        clientId: process.env.WORKOS_CLIENT_ID,
        email,
        password,
        userAgent: headersStore.get("user-agent") ?? undefined,
      }
    )

    await persistWorkOSSession(authResponse, requestUrl)
  } catch (error) {
    redirect(
      `${buildReturnToHref("/signup", returnTo)}&error=${mapSignupError(error)}`
    )
  }

  redirect(returnTo)
}
