import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { buildReturnToHref, getSafeReturnTo } from "@/lib/auth/return-to"
import { getInfrastructureStatus } from "@/lib/config/infrastructure-status"
import { SetupRequiredState } from "@/components/setup/setup-required-state"
import {
  getGenericWorkOSConfigurationIssue,
  logWorkOSRuntimeError,
} from "@/lib/auth/workos-runtime"

type AuthPageParams = Promise<{
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

  const params = await searchParams
  const returnTo = getSafeReturnTo(params.returnTo)

  return (
    <AuthPageShell
      eyebrow="WorkOS AuthKit"
      title="Create your EnergyCurve account"
      description="Sign up uses the official hosted WorkOS flow while keeping app data ownership inside Supabase Postgres."
      primaryHref={buildReturnToHref("/auth/signup", returnTo)}
      primaryLabel="Create your account"
      secondaryHref={buildReturnToHref("/login", returnTo)}
      secondaryLabel="Login"
      hint="The first successful authentication syncs the profile record so future app data can stay separate from the auth provider."
    />
  )
}
