"use server"

import { sealData } from "iron-session"
import { getWorkOS } from "@workos-inc/authkit-nextjs"

import { getSafeReturnTo } from "@/lib/auth/return-to"

const PKCE_COOKIE_NAME = "wos-auth-verifier"

interface GoogleAuthUrlOptions {
  requestUrl: string
  returnTo?: string | null
}

export async function getGoogleAuthorizationRequest({
  requestUrl,
  returnTo,
}: GoogleAuthUrlOptions) {
  const redirectUri =
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ??
    new URL("/auth/callback", requestUrl).toString()

  const pkce = await getWorkOS().pkce.generate()
  const safeReturnTo = getSafeReturnTo(returnTo)
  const sealedState = await sealData(
    {
      nonce: crypto.randomUUID(),
      codeVerifier: pkce.codeVerifier,
      returnPathname: safeReturnTo,
    },
    {
      password: process.env.WORKOS_COOKIE_PASSWORD ?? "",
      ttl: 600,
    }
  )

  const authorizationUrl = getWorkOS().userManagement.getAuthorizationUrl({
    provider: "GoogleOAuth",
    clientId: process.env.WORKOS_CLIENT_ID,
    redirectUri,
    state: sealedState,
    codeChallenge: pkce.codeChallenge,
    codeChallengeMethod: pkce.codeChallengeMethod,
    providerQueryParams: {
      prompt: "select_account",
    },
  })

  return {
    authorizationUrl,
    pkceCookie: {
      name: PKCE_COOKIE_NAME,
      value: sealedState,
      maxAge: 600,
      secure: redirectUri.startsWith("https://"),
    },
  }
}
