import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { PasswordAuthPage } from "@/components/auth/password-auth-page"
import { SetupRequiredState } from "@/components/setup/setup-required-state"
import { getSafeReturnTo } from "@/lib/auth/return-to"
import { signupWithPasswordAction } from "@/lib/auth/password-auth"
import {
  getGenericWorkOSConfigurationIssue,
  logWorkOSRuntimeError,
} from "@/lib/auth/workos-runtime"
import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"

type AuthPageParams = Promise<{
  error?: string | string[]
  returnTo?: string | string[]
}>

export const metadata: Metadata = {
  title: "Sign Up",
}

export const dynamic = "force-dynamic"

export default async function SignupPage({
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
        title="EnergyCurve cannot start the sign-up flow yet"
        description="The app is running, but the hosted WorkOS setup is not complete enough to launch a registration session."
      />
    )
  }

  const returnTo = getSafeReturnTo(params.returnTo)
  const error = Array.isArray(params.error) ? params.error[0] : params.error

  let user: Awaited<ReturnType<typeof withAuth>>["user"] | null = null

  try {
    const auth = await withAuth()
    user = auth.user
  } catch (error) {
    logWorkOSRuntimeError("Signup page auth check failed", error)

    return (
      <SetupRequiredState
        configurationIssues={[getGenericWorkOSConfigurationIssue()]}
        title="EnergyCurve cannot start the sign-up flow yet"
        description="The WorkOS variables exist, but AuthKit could not initialize the hosted registration flow cleanly."
      />
    )
  }

  if (user) {
    redirect("/dashboard")
  }

  return (
    <PasswordAuthPage
      mode="signup"
      returnTo={returnTo}
      errorCode={error}
      action={signupWithPasswordAction}
    />
  )
}
