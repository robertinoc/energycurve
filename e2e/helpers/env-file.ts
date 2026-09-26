import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

/**
 * Reading `.env` files from disk, because the harness cannot assume anyone
 * exported anything.
 *
 * This exists because of a failure that looked like a broken product. The
 * documented way to run the authenticated suite is `set -a; . .env.e2e.local;
 * set +a; npx playwright test`, and that file holds the six account variables
 * and nothing else. `cleanup.ts` needs `SUPABASE_URL` and
 * `SUPABASE_SERVICE_ROLE_KEY`, which live in `.env.local` — a file the Next
 * server loads for itself and the Playwright process never sees.
 *
 * So cleanup threw, playlists survived, and the FREE account reached its cap of
 * three. From there every import was refused **correctly**, and a whole file of
 * green tests went red reporting that importing was broken. The run after that
 * would have started already poisoned. Forgetting one export should not be able
 * to do that, so the files are read here rather than required in the
 * environment.
 *
 * Process environment still wins, so CI can inject secrets without writing them
 * to disk.
 */

/** Walks up from the working directory to the nearest `package.json`. */
export function repoRoot(): string {
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

/**
 * Minimal `KEY=value` reader. Handles the two things a person actually does to
 * one of these files — comments and quoted values — and nothing more.
 *
 * Not `dotenv`: it is present only as a transitive dependency of Next, and a
 * harness that breaks when an unrelated package reorganises its tree is a
 * harness nobody trusts.
 */
export function readEnvFile(path: string): Record<string, string> {
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

// Read once: these files do not change mid-run, and re-reading per call would
// make a deleted file look like a mid-suite failure rather than a setup problem.
const appEnv = readEnvFile(join(repoRoot(), ".env.local"))

/**
 * A variable the *app* needs, from the environment or from `.env.local`.
 *
 * The environment wins, so an operator who did export it gets what they set.
 */
export function readAppEnv(key: string): string {
  return (process.env[key] ?? appEnv[key] ?? "").trim()
}
