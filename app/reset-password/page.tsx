import type { Metadata } from "next"
import Link from "next/link"
import { LockKeyhole } from "lucide-react"
import { redirect } from "next/navigation"

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
import { resetPasswordAction } from "@/lib/auth/password-reset"

export const metadata: Metadata = {
  title: "Reset password",
}

export const dynamic = "force-dynamic"

function getAlertCopy(errorCode?: string) {
  switch (errorCode) {
    case "missing_fields":
      return {
        title: "Missing required fields",
        description: "Complete both password fields before continuing.",
      }
    case "password_mismatch":
      return {
        title: "Passwords do not match",
        description: "Use the same password in both fields.",
      }
    case "weak_password":
      return {
        title: "Password needs another try",
        description: "Choose a stronger password that meets the password policy.",
      }
    case "reset_invalid":
      return {
        title: "Reset link expired or invalid",
        description: "Request a fresh link from the forgot-password page.",
      }
    case "reset_failed":
      return {
        title: "Reset failed",
        description: "The password could not be updated. Try again shortly.",
      }
    default:
      return undefined
  }
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  if (!token) {
    redirect("/forgot-password?error=missing_token")
  }

  const alertCopy = getAlertCopy(error)

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
            <div className="space-y-2">
              <Label htmlFor="reset-password" className="text-white/72">
                New password
              </Label>
              <Input
                id="reset-password"
                name="password"
                type="password"
                required
                placeholder="Create a strong password"
                className="border-white/12 text-white placeholder:text-white/32"
              />
            </div>
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
