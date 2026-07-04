import type { Metadata } from "next"
import Link from "next/link"
import { KeyRound, MailCheck } from "lucide-react"

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
import { forgotPasswordAction } from "@/lib/auth/password-reset"

export const metadata: Metadata = {
  title: "Forgot password",
}

export const dynamic = "force-dynamic"

function getAlertCopy(errorCode?: string) {
  switch (errorCode) {
    case "missing_email":
      return {
        title: "Email required",
        description: "Enter the email address of your account.",
      }
    case "unavailable":
      return {
        title: "Password reset is not available yet",
        description:
          "Email delivery is not configured in this environment. Contact support to recover your account.",
      }
    case "config":
      return {
        title: "Something went wrong",
        description: "The request could not be processed. Try again shortly.",
      }
    case "missing_token":
      return {
        title: "Reset link invalid",
        description:
          "That reset link is missing its token. Request a new one below.",
      }
    default:
      return undefined
  }
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const { error, sent } = await searchParams
  const alertCopy = getAlertCopy(error)

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0B0F] px-6 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-4rem] h-72 w-72 rounded-full bg-[#7B3FE4]/24 blur-3xl" />
        <div className="absolute right-[-4rem] top-16 h-80 w-80 rounded-full bg-[#00D1FF]/16 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-white/10 bg-[#14141B] text-white ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <KeyRound className="size-4 text-white/58" />
            Forgot your password?
          </CardTitle>
          <CardDescription className="text-white/58">
            Enter your account email and we&apos;ll send you a link to choose a
            new password.
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

          {sent ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-5 py-8 text-center">
              <MailCheck className="size-7 text-emerald-400" />
              <p className="text-sm leading-6 text-white/62">
                If an account exists for that email, a reset link is on its
                way. Check your inbox (and spam folder).
              </p>
            </div>
          ) : (
            <form action={forgotPasswordAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-white/72">
                  Email
                </Label>
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="border-white/12 text-white placeholder:text-white/32"
                />
              </div>
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-white/48">
            Remembered it?{" "}
            <Link href="/login" className="text-white underline-offset-4 hover:underline">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
