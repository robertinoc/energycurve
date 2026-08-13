import type { Metadata } from "next"
import Link from "next/link"
import { LockKeyhole } from "lucide-react"
import { redirect } from "next/navigation"

import { PasswordPolicyField } from "@/components/auth/password-policy-field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parsePasswordMinLength } from "@/lib/auth/password-policy"
import { resetPasswordAction } from "@/lib/auth/password-reset"
import { getAuthAlertCopy } from "@/lib/content/auth-copy"
import { getRequestLocale } from "@/lib/server-locale"

export const metadata: Metadata = {
  title: "Reset password",
}

export const dynamic = "force-dynamic"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string
    error?: string
    minLength?: string
  }>
}) {
  const { token, error, minLength } = await searchParams

  if (!token) {
    redirect("/forgot-password?error=missing_token")
  }

  const locale = await getRequestLocale()
  const passwordMinLength = parsePasswordMinLength(minLength)
  const alertCopy = getAuthAlertCopy({
    errorCode: error,
    locale,
    minLength: passwordMinLength,
  })

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08050F] px-6 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-4rem] h-72 w-72 rounded-full bg-[#A24DE0]/24 blur-3xl" />
        <div className="absolute right-[-4rem] top-16 h-80 w-80 rounded-full bg-[#22D3EE]/16 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-white/10 bg-[#14101F] text-white ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <LockKeyhole className="size-4 text-white/58" />
            Choose a new password
          </CardTitle>
          <CardDescription className="text-white/58">
            Set the new password for your EnergyCurve account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alertCopy ? (
            <Alert className="border-white/10 bg-black/24 text-white">
              <AlertTitle>{alertCopy.title}</AlertTitle>
              <AlertDescription className="text-white/62">
                {alertCopy.description}
              </AlertDescription>
            </Alert>
          ) : null}

          <form action={resetPasswordAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <PasswordPolicyField
              id="reset-password"
              name="password"
              label="New password"
              placeholder="Create a strong password"
              locale={locale}
              minLength={passwordMinLength}
            />
            <div className="space-y-2">
              <Label htmlFor="reset-confirm" className="text-white/72">
                Confirm new password
              </Label>
              <Input
                id="reset-confirm"
                name="confirmPassword"
                type="password"
                required
                placeholder="Repeat your password"
                className="border-white/12 text-white placeholder:text-white/32"
              />
            </div>
            <Button type="submit" className="w-full">
              Update password
            </Button>
          </form>

          <p className="text-center text-sm text-white/48">
            <Link
              href="/forgot-password"
              className="text-white underline-offset-4 hover:underline"
            >
              Request a new link
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
