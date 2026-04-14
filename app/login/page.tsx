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

  const params = await searchParams
  const returnTo = getSafeReturnTo(params.returnTo)
  const error = Array.isArray(params.error) ? params.error[0] : params.error
  const loggedOut = Array.isArray(params.loggedOut)
    ? params.loggedOut[0]
    : params.loggedOut
  const freshLoginHref = `${buildReturnToHref("/auth/login", returnTo)}&fresh=1`

  return (
    <AuthPageShell
      eyebrow="WorkOS AuthKit"
      title="Sign in to EnergyCurve"
      description="Hosted authentication is wired with WorkOS so the protected dashboard stays simple, secure, and ready for future product work."
      primaryHref={freshLoginHref}
      primaryLabel="Login"
      secondaryHref={buildReturnToHref("/signup", returnTo)}
      secondaryLabel="Create your account"
      hint="After a successful sign-in, EnergyCurve creates or syncs the application profile in Supabase."
      alertTitle={
        error === "auth"
          ? "Authentication needs another try"
          : loggedOut === "1"
            ? "Signed out successfully"
          : error === "setup"
            ? "WorkOS still needs to be configured"
            : error === "config"
              ? "WorkOS configuration still needs attention"
            : undefined
      }
      alertDescription={
        error === "auth"
          ? "The callback could not be completed. Start a fresh sign-in attempt."
          : loggedOut === "1"
            ? "Your EnergyCurve session is closed. If Google or another identity provider still has an active session, WorkOS may take you back in immediately unless you sign out there too."
          : error === "setup"
            ? "Complete the WorkOS environment variables first, then try the protected route again."
          : error === "config"
            ? "AuthKit could not initialize with the current WorkOS values. Recheck the API key, client ID, redirect URI, and cookie password."
          : undefined
      }
    />
  )
}
