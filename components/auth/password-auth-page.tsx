import Link from "next/link"
import { ArrowRight, LockKeyhole } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
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
import { Separator } from "@/components/ui/separator"

interface PasswordAuthPageProps {
  mode: "login" | "signup"
  returnTo: string
  errorCode?: string
  loggedOut?: boolean
  action: (formData: FormData) => Promise<void>
}

function getAlertCopy(
  mode: "login" | "signup",
  errorCode?: string,
  loggedOut?: boolean
) {
  if (loggedOut) {
    return {
      title: "Signed out successfully",
      description: "Your session has been closed. You can sign in again or create a new account.",
    }
  }

  switch (errorCode) {
    case "missing_fields":
      return {
        title: "Missing required fields",
        description: "Complete all required fields before continuing.",
      }
    case "invalid_credentials":
      return {
        title: "Invalid credentials",
        description: "The email or password did not match a valid WorkOS account.",
      }
    case "password_mismatch":
      return {
        title: "Passwords do not match",
        description: "Use the same password in both fields before creating the account.",
      }
    case "email_taken":
      return {
        title: "Email already in use",
        description: "That address already belongs to an account. Try logging in instead.",
      }
    case "weak_password":
      return {
        title: "Password needs another try",
        description: "Choose a stronger password that meets your WorkOS password policy.",
      }
    case "auth":
      return {
        title: "Authentication failed",
        description: "WorkOS could not complete sign in with the submitted credentials.",
      }
    case "signup_failed":
      return {
        title: "Sign up failed",
        description: "WorkOS could not create the account with the submitted credentials.",
      }
    case "config":
      return {
        title: "WorkOS configuration still needs attention",
        description: "The current WorkOS values could not complete this request. Recheck the server configuration.",
      }
    case "social_config":
      return {
        title: "Google sign-in is not ready yet",
        description: "WorkOS could not start the Google flow. Confirm that Google Social Login is enabled in WorkOS.",
      }
    default:
      if (mode === "login") {
        return undefined
      }

      return undefined
  }
}

export function PasswordAuthPage({
  mode,
  returnTo,
  errorCode,
  loggedOut = false,
  action,
}: PasswordAuthPageProps) {
  const isSignup = mode === "signup"
  const alertCopy = getAlertCopy(mode, errorCode, loggedOut)
  const title = isSignup
    ? "Create your EnergyCurve account"
    : "Sign in to EnergyCurve"
  const googleHref = `/auth/social/google?mode=${mode}&returnTo=${encodeURIComponent(returnTo)}`
  const description = isSignup
    ? "Create an account with email and password, backed by WorkOS and stored as a secure app session."
    : "Sign in with email and password through WorkOS, while keeping the app experience simple and controlled."

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B0F] px-6 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-4rem] h-72 w-72 rounded-full bg-[#7B3FE4]/24 blur-3xl" />
        <div className="absolute right-[-4rem] top-16 h-80 w-80 rounded-full bg-[#00D1FF]/16 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:68px_68px] opacity-20" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <EnergyCurveLogo
            tone="light"
            size="lg"
            caption={isSignup ? "WorkOS-backed sign up" : "WorkOS-backed login"}
          />

          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-white/68 sm:text-lg">
              {description}
            </p>
          </div>

          <form
            action={action}
            className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur"
          >
            <input type="hidden" name="returnTo" value={returnTo} />

            {alertCopy ? (
              <Alert className="border-white/10 bg-black/25 text-white">
                <LockKeyhole className="size-4 text-white/70" />
                <AlertTitle>{alertCopy.title}</AlertTitle>
                <AlertDescription className="text-white/62">
                  {alertCopy.description}
                </AlertDescription>
              </Alert>
            ) : null}

            <a
              href={googleHref}
              className="flex h-11 items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-4 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_14px_34px_rgba(0,0,0,0.24),0_0_24px_rgba(0,209,255,0.08)]"
            >
              <GoogleMark />
              Continue with Google
            </a>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/32">
              <Separator className="flex-1 bg-white/10" />
              <span>Email and password</span>
              <Separator className="flex-1 bg-white/10" />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-email`} className="text-white/82">
                Email
              </Label>
              <Input
                id={`${mode}-email`}
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-11 rounded-2xl border-white/12 bg-black/18 px-3 text-white placeholder:text-white/35"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-password`} className="text-white/82">
                Password
              </Label>
              <Input
                id={`${mode}-password`}
                name="password"
                type="password"
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="h-11 rounded-2xl border-white/12 bg-black/18 px-3 text-white placeholder:text-white/35"
                placeholder={isSignup ? "Create a strong password" : "Enter your password"}
              />
            </div>

            {isSignup ? (
              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password" className="text-white/82">
                  Confirm password
                </Label>
                <Input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="h-11 rounded-2xl border-white/12 bg-black/18 px-3 text-white placeholder:text-white/35"
                  placeholder="Repeat your password"
                />
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full justify-between bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] text-[#071018]"
            >
              {isSignup ? "Create your account" : "Login"}
              <ArrowRight className="size-4" />
            </Button>

            <div className="text-sm text-white/58">
              {isSignup
                ? "Already have an account?"
                : "Need an account?"}{" "}
              <Link
                href={
                  isSignup
                    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
                    : `/signup?returnTo=${encodeURIComponent(returnTo)}`
                }
                className="text-white underline decoration-white/24 underline-offset-4 transition hover:text-[#76E7FF]"
              >
                {isSignup ? "Login" : "Create your account"}
              </Link>
            </div>
          </form>
        </section>

        <Card className="border-white/10 bg-white/[0.05] text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] ring-0">
          <CardHeader>
            <CardTitle className="text-white">Why this auth flow exists</CardTitle>
            <CardDescription className="text-white/62">
              EnergyCurve keeps authentication inside WorkOS, but brings the UI under product control.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm leading-6 text-white/62">
              <p>Credentials are handled by WorkOS user management.</p>
              <p>
                Successful sign in still creates the same secure app session and
                syncs the user profile into Supabase.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">
                  Predictable SaaS entry
                </p>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Login and sign up no longer depend on a hosted handoff that can
                  auto-resolve an upstream session before the user sees a form.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">
                  Same secure foundation
                </p>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Protected routing, session cookies, callback handling, and
                  profile synchronization stay intact underneath.
                </p>
              </div>
            </div>

            {isSignup ? (
              <Alert className="border-white/10 bg-black/25 text-white">
                <LockKeyhole className="size-4 text-white/70" />
                <AlertTitle>Temporary signup note</AlertTitle>
                <AlertDescription className="text-white/62">
                  New accounts are marked as verified immediately so the custom
                  sign-up flow can stay unblocked during this foundation phase.
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
    >
      <path
        d="M21.805 12.23c0-.71-.064-1.393-.182-2.05H12v3.878h5.498a4.7 4.7 0 0 1-2.036 3.083v2.558h3.296c1.93-1.777 3.047-4.396 3.047-7.469Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.074-.914 6.765-2.47l-3.296-2.558c-.914.612-2.083.974-3.469.974-2.664 0-4.922-1.799-5.729-4.218H2.864v2.638A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.27 13.728A5.99 5.99 0 0 1 5.95 12c0-.6.108-1.18.32-1.728V7.634H2.864a10 10 0 0 0 0 8.732l3.406-2.638Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.055c1.502 0 2.85.517 3.912 1.532l2.935-2.935C17.07 2.996 14.756 2 12 2A10 10 0 0 0 2.864 7.634l3.406 2.638c.803-2.423 3.061-4.217 5.73-4.217Z"
        fill="#EA4335"
      />
    </svg>
  )
}
