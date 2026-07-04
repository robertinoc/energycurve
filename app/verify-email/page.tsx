import type { Metadata } from "next"
import Link from "next/link"
import { MailCheck, ShieldCheck } from "lucide-react"
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
import {
  resendVerificationEmailAction,
  verifyEmailAction,
} from "@/lib/auth/email-verification"

export const metadata: Metadata = {
  title: "Verify your email",
}

export const dynamic = "force-dynamic"

function getAlertCopy(errorCode?: string) {
  switch (errorCode) {
    case "missing_code":
      return {
        title: "Code required",
        description: "Enter the 6-digit code from the verification email.",
      }
    case "invalid_code":
      return {
        title: "Invalid or expired code",
        description:
          "Double-check the code, or resend a fresh one and use the newest email.",
      }
    case "config":
      return {
        title: "Something went wrong",
        description: "The request could not be processed. Try again shortly.",
      }
    default:
      return undefined
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    pending?: string
    email?: string
    returnTo?: string
    error?: string
    resent?: string
  }>
}) {
  const { pending, email, returnTo, error, resent } = await searchParams

  if (!pending || !email) {
    redirect("/signup")
  }

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
            <ShieldCheck className="size-4 text-white/58" />
            Verify your email
          </CardTitle>
          <CardDescription className="text-white/58">
            We sent a 6-digit code to <span className="text-white">{email}</span>.
            Enter it below to activate your account.
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

          {resent ? (
            <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/62">
              <MailCheck className="size-4 shrink-0 text-emerald-400" />
              A fresh code is on its way. Use the newest email you received.
            </p>
          ) : null}

          <form action={verifyEmailAction} className="space-y-4">
            <input type="hidden" name="pending" value={pending} />
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="returnTo" value={returnTo ?? "/dashboard"} />
            <div className="space-y-2">
              <Label htmlFor="verify-code" className="text-white/72">
                Verification code
              </Label>
              <Input
                id="verify-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                placeholder="123456"
                className="border-white/12 text-center font-mono text-lg tracking-[0.4em] text-white placeholder:tracking-normal placeholder:text-white/32"
              />
            </div>
            <Button type="submit" className="w-full">
              Verify and continue
            </Button>
          </form>

          <form action={resendVerificationEmailAction} className="text-center">
            <input type="hidden" name="pending" value={pending} />
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="returnTo" value={returnTo ?? "/dashboard"} />
            <button
              type="submit"
              className="text-sm text-white/48 underline-offset-4 transition hover:text-white hover:underline"
            >
              Resend the code
            </button>
          </form>

          <p className="text-center text-sm text-white/48">
            Wrong email?{" "}
            <Link href="/signup" className="text-white underline-offset-4 hover:underline">
              Start over
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
