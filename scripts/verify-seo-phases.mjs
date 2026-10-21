#!/usr/bin/env node
/**
 * The code half of SEO plan phases 4 and 5, checked against a running site
 * (lote 21).
 *
 *   node scripts/verify-seo-phases.mjs https://energycurve.app
 *   node scripts/verify-seo-phases.mjs http://127.0.0.1:3011      # a local build
 *
 * Each line is one item: verde / rojo, what was asked, and what came back. The
 * same items as docs/seo/verificacion-produccion-2026-09.md, «Fases 4 y 5», so
 * the next run is one command instead of an afternoon of curl. Exit code 1 if
 * any item is red.
 *
 * It verifies the code half only and says so. Neither phase is "verified" by a
 * green run: both have external tasks open (profiles, mentions, PostHog key
 * events, the PSI secret), listed at the end of every run.
 *
 * Read-only, no credentials, plain ESM with no dependencies.
 */

const BASE = (process.argv[2] ?? "").replace(/\/$/, "")
if (!BASE) {
  console.error("usage: node scripts/verify-seo-phases.mjs <base-url>")
  process.exit(2)
}

const COMPARE = [
  ["/compare/mixed-in-key", "/es/comparar/mixed-in-key"],
  ["/compare/setflow", "/es/comparar/setflow"],
  ["/compare/dj-studio", "/es/comparar/dj-studio"],
  ["/compare/lexicon", "/es/comparar/lexicon"],
  ["/compare/rekordbox-vs-serato-vs-traktor", "/es/comparar/rekordbox-vs-serato-vs-traktor"],
  ["/compare/best-dj-software", "/es/comparar/mejor-software-para-dj"],
].flat()

const results = []
const record = (phase, item, ok, detail) => results.push({ phase, item, ok, detail })

async function get(path) {
  const response = await fetch(BASE + path, { redirect: "manual" })
  return { status: response.status, type: response.headers.get("content-type") ?? "", body: await response.text() }
}

/** Every JSON-LD block, parsed — a block that does not parse is reported, not skipped. */
function jsonLd(html) {
  const types = new Set()
  let broken = 0
  let organization = null
  let website = null
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk)
        if (!node || typeof node !== "object") return
        for (const type of [].concat(node["@type"] ?? [])) types.add(type)
        if (node["@type"] === "Organization" && node.name === "EnergyCurve" && !organization) organization = node
        if (node["@type"] === "WebSite") website = node
        Object.values(node).forEach(walk)
      }
      walk(JSON.parse(match[1]))
    } catch {
      broken++
    }
  }
  return { types, broken, organization, website }
}

// ---- Phase 4 -------------------------------------------------------------

// E23: the twelve comparison URLs.
const sitemap = (await get("/sitemap.xml")).body
for (const path of COMPARE) {
  const page = await get(path)
  const ld = jsonLd(page.body)
  const ok =
    page.status === 200 &&
    ld.broken === 0 &&
    ["WebPage", "BreadcrumbList", "FAQPage"].every((t) => ld.types.has(t)) &&
    sitemap.includes(`${path}</loc>`)
  record("4 · E23", `${path}: 200, JSON-LD que parsea, en el sitemap`, ok,
    `${page.status} · ${[...ld.types].filter((t) => ["WebPage", "BreadcrumbList", "FAQPage"].includes(t)).join(", ")} · ${ld.broken} sin parsear · sitemap ${sitemap.includes(`${path}</loc>`) ? "sí" : "no"}`)
}
for (const [home, prefix] of [["/", "/compare/"], ["/es", "/es/comparar/"]]) {
  const html = (await get(home)).body
  const links = new Set([...html.matchAll(new RegExp(`href="(${prefix.replace(/\//g, "\\/")}[^"]*)"`, "g"))].map((m) => m[1]))
  record("4 · E23", `el pie de ${home} enlaza las seis comparaciones`, links.size === 6, `${links.size} distintas`)
}

// E24: /llms.txt.
const llms = await get("/llms.txt")
const count = (needle) => llms.body.split(needle).length - 1
record("4 · E24", "/llms.txt: 200, texto plano", llms.status === 200 && llms.type.startsWith("text/plain"), `${llms.status} · ${llms.type} · ${llms.body.length} caracteres`)
record("4 · E24", "las seis comparaciones", count("/compare/") >= 6, `${count("/compare/")} enlaces a /compare/`)
record("4 · E24", "una sección de artículos en inglés", /^## Articles \(English\)/m.test(llms.body), /^## Articles \(English\)/m.test(llms.body) ? "presente" : "ausente")
record("4 · E24", "precios y la empresa", /US\$9\.99/.test(llms.body) && llms.body.includes("StageLink LLC"), `US$9.99 ${/US\$9\.99/.test(llms.body) ? "sí" : "no"} · StageLink LLC ${llms.body.includes("StageLink LLC") ? "sí" : "no"}`)

// E22: the entity, code half.
const home = jsonLd((await get("/")).body)
const sameAs = [].concat(home.organization?.sameAs ?? [])
record("4 · E22", "Organization con alternateName", home.organization?.alternateName === "EnergyCurve DJ", `alternateName = ${home.organization?.alternateName ?? "—"}`)
record("4 · E22", "WebSite en / (lote 19)", home.website?.name === "EnergyCurve", `WebSite.name = ${home.website?.name ?? "—"}`)
record("4 · E22", "sameAs (la tarea externa pide 6)", sameAs.length >= 1, `${sameAs.length} perfil(es): ${sameAs.join(", ") || "—"}`)

// ---- Phase 5 -------------------------------------------------------------

// E28: the content CTAs reach the free tool.
for (const [path, tool] of [
  ["/energy-tags", "/tools/energy-curve"],
  ["/import-formats", "/tools/energy-curve"],
  ["/es/energy-tags", "/es/herramientas/curva-de-energia"],
  ["/es/import-formats", "/es/herramientas/curva-de-energia"],
  ["/blog/how-to-structure-a-dj-set", "/tools/energy-curve"],
  ["/es/blog/esta-bien-el-orden-de-mi-set", "/es/herramientas/curva-de-energia"],
]) {
  const page = await get(path)
  const anchors = page.body.split(`href="${tool}"`).length - 1
  record("5 · E28", `${path}: CTA a la herramienta`, page.status === 200 && anchors >= 1, `${page.status} · ${anchors} ancla(s) a ${tool}`)
}

// ---- Report --------------------------------------------------------------

let red = 0
for (const r of results) {
  if (!r.ok) red++
  console.log(`${r.ok ? "verde" : "ROJO "}  ${r.phase}  ${r.item}  →  ${r.detail}`)
}
console.log(`\n${results.length} ítems contra ${BASE}: ${results.length - red} verdes, ${red} rojos.`)
console.log(`Ninguna fase queda verificada con esto. Fuera del código, siguen abiertas:
  4 · E22  cinco perfiles de entidad y sus URLs en ENTITY_PROFILES (Robertino)
  4 · E25  el programa de menciones (Robertino)
  4 · E26  el enlace y el post en stagelink.art (Robertino)
  4 · E27  la revisión mensual con el tracker de IA (Robertino)
  5 · E28  key events y embudo en PostHog (Robertino, con su cuenta)
  5 · E31  el secret PAGESPEED_API_KEY y la primera fila del log (Robertino)
  5 · E29/E30  se verifican en CI, no en el dominio`)
process.exitCode = red ? 1 : 0
