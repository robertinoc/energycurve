import Link from "next/link"
import { AlertTriangle, ArrowRight, FileText, ShieldAlert } from "lucide-react"

import { EnergyCurveLogo } from "@/components/brand/energycurve-logo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SetupRequiredStateProps {
  configurationIssues: string[]
  title: string
  description: string
}

export function SetupRequiredState({
  configurationIssues,
  title,
  description,
}: SetupRequiredStateProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B0F] px-6 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#7B3FE4]/22 blur-3xl" />
        <div className="absolute right-[-4rem] top-16 h-80 w-80 rounded-full bg-[#00D1FF]/14 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:68px_68px] opacity-20" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <EnergyCurveLogo
            tone="light"
            size="lg"
            caption="Local setup required"
          />

          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-white/64 sm:text-lg">
              {description}
            </p>
          </div>

          <Alert className="border-white/10 bg-white/[0.05] text-white">
            <ShieldAlert className="size-4 text-white/72" />
            <AlertTitle>WorkOS setup needs attention</AlertTitle>
            <AlertDescription className="text-white/62">
              EnergyCurve now fails gracefully when auth credentials are
              missing or invalid, but authentication routes cannot run until
              the WorkOS setup is complete.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className={cn(
                buttonVariants({ size: "lg" }),
                "justify-between bg-linear-to-r from-[#7B3FE4] via-[#00D1FF] to-[#FF2D75] px-4 text-[#071018]"
              )}
            >
              Back to landing
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="https://dashboard.workos.com"
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "rounded-2xl border-white/10 bg-white/[0.03] px-4 text-white"
              )}
            >
              Open WorkOS dashboard
            </Link>
          </div>
        </section>

        <Card className="border-white/10 bg-white/[0.05] text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] ring-0">
          <CardHeader>
            <CardTitle className="text-white">Finish local configuration</CardTitle>
            <CardDescription className="text-white/58">
              Update `.env.local`, then restart the dev server on port `3010`.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 text-white/58" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">
                    Configuration items to review
                  </p>
                  <ul className="space-y-2 font-mono text-xs text-white/54">
                    {configurationIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <p className="text-sm font-medium text-white">Expected local values</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-white/56">
                <li>`NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3010/auth/callback`</li>
                <li>WorkOS Redirect URI: `http://localhost:3010/auth/callback`</li>
                <li>WorkOS Logout URI: `http://localhost:3010/`</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-4 text-white/58" />
                <div className="space-y-2 text-sm leading-6 text-white/56">
                  <p>
                    Copy `.env.example` to `.env.local` if you have not created
                    it yet.
                  </p>
                  <p>
                    Detailed instructions live in `README.md` and
                    `docs/setup-infra.md`.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
