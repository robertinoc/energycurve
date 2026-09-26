import { execFileSync } from "node:child_process"

import { readAppEnv } from "./env-file"

/**
 * What the billing suite needs before it is allowed to charge anything, and the
 * one rule that keeps it safe: **a missing listener skips, a live key fails.**
 *
 * Those two outcomes are deliberately different, because the two situations are.
 *
 * No webhook listener is an ordinary, expected state: CI has none, and neither
 * does a laptop that has not started one this morning. Entitlement in this app
 * is granted *only* by the webhook — `app/api/billing/checkout/route.ts` says so
 * outright — so without a listener a checkout would complete at Stripe and the
 * app would never hear about it. The test would then fail while reporting on the
 * absence of a terminal rather than on the product. So it skips, and names the
 * exact command to start.
 *
 * A live secret key is not an ordinary state. It means the suite is pointed at
 * the account that takes real customers' money, and the next thing it would do
 * is create a subscription on it. That is the one case here that must be loud:
 * skipping would let a misconfiguration sit quietly until somebody's card is
 * charged by a test. So it throws, and says which variable to look at.
 */

const WEBHOOK_PATH = "/api/billing/webhook"

/**
 * The secret key's *mode*, never its value.
 *
 * Read from the environment first and `.env.local` second, which is the order
 * the app itself resolves it in. Only the `sk_test` / `sk_live` prefix is ever
 * returned or printed: a skip message that quoted the key would put a live
 * credential into a CI log, which is the failure this file exists to prevent
 * rather than to cause.
 */
export function stripeMode(): "test" | "live" | "absent" {
  const key = readAppEnv("STRIPE_SECRET_KEY")

  if (!key) {
    return "absent"
  }

  return key.startsWith("sk_live") ? "live" : key.startsWith("sk_test") ? "test" : "absent"
}

/**
 * True when the Stripe CLI is on PATH at all.
 *
 * Runs the binary rather than asking a shell to look for it: `execFileSync`
 * with `shell` set concatenates its arguments instead of escaping them, which
 * Node deprecated (DEP0190) for exactly the reason it sounds like. Asking
 * `stripe --version` directly needs no shell — a missing binary raises ENOENT,
 * which is the same answer by a safer route.
 */
export function stripeCliInstalled(): boolean {
  try {
    execFileSync("stripe", ["--version"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

/**
 * Every `stripe listen` currently running, as its full command line.
 *
 * Process inspection rather than a probe against the app: posting a synthetic
 * event to the webhook to see whether anything answers would either be rejected
 * for a bad signature — proving nothing about the listener — or, if it were
 * signed correctly, grant somebody entitlement as a side effect of a readiness
 * check. Reading `ps` costs nothing and changes nothing.
 */
function runningListeners(): string[] {
  try {
    return execFileSync("ps", ["-Ao", "args="], { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /(^|\/)stripe\b/.test(line) && /\blisten\b/.test(line))
  } catch {
    return []
  }
}

/** True when a listener is forwarding to this run's webhook endpoint. */
export function webhookListenerReady(port: string): boolean {
  return runningListeners().some(
    (line) => line.includes(port) && line.includes(WEBHOOK_PATH)
  )
}

/** The command whoever reads the skipped report needs to run. */
export function startListenerCommand(port: string): string {
  return `stripe listen --forward-to http://127.0.0.1:${port}${WEBHOOK_PATH}`
}

/**
 * Why the billing suite is skipping, or null when it may run.
 *
 * Phrased for somebody who has never started a listener, and specific about
 * *which* of the three reasons applies — "Stripe not configured" would send
 * them to the wrong file two times out of three.
 */
export function billingSkipReason(port: string): string | null {
  if (stripeMode() === "absent") {
    return `No Stripe key: set STRIPE_SECRET_KEY (test mode) in .env.local. Skipped, not passed — nothing about subscriptions, payment or invoicing was verified.`
  }

  if (!stripeCliInstalled()) {
    return `Stripe CLI not installed: \`brew install stripe/stripe-cli/stripe\`, then \`stripe login\`, then \`${startListenerCommand(port)}\`. Skipped, not passed — nothing about subscriptions, payment or invoicing was verified.`
  }

  if (!webhookListenerReady(port)) {
    const others = runningListeners()
    const detail =
      others.length === 0
        ? "None is running."
        : `One is running but not forwarding here: ${others[0]}`

    return `No Stripe webhook listener for port ${port}. ${detail} Entitlement in this app is granted only by the webhook, so a checkout would succeed at Stripe and never reach the app. Start it with: \`${startListenerCommand(port)}\`. Skipped, not passed — nothing about subscriptions, payment or invoicing was verified.`
  }

  return null
}

/**
 * Refuses to continue against a live account.
 *
 * Separate from `billingSkipReason` on purpose, and throwing rather than
 * skipping, because this is the one condition here that must never be quiet.
 */
export function refuseLiveMode(): void {
  if (stripeMode() === "live") {
    throw new Error(
      "STRIPE_SECRET_KEY is a live key. This suite creates subscriptions and would charge a real card. Point .env.local at the Stripe test account before running it."
    )
  }
}
