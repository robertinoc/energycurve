import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

/**
 * The three test accounts the authenticated suite runs as, and the one rule
 * that keeps this file honest: **a missing account skips, it never fails, and
 * it never passes quietly.**
 *
 * Those three outcomes are not interchangeable. Failing would paint the suite
 * red on every machine that has not been handed the credentials, including CI,
 * which trains everyone to ignore the colour. Passing would be worse: a green
 * tick over tests that never ran is precisely the shape of the two defects this
 * audit injected and did not catch, where the instrument reported on itself
 * rather than on the product. So the tests announce their own absence, with the
 * reason, and `describe.configure` puts it in the report rather than in a log.
 *
 * Credentials live in `.env.e2e.local` at the repo root, which `.gitignore`
 * already covers via `.env*`. They are read here rather than through `dotenv`
 * on purpose: dotenv is present only as a transitive dependency of Next, and a
 * test harness that breaks when an unrelated package reorganises its tree is a
 * harness nobody trusts. The format this needs is `KEY=value` lines, so parsing
 * it is cheaper than the dependency.
 */

export type TestPlan = "free" | "pro" | "proPlus"

export interface TestAccount {
  readonly plan: TestPlan
  readonly email: string
  readonly password: string
}

const ENV_KEYS: Record<TestPlan, { email: string; password: string }> = {
  free: { email: "E2E_FREE_EMAIL", password: "E2E_FREE_PASSWORD" },
  pro: { email: "E2E_PRO_EMAIL", password: "E2E_PRO_PASSWORD" },
  proPlus: { email: "E2E_PROPLUS_EMAIL", password: "E2E_PROPLUS_PASSWORD" },
}

/**
 * Walks up from the working directory to the nearest `package.json`.
 *
 * Not `import.meta.url`, which is what this reached for first: Playwright
 * transpiles config and helpers to CommonJS, where it is a syntax error, and
 * the failure surfaces as "Cannot use 'import.meta' outside a module" while
 * loading the config — before any test, with no hint that a path helper caused
 * it. Walking up also survives being run from a subdirectory, which
 * `process.cwd()` alone does not.
 */
function findRepoRoot(): string {
  let dir = process.cwd()

  for (let depth = 0; depth < 10; depth++) {
    if (existsSync(join(dir, "package.json"))) {
      return dir
    }

    const parent = dirname(dir)

    if (parent === dir) {
      break
    }

    dir = parent
  }

  return process.cwd()
}

const REPO_ROOT = findRepoRoot()
const ENV_FILE = join(REPO_ROOT, ".env.e2e.local")

/**
 * Minimal `KEY=value` reader. Handles the two things a person actually does to
 * one of these files — comments and quoted values — and nothing more.
 */
function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {}
  }

  const out: Record<string, string> = {}

  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const eq = line.indexOf("=")

    if (eq <= 0) {
      continue
    }

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    out[key] = value
  }

  return out
}

// Read once: the file does not change mid-run, and re-reading it per test would
// make a deleted file look like a mid-suite failure rather than a setup problem.
const fileEnv = readEnvFile(ENV_FILE)

/**
 * Process environment wins over the file so CI can inject credentials as
 * secrets without writing them to disk — the file is the local convenience,
 * not the only channel.
 */
function readKey(key: string): string {
  return (process.env[key] ?? fileEnv[key] ?? "").trim()
}

/** The account for a plan, or null when its credentials are not configured. */
export function accountFor(plan: TestPlan): TestAccount | null {
  const email = readKey(ENV_KEYS[plan].email)
  const password = readKey(ENV_KEYS[plan].password)

  // Both or neither. Half a credential is a typo, not a configuration, and
  // treating it as "configured" produces a login failure that reads like a
  // broken app instead of a broken .env.
  if (!email || !password) {
    return null
  }

  return { plan, email, password }
}

/** Where the signed-in browser state for a plan is cached between runs. */
export function storageStatePath(plan: TestPlan): string {
  return join(REPO_ROOT, "e2e", ".auth", `${plan}.json`)
}

/**
 * Why a plan's tests are being skipped, phrased for whoever reads the report
 * six weeks from now and has never seen `.env.e2e.local`.
 */
export function skipReason(plan: TestPlan): string {
  const keys = ENV_KEYS[plan]

  return `No ${plan} test account: set ${keys.email} and ${keys.password} in .env.e2e.local (see A1 in the test plan). Skipped, not passed — nothing about the ${plan} tier was verified.`
}

/** True when every plan has credentials, which is what a full run requires. */
export function allAccountsConfigured(): boolean {
  return (["free", "pro", "proPlus"] as const).every(
    (plan) => accountFor(plan) !== null
  )
}
