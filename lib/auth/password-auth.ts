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
import { logError, logInfo, logWarn } from "@/lib/observability/logger"
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

async function getAuthTelemetryContext(email: string) {
  const headersStore = await headers()

  return {
    email,
    userAgent: headersStore.get("user-agent") ?? null,
    forwardedHost: headersStore.get("x-forwarded-host") ?? headersStore.get("host"),
    forwardedProto: headersStore.get("x-forwarded-proto") ?? null,
  }
}

async function persistWorkOSSession(
  authResponse: AuthenticationResponse,
  requestUrl: string
) {
  try {
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
  } catch (error) {
    logError("auth.session_persist_failed", error, {
      email: authResponse.user.email,
      workosUserId: authResponse.user.id,
    })

    throw error
  }
}

export async function loginWithPasswordAction(formData: FormData) {
  const returnTo = getSafeReturnTo(getFormValue(formData, "returnTo"))
  const email = getFormValue(formData, "email")
  const password = getFormValue(formData, "password")

  if (!email || !password) {
    logWarn("auth.login_missing_fields", { email: email || null, returnTo })
    redirect(`${buildReturnToHref("/login", returnTo)}&error=missing_fields`)
  }

  const requestUrl = await getRequestContextUrl()

  if (!requestUrl) {
    logError("auth.login_missing_callback_url", new Error("Missing callback URL"), {
      email,
      returnTo,
    })
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
    logInfo("auth.login_succeeded", {
      email,
      workosUserId: authResponse.user.id,
      returnTo,
    })
  } catch (error) {
    const authError = mapLoginError(error)
    logWarn("auth.login_failed", {
      ...(await getAuthTelemetryContext(email)),
      returnTo,
      authError,
    })

    redirect(
      `${buildReturnToHref("/login", returnTo)}&error=${authError}`
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
    logWarn("auth.signup_missing_fields", { email: email || null, returnTo })
    redirect(`${buildReturnToHref("/signup", returnTo)}&error=missing_fields`)
  }

  if (password !== confirmPassword) {
    logWarn("auth.signup_password_mismatch", { email, returnTo })
    redirect(
      `${buildReturnToHref("/signup", returnTo)}&error=password_mismatch`
    )
  }

  const requestUrl = await getRequestContextUrl()

  if (!requestUrl) {
    logError("auth.signup_missing_callback_url", new Error("Missing callback URL"), {
      email,
      returnTo,
    })
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
    logInfo("auth.signup_succeeded", {
      email,
      workosUserId: authResponse.user.id,
      returnTo,
      emailVerifiedBypass: true,
    })
  } catch (error) {
    const signupError = mapSignupError(error)
    logWarn("auth.signup_failed", {
      ...(await getAuthTelemetryContext(email)),
      returnTo,
      signupError,
    })

    redirect(
      `${buildReturnToHref("/signup", returnTo)}&error=${signupError}`
    )
  }

  redirect(returnTo)
}
