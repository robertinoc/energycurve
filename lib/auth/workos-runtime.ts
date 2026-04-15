import { logError } from "@/lib/observability/logger"

const GENERIC_WORKOS_CONFIGURATION_ISSUE =
  "AuthKit could not initialize with the current WorkOS configuration. Verify WORKOS_CLIENT_ID, WORKOS_API_KEY, WORKOS_COOKIE_PASSWORD, and NEXT_PUBLIC_WORKOS_REDIRECT_URI."

export function getGenericWorkOSConfigurationIssue() {
  return GENERIC_WORKOS_CONFIGURATION_ISSUE
}

export function logWorkOSRuntimeError(context: string, error: unknown) {
  logError("workos.runtime_error", error, { context })
}
