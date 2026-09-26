#!/usr/bin/env node
/**
 * The whole E2E suite as parallel shards, reported as one number.
 *
 * Why shards, and why these. The suite grew past what one process finishes in
 * the time CI gives it: the "End-to-end tests" step has `timeout-minutes: 12`,
 * and by lote 10 a single `playwright test` took 655 s of those 720 — 91 %.
 * Locally the same suite was being run as two halves, public and
 * authenticated, which is a documented patch and not a solution.
 *
 * The split is by measured time, not by file count. From the lote-10 runs
 * (sum of test durations, server start-up excluded):
 *
 *   firefox 145 s · webkit 136 s · mobile-safari 136 s · chromium 110 s
 *   auth-free 90 s · auth-proPlus 85 s · auth-pro 77 s · setup 8 s
 *
 * So each public browser is a shard of its own, and the three authenticated
 * projects — plus the setup they depend on — are ONE shard, on purpose: they
 * mutate the dev database and run at `workers: 1` for exactly that reason
 * (see playwright.config.ts). Two shards touching the same accounts at once is
 * the contention lote 7 already fought. The auth shard is the longest at
 * ~260 s, and it is still shorter than the two halves it replaces.
 *
 * Each shard starts its own production server on its own port (`E2E_PORT`,
 * which playwright.config.ts already honours) and writes a blob report; at the
 * end `playwright merge-reports` turns the blobs into the one summary line
 * everybody actually reads. A report split five ways that nobody adds up is
 * worse than a slow one.
 *
 * Usage: `npm run test:e2e` (this), or `node scripts/e2e-sharded.mjs`.
 * A single shard, for debugging: `npx playwright test --project=firefox`.
 */

import { spawn } from "node:child_process"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"

/** Shard name → the Playwright projects it runs. Order is by expected length. */
export const SHARDS = {
  auth: ["auth-free", "auth-pro", "auth-proPlus"],
  firefox: ["firefox"],
  webkit: ["webkit"],
  "mobile-safari": ["mobile-safari"],
  chromium: ["chromium"],
}

const BASE_PORT = 3010
const BLOB_DIR = join(process.cwd(), "blob-report")

function run(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } })
    child.on("close", (code) => resolve(code ?? 1))
  })
}

rmSync(BLOB_DIR, { recursive: true, force: true })
mkdirSync(BLOB_DIR, { recursive: true })

const started = Date.now()

const results = await Promise.all(
  Object.entries(SHARDS).map(([name, projects], index) =>
    run(
      "npx",
      [
        "playwright",
        "test",
        ...projects.flatMap((project) => ["--project", project]),
        "--reporter=blob",
      ],
      {
        E2E_PORT: String(BASE_PORT + index),
        PLAYWRIGHT_BLOB_OUTPUT_FILE: join(BLOB_DIR, `${name}.zip`),
      }
    ).then((code) => ({ name, code }))
  )
)

const elapsed = Math.round((Date.now() - started) / 1000)

console.log("\n=== shards ===")
for (const { name, code } of results) {
  console.log(`${code === 0 ? "ok " : "FAIL"} ${name}`)
}
console.log(`wall clock: ${elapsed} s\n`)

// One summary for the whole suite: passed / skipped / failed, added up.
const merged = await run("npx", ["playwright", "merge-reports", "--reporter=list", BLOB_DIR], {})

process.exit(results.some(({ code }) => code !== 0) || merged !== 0 ? 1 : 0)
