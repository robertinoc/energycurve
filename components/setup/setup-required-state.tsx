import Link from "next/link"
import { AlertTriangle, ArrowRight, FileText, ShieldAlert } from "lucide-react"

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,1),_rgba(248,250,252,1)_45%,_rgba(226,232,240,1)_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Local setup required
          </span>

          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
          </div>

          <Alert>
            <ShieldAlert className="size-4" />
            <AlertTitle>WorkOS setup needs attention</AlertTitle>
            <AlertDescription>
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
                "justify-between rounded-2xl px-4"
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
                "rounded-2xl px-4"
              )}
            >
              Open WorkOS dashboard
            </Link>
          </div>
        </section>

        <Card className="border-border/60 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Finish local configuration</CardTitle>
            <CardDescription>
              Update `.env.local`, then restart the dev server on port `3010`.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Configuration items to review
                  </p>
                  <ul className="space-y-2 font-mono text-xs text-muted-foreground">
                    {configurationIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm font-medium">Expected local values</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>`NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3010/auth/callback`</li>
                <li>WorkOS Redirect URI: `http://localhost:3010/auth/callback`</li>
                <li>WorkOS Logout URI: `http://localhost:3010/`</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-2 text-sm leading-6 text-muted-foreground">
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
