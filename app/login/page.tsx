import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { PasswordAuthPage } from "@/components/auth/password-auth-page"
import { SetupRequiredState } from "@/components/setup/setup-required-state"
import { getSafeReturnTo } from "@/lib/auth/return-to"
import { loginWithPasswordAction } from "@/lib/auth/password-auth"
import {
  getGenericWorkOSConfigurationIssue,
  logWorkOSRuntimeError,
} from "@/lib/auth/workos-runtime"
import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"

type AuthPageParams = Promise<{
  error?: string | string[]
  loggedOut?: string | string[]
  returnTo?: string | string[]
}>

export const metadata: Metadata = {
  title: "Login",
}

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: AuthPageParams
}) {
  const params = await searchParams
  const infrastructureStatus = getInfrastructureStatus()

  if (!infrastructureStatus.workosConfigured) {
    return (
      <SetupRequiredState
        configurationIssues={infrastructureStatus.missingWorkOSEnvNames}
        title="EnergyCurve cannot start the login flow yet"
        description="The dashboard request reached the app correctly, but WorkOS environment variables are still missing or incomplete."
      />
    )
  }

  const returnTo = getSafeReturnTo(params.returnTo)
  const error = Array.isArray(params.error) ? params.error[0] : params.error
  const loggedOut = Array.isArray(params.loggedOut)
    ? params.loggedOut[0]
    : params.loggedOut

  let user: Awaited<ReturnType<typeof withAuth>>["user"] | null = null

  try {
    const auth = await withAuth()
    user = auth.user
  } catch (error) {
    logWorkOSRuntimeError("Login page auth check failed", error)

    return (
      <SetupRequiredState
        configurationIssues={[getGenericWorkOSConfigurationIssue()]}
        title="EnergyCurve cannot start the login flow yet"
        description="The WorkOS variables exist, but AuthKit could not read or initialize the current session safely."
      />
    )
  }

  if (user) {
    redirect("/dashboard")
  }

  return (
    <PasswordAuthPage
      mode="login"
      returnTo={returnTo}
      errorCode={error}
      loggedOut={loggedOut === "1"}
      action={loginWithPasswordAction}
    />
  )
}
