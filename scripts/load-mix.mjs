#!/usr/bin/env node
/**
 * Closed-loop load against a running server, as a signed-in user.
 *
 * Each virtual user requests the next page the moment the previous one has
 * been read to its last byte — no reading time, so it is harsher than the same
 * number of people. A redirect counts as an error (it is usually the login).
 * Reports p50 and p95 per page.
 *
 * How docs/qa/carga-2026-10.md measured the peak (lote 17, lote 18):
 *
 *   NEXT_PUBLIC_POSTHOG_KEY= npm run build && npx next start --port 3110
 *   node scripts/load-mix.mjs http://127.0.0.1:3110 e2e/.auth/pro.json 10 60 \
 *     /dashboard /dashboard/playlists /dashboard/playlists/<id> /dashboard/playlists/<id>/analysis
 *
 * Build WITHOUT the PostHog key: the analysis page sends server events, and
 * synthetic load must not reach the real project. The session file is the one
 * Playwright's setup project writes; it carries no secret of its own beyond the
 * test account's session, and is git-ignored.
 */
import { readFileSync } from "node:fs"
const [base, statePath, vusArg, secondsArg, ...paths] = process.argv.slice(2)
const state = JSON.parse(readFileSync(statePath, "utf8"))
const jar = new Map(state.cookies.filter((c) => ["127.0.0.1", "localhost"].includes(c.domain)).map((c) => [c.name, c.value]))
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ")
const vus = Number(vusArg), until = Date.now() + Number(secondsArg) * 1000
const samples = Object.fromEntries(paths.map((p) => [p, []])); const errors = Object.fromEntries(paths.map((p) => [p, 0]))
const statusSeen = {}
async function vu(index) {
  let i = index % paths.length
  while (Date.now() < until) {
    const path = paths[i]; i = (i + 1) % paths.length
    const t = performance.now()
    try {
      const res = await fetch(base + path, { headers: { cookie: cookie() }, redirect: "manual" })
      await res.text()
      for (const sc of res.headers.getSetCookie?.() ?? []) { const [kv] = sc.split(";"); const eq = kv.indexOf("="); if (eq > 0 && kv.slice(eq + 1)) jar.set(kv.slice(0, eq), kv.slice(eq + 1)) }
      statusSeen[res.status] = (statusSeen[res.status] ?? 0) + 1
      if (res.status !== 200) { errors[path]++; continue }
      samples[path].push(performance.now() - t)
    } catch { errors[path]++ }
  }
}
const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]) }
const started = Date.now()
await Promise.all(Array.from({ length: vus }, (_, k) => vu(k)))
const out = { vus, seconds: Number(secondsArg), wallMs: Date.now() - started, status: statusSeen, pages: {} }
for (const p of paths) out.pages[p] = { n: samples[p].length, p50: pct(samples[p], 0.5), p95: pct(samples[p], 0.95), errors: errors[p] }
console.log(JSON.stringify(out))
