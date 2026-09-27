#!/usr/bin/env node
/**
 * Inbound-link census over a running production build, from server HTML only.
 *
 * A crawler reads what the server answers before it runs any JavaScript, so
 * this does the same: fetch the sitemap, fetch every page in it, drop the
 * <script> blocks, and count how many DISTINCT pages carry an <a href> to each
 * internal path. Pages, not anchors — a page that links to /pricing three times
 * counts once, which is the question "who links here" actually asks.
 *
 *   npx next start --port 3011
 *   node scripts/inbound-links.mjs http://127.0.0.1:3011 /tmp/links.json
 *
 * Written for docs/seo/indexacion-2026-09.md, where the numbers it produced are
 * quoted next to this command. Read-only: it never touches the repo or the
 * database, and it needs no credentials.
 */
import { writeFileSync } from "node:fs"

const BASE = process.argv[2] ?? "http://127.0.0.1:3011"
const out = process.argv[3]

if (!out) {
  console.error("usage: node scripts/inbound-links.mjs <base-url> <output.json>")
  process.exit(2)
}

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text()
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => new URL(match[1]).pathname
)

/** Our own paths, normalised; anything external is null. */
function normalise(href) {
  try {
    const url = new URL(href, BASE)
    if (url.origin !== BASE && url.hostname !== "energycurve.app") return null
    return url.pathname.replace(/\/$/, "") || "/"
  } catch {
    return null
  }
}

const inbound = {} // target path -> Set of source paths
const outbound = {} // source path -> distinct internal links on it

for (const page of pages) {
  const html = await (await fetch(BASE + page)).text()
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "")
  const hrefs = [...body.matchAll(/<a\b[^>]*href="([^"#?]+)[^"]*"/g)]
    .map((match) => normalise(match[1]))
    .filter(Boolean)

  outbound[page] = new Set(hrefs).size
  for (const target of new Set(hrefs)) {
    ;(inbound[target] ??= new Set()).add(page)
  }
}

const table = Object.fromEntries(
  Object.entries(inbound).map(([target, sources]) => [target, [...sources].sort()])
)

writeFileSync(out, JSON.stringify({ pages, inbound: table, outbound }, null, 1))
console.log(
  `pages crawled: ${pages.length} | targets with inbound links: ${Object.keys(table).length}`
)
