export const DEFAULT_RETURN_TO = "/dashboard"

export function getSafeReturnTo(
  rawValue: string | string[] | null | undefined
) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue

  if (!value) {
    return DEFAULT_RETURN_TO
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO
  }

  return value
}

export function buildReturnToHref(pathname: string, returnTo?: string) {
  const safeReturnTo = getSafeReturnTo(returnTo)
  const searchParams = new URLSearchParams({
    returnTo: safeReturnTo,
  })

  return `${pathname}?${searchParams.toString()}`
}
