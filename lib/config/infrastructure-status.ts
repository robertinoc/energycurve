const REQUIRED_WORKOS_ENV_NAMES = [
  "WORKOS_CLIENT_ID",
  "WORKOS_API_KEY",
  "WORKOS_COOKIE_PASSWORD",
  "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
] as const

const REQUIRED_SUPABASE_ENV_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim())
}

function isValidUrl(value: string | undefined) {
  if (!value) {
    return false
  }

  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function getMissingWorkOSEnvNames() {
  return REQUIRED_WORKOS_ENV_NAMES.filter((name) => {
    if (!hasValue(name)) {
      return true
    }

    if (
      name === "WORKOS_COOKIE_PASSWORD" &&
      (process.env.WORKOS_COOKIE_PASSWORD?.length ?? 0) < 32
    ) {
      return true
    }

    if (
      name === "NEXT_PUBLIC_WORKOS_REDIRECT_URI" &&
      !isValidUrl(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI)
    ) {
      return true
    }

    return false
  })
}

function getMissingSupabaseEnvNames() {
  return REQUIRED_SUPABASE_ENV_NAMES.filter((name) => {
    if (!hasValue(name)) {
      return true
    }

    if (name === "SUPABASE_URL" && !isValidUrl(process.env.SUPABASE_URL)) {
      return true
    }

    return false
  })
}

export function getInfrastructureStatus() {
  const missingWorkOSEnvNames = getMissingWorkOSEnvNames()
  const missingSupabaseEnvNames = getMissingSupabaseEnvNames()

  return {
    workosConfigured: missingWorkOSEnvNames.length === 0,
    supabaseConfigured: missingSupabaseEnvNames.length === 0,
    missingWorkOSEnvNames,
    missingSupabaseEnvNames,
  }
}

export function isWorkOSConfigured() {
  return getInfrastructureStatus().workosConfigured
}

export function isSupabaseConfigured() {
  return getInfrastructureStatus().supabaseConfigured
}
